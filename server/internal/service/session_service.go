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
)

type sessionService struct {
	repo            repository.SessionRepository
	participantRepo repository.ParticipantRepository
	hub             *websocket.Hub
}

func NewSessionService(repo repository.SessionRepository, participantRepo repository.ParticipantRepository, hub *websocket.Hub) SessionService {
	return &sessionService{repo: repo, participantRepo: participantRepo, hub: hub}
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

func (s *sessionService) Update(ctx context.Context, session *domain.Session) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	// 1. Fetch existing session
	existing, err := s.repo.GetByID(ctx, session.ID)
	if err != nil {
		return err
	}
	if existing == nil {
		return fmt.Errorf("session not found")
	}

	// 2. Merge values: Only update if the new value is NOT empty/zero
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
	if session.Password == nil {
		session.Password = existing.Password
	}

	// For numeric fields, we might need a more complex check if 0 is a valid update, 
	// but for now, this covers the critical string constraints.

	err = s.repo.Update(ctx, session)
	if err == nil {
		s.hub.Broadcast(session.ID.String(), "session_updated", session)
	}
	return err
}

func (s *sessionService) Delete(ctx context.Context, id uuid.UUID) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	err := s.repo.Delete(ctx, id)
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

func (s *sessionService) CleanupOldSessions(ctx context.Context, days int) (int64, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	return s.repo.CleanupOldSessions(ctx, days)
}
