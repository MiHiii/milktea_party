package service

import (
	"context"
	"crypto/rand"
	"fmt"
	"log/slog"
	"math/big"
	"strings"
	"time"

	"milktea-server/internal/domain"
	"milktea-server/internal/repository"
	"milktea-server/internal/websocket"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type sessionService struct {
	repo            repository.SessionRepository
	participantRepo repository.ParticipantRepository
	hub             *websocket.Hub
}

func NewSessionService(repo repository.SessionRepository, participantRepo repository.ParticipantRepository, hub *websocket.Hub) SessionService {
	return &sessionService{repo: repo, participantRepo: participantRepo, hub: hub}
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

func generateRoomID(length int) string {
	b := make([]byte, length)
	for i := range b {
		num, _ := rand.Int(rand.Reader, big.NewInt(int64(len(roomIDCharset))))
		b[i] = roomIDCharset[num.Int64()]
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

	// Retry loop to handle RoomID collisions
	maxRetries := 5
	var err error

	for i := 0; i < maxRetries; i++ {
		if session.RoomID == "" || i > 0 {
			session.RoomID = generateRoomID(6)
		}

		err = s.repo.Create(ctx, session)
		if err == nil {
			// Success creating session, now create the host participant
			host := &domain.Participant{
				SessionID: session.ID,
				DeviceID:  session.HostDeviceID,
				Name:      hostName,
				IsHost:    true,
			}

			if err := s.participantRepo.Create(ctx, host); err != nil {
				return nil, fmt.Errorf("failed to create host participant: %w", err)
			}

			s.hub.Broadcast(session.ID.String(), "session_updated", session)
			return host, nil
		}

		if strings.Contains(err.Error(), "unique") || strings.Contains(err.Error(), "23505") {
			slog.Warn("RoomID collision detected, retrying...", "room_id", session.RoomID, "attempt", i+1)
			continue
		}

		return nil, err
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
