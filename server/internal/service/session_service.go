package service

import (
	"context"
	"crypto/rand"
	"fmt"
	"log/slog"
	"math/big"
	"strings"
	"sync"
	"time"

	"milktea-server/internal/domain"
	"milktea-server/internal/repository"
	"milktea-server/internal/websocket"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type attemptRecord struct {
	count       int
	lastAttempt time.Time
}

type sessionService struct {
	repo            repository.SessionRepository
	participantRepo repository.ParticipantRepository
	hub             *websocket.Hub

	// Rate limiting for ClaimHost
	claimAttempts   map[string]*attemptRecord
	claimMu         sync.RWMutex
}

func NewSessionService(repo repository.SessionRepository, participantRepo repository.ParticipantRepository, hub *websocket.Hub) SessionService {
	return &sessionService{
		repo:            repo,
		participantRepo: participantRepo,
		hub:             hub,
		claimAttempts:   make(map[string]*attemptRecord),
	}
}

var validTransitions = map[string][]string{
	domain.SessionStatusOpen:      {domain.SessionStatusLocked, domain.SessionStatusCancelled},
	domain.SessionStatusLocked:    {domain.SessionStatusOpen, domain.SessionStatusOrdered, domain.SessionStatusCancelled},
	domain.SessionStatusOrdered:   {domain.SessionStatusSettling},
	domain.SessionStatusSettling:  {domain.SessionStatusCompleted},
	domain.SessionStatusCompleted: {},
	domain.SessionStatusCancelled: {},
}

func validateTransition(from, to string) error {
	if from == to {
		return nil
	}
	allowed := validTransitions[from]
	for _, s := range allowed {
		if s == to {
			return nil
		}
	}
	return fmt.Errorf("invalid transition from %s to %s", from, to)
}

const roomIDCharset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
const adminSecretCharset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

func generateRoomID(length int) string {
	b := make([]byte, length)
	for i := range b {
		num, _ := rand.Int(rand.Reader, big.NewInt(int64(len(roomIDCharset))))
		b[i] = roomIDCharset[num.Int64()]
	}
	return string(b)
}

func generateAdminSecret(length int) string {
	b := make([]byte, length)
	for i := range b {
		num, _ := rand.Int(rand.Reader, big.NewInt(int64(len(adminSecretCharset))))
		b[i] = adminSecretCharset[num.Int64()]
	}
	return string(b)
}

func (s *sessionService) Create(ctx context.Context, session *domain.Session, hostName string) (*domain.Participant, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	if session.Slug == "" {
		session.Slug = fmt.Sprintf("party-%d", time.Now().UnixNano()%1000000)
	}

	if session.Status == "" {
		session.Status = "open"
	}
	if session.DiscountType == "" {
		session.DiscountType = "amount"
	}

	// Hash password if provided
	if session.Password != nil && *session.Password != "" {
		hashed, err := bcrypt.GenerateFromPassword([]byte(*session.Password), bcrypt.DefaultCost)
		if err != nil {
			return nil, fmt.Errorf("failed to hash password: %w", err)
		}
		strHashed := string(hashed)
		session.Password = &strHashed
	}

	// Generate Admin Secret
	adminSecret := generateAdminSecret(6)
	hashedSecret, err := bcrypt.GenerateFromPassword([]byte(adminSecret), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash admin secret: %w", err)
	}
	session.AdminSecretHash = string(hashedSecret)
	session.AdminSecret = adminSecret

	// Retry loop to handle RoomID collisions
	maxRetries := 5
	var createErr error

	for i := 0; i < maxRetries; i++ {
		if session.RoomID == "" || i > 0 {
			session.RoomID = generateRoomID(6)
		}

		createErr = s.repo.Create(ctx, session)
		if createErr == nil {
			// Success creating session, now create the host participant
			host := &domain.Participant{
				SessionID:  session.ID,
				DeviceID:   session.HostDeviceID,
				Name:       hostName,
				IsHost:     true,
				LastActive: time.Now(),
			}

			if err := s.participantRepo.Create(ctx, host); err != nil {
				return nil, fmt.Errorf("failed to create host participant: %w", err)
			}

			s.hub.Broadcast(session.ID.String(), "session_updated", session)
			return host, nil
		}

		if strings.Contains(createErr.Error(), "unique") || strings.Contains(createErr.Error(), "23505") {
			slog.Warn("RoomID collision detected, retrying...", "room_id", session.RoomID, "attempt", i+1)
			continue
		}

		return nil, createErr
	}

	return nil, fmt.Errorf("failed to generate a unique RoomID after %d attempts", maxRetries)
}

func (s *sessionService) GetByID(ctx context.Context, id uuid.UUID) (*domain.Session, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	return s.repo.GetByID(ctx, id)
}

func (s *sessionService) GetBySlug(ctx context.Context, slug string) (*domain.Session, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	return s.repo.GetBySlug(ctx, slug)
}

func (s *sessionService) Update(ctx context.Context, session *domain.Session, requesterDeviceID uuid.UUID) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	return s.repo.WithTx(ctx, func(txRepo repository.SessionRepository) error {
		// 1. Fetch existing session
		// If transitioning to Settling, use FOR UPDATE for pessimistic locking
		var existing *domain.Session
		var err error
		if session.Status == domain.SessionStatusSettling {
			existing, err = txRepo.GetByIDForUpdate(ctx, session.ID)
		} else {
			existing, err = txRepo.GetByID(ctx, session.ID)
		}

		if err != nil {
			return err
		}
		if existing == nil {
			return fmt.Errorf("session not found")
		}

		// 🛡️ Security Check: Only Host can update
		if existing.HostDeviceID != requesterDeviceID {
			return fmt.Errorf("unauthorized: only host can update session")
		}

		// 2. Validate Status Transition
		if session.Status != "" && session.Status != existing.Status {
			if err := validateTransition(existing.Status, session.Status); err != nil {
				return err
			}
		}

		// 3. Merge values: Only update if the new value is NOT empty/zero
		if session.Title == "" {
			session.Title = existing.Title
		}
		if session.Slug == "" {
			session.Slug = existing.Slug
		}
		if session.RoomID == "" {
			session.RoomID = existing.RoomID
		}
		if session.Status == "" {
			session.Status = existing.Status
		}
		if session.DiscountType == "" {
			session.DiscountType = existing.DiscountType
		}
		if session.ShopLink == nil {
			session.ShopLink = existing.ShopLink
		}
		if session.HostDefaultBankName == nil {
			session.HostDefaultBankName = existing.HostDefaultBankName
		}
		if session.HostDefaultBankAccount == nil {
			session.HostDefaultBankAccount = existing.HostDefaultBankAccount
		}
		if session.HostDefaultQrPayload == nil {
			session.HostDefaultQrPayload = existing.HostDefaultQrPayload
		}
		if session.BatchConfigs == nil {
			session.BatchConfigs = existing.BatchConfigs
		}
		
		// Handle Password Hashing on Update
		if session.Password != nil && *session.Password != "" && (existing.Password == nil || *session.Password != *existing.Password) {
			hashed, err := bcrypt.GenerateFromPassword([]byte(*session.Password), bcrypt.DefaultCost)
			if err != nil {
				return fmt.Errorf("failed to hash password: %w", err)
			}
			strHashed := string(hashed)
			session.Password = &strHashed
		} else if session.Password == nil {
			session.Password = existing.Password
		}

		// Preserve critical fields
		session.HostDeviceID = existing.HostDeviceID
		session.AdminSecretHash = existing.AdminSecretHash
		session.CreatedAt = existing.CreatedAt

		if session.DiscountValue == 0 {
			session.DiscountValue = existing.DiscountValue
		}
		if session.ShippingFee == 0 {
			session.ShippingFee = existing.ShippingFee
		}

		err = txRepo.Update(ctx, session)
		if err == nil {
			s.hub.Broadcast(session.ID.String(), "session_updated", session)
		}
		return err
	})
}

func (s *sessionService) ClaimHost(ctx context.Context, slug string, adminSecret string, newHostDeviceID uuid.UUID) error {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	// 0. Rate Limiting Check
	key := newHostDeviceID.String()
	s.claimMu.Lock()
	record, exists := s.claimAttempts[key]
	if exists {
		// Reset count if last attempt was more than 1 hour ago
		if time.Since(record.lastAttempt) > time.Hour {
			record.count = 0
		}
		if record.count >= 3 {
			s.claimMu.Unlock()
			return fmt.Errorf("too many failed attempts, please try again in an hour")
		}
	} else {
		record = &attemptRecord{}
		s.claimAttempts[key] = record
	}
	s.claimMu.Unlock()

	return s.repo.WithTx(ctx, func(txRepo repository.SessionRepository) error {
		// 1. Get Session
		session, err := txRepo.GetBySlug(ctx, slug)
		if err != nil {
			return err
		}
		if session == nil {
			return fmt.Errorf("session not found")
		}

		// 2. Verify Admin Secret
		if err := bcrypt.CompareHashAndPassword([]byte(session.AdminSecretHash), []byte(adminSecret)); err != nil {
			// Increment failure count
			s.claimMu.Lock()
			record.count++
			record.lastAttempt = time.Now()
			s.claimMu.Unlock()
			return fmt.Errorf("invalid admin secret")
		}

		// Reset count on success
		s.claimMu.Lock()
		delete(s.claimAttempts, key)
		s.claimMu.Unlock()

		// 3. Check Heartbeat of current host
		participants, err := txRepo.ParticipantRepo().GetBySessionID(ctx, session.ID)
		if err != nil {
			return err
		}

		var currentHost *domain.Participant
		var newHost *domain.Participant

		for i := range participants {
			if participants[i].DeviceID == session.HostDeviceID {
				currentHost = &participants[i]
			}
			if participants[i].DeviceID == newHostDeviceID {
				newHost = &participants[i]
			}
		}

		if currentHost != nil {
			// If host has been active in the last 2 minutes, don't allow claim
			if time.Since(currentHost.LastActive) < 2*time.Minute {
				return fmt.Errorf("current host is still active (active %v ago)", time.Since(currentHost.LastActive).Round(time.Second))
			}
		}

		if newHost == nil {
			return fmt.Errorf("you must join the session before claiming host")
		}

		// 4. Atomic Update
		// a. Update Session host_device_id
		session.HostDeviceID = newHostDeviceID
		if err := txRepo.Update(ctx, session); err != nil {
			return err
		}

		// b. Update old host participant status
		if currentHost != nil {
			currentHost.IsHost = false
			if err := txRepo.ParticipantRepo().Update(ctx, currentHost); err != nil {
				return err
			}
		}

		// c. Update new host participant status
		newHost.IsHost = true
		if err := txRepo.ParticipantRepo().Update(ctx, newHost); err != nil {
			return err
		}

		// 5. Broadcast change
		s.hub.Broadcast(session.ID.String(), "host_changed", map[string]any{
			"new_host_name":      newHost.Name,
			"new_host_device_id": newHost.DeviceID,
			"timestamp":          time.Now(),
		})

		return nil
	})
}

func (s *sessionService) Delete(ctx context.Context, id uuid.UUID, requesterDeviceID uuid.UUID) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if existing == nil {
		return fmt.Errorf("session not found")
	}

	// 🛡️ Security Check: Only Host can delete
	if existing.HostDeviceID != requesterDeviceID {
		return fmt.Errorf("unauthorized: only host can delete session")
	}

	err = s.repo.Delete(ctx, id)
	if err == nil {
		s.hub.Broadcast(id.String(), "session_deleted", nil)
	}
	return err
}

func (s *sessionService) ListByHost(ctx context.Context, hostDeviceID uuid.UUID) ([]domain.Session, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	return s.repo.ListByHost(ctx, hostDeviceID)
}

func (s *sessionService) ListByIDs(ctx context.Context, ids []uuid.UUID) ([]domain.Session, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	return s.repo.ListByIDs(ctx, ids)
}

func (s *sessionService) VerifyPassword(ctx context.Context, slug string, password string) (bool, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	session, err := s.repo.GetBySlug(ctx, slug)
	if err != nil {
		return false, err
	}
	if session == nil {
		return false, fmt.Errorf("session not found")
	}

	if session.Password == nil || *session.Password == "" {
		return true, nil // No password set
	}

	// Compare Bcrypt Hash
	err = bcrypt.CompareHashAndPassword([]byte(*session.Password), []byte(password))
	return err == nil, nil
}

func (s *sessionService) CleanupOldSessions(ctx context.Context, days int) (int64, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	return s.repo.CleanupOldSessions(ctx, days)
}
