package service

import (
	"context"
	"fmt"
	"sync"
	"time"

	"milktea-server/internal/domain"
	"milktea-server/internal/repository"
	"milktea-server/internal/websocket"
	"github.com/google/uuid"
)

type orderItemService struct {
	repo         repository.OrderItemRepository
	sessionRepo  repository.SessionRepository
	partRepo     repository.ParticipantRepository
	hub          *websocket.Hub
	idempotencyMu sync.Mutex
	idempotency   map[string]time.Time
}

func NewOrderItemService(repo repository.OrderItemRepository, sessionRepo repository.SessionRepository, partRepo repository.ParticipantRepository, hub *websocket.Hub) OrderItemService {
	return &orderItemService{
		repo:        repo,
		sessionRepo: sessionRepo,
		partRepo:    partRepo,
		hub:         hub,
		idempotency: make(map[string]time.Time),
	}
}

func (s *orderItemService) checkIdempotency(key string) error {
	if key == "" {
		return nil
	}
	s.idempotencyMu.Lock()
	defer s.idempotencyMu.Unlock()

	if t, exists := s.idempotency[key]; exists {
		if time.Since(t) < 24*time.Hour {
			return fmt.Errorf("duplicate request with idempotency key")
		}
	}
	s.idempotency[key] = time.Now()
	return nil
}

func (s *orderItemService) Create(ctx context.Context, item *domain.OrderItem, idempotencyKey string) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if item.Quantity <= 0 {
		return fmt.Errorf("quantity must be greater than 0")
	}
	if item.Price < 0 {
		return fmt.Errorf("price cannot be negative")
	}

	if err := s.checkIdempotency(idempotencyKey); err != nil {
		return err
	}

	// Logic from milktea-logic.md: Lock session check
	session, err := s.sessionRepo.GetByID(ctx, item.SessionID)
	if err != nil {
		return err
	}
	if session != nil && session.Status == "locked" {
		return fmt.Errorf("session is locked")
	}

	err = s.repo.Create(ctx, item)
	if err == nil {
		s.hub.Broadcast(item.SessionID.String(), "order_item_created", item)
	}
	return err
}

func (s *orderItemService) GetBySessionID(ctx context.Context, sessionID uuid.UUID) ([]domain.OrderItem, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	return s.repo.GetBySessionID(ctx, sessionID)
}

func (s *orderItemService) Update(ctx context.Context, item *domain.OrderItem, deviceID uuid.UUID, idempotencyKey string) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if item.Quantity <= 0 {
		return fmt.Errorf("quantity must be greater than 0")
	}
	if item.Price < 0 {
		return fmt.Errorf("price cannot be negative")
	}

	if err := s.checkIdempotency(idempotencyKey); err != nil {
		return err
	}

	// 1. Fetch existing item to check ownership
	existing, err := s.repo.GetByID(ctx, item.ID)
	if err != nil {
		return err
	}
	if existing == nil {
		return fmt.Errorf("order item not found")
	}

	// 2. Fetch participant to get their deviceID
	participant, err := s.partRepo.GetByID(ctx, existing.ParticipantID)
	if err != nil {
		return err
	}
	if participant == nil || participant.DeviceID != deviceID {
		return fmt.Errorf("unauthorized: you do not own this order item")
	}

	session, err := s.sessionRepo.GetByID(ctx, item.SessionID)
	if err != nil {
		return err
	}
	if session != nil && session.Status == "locked" {
		return fmt.Errorf("session is locked")
	}

	err = s.repo.Update(ctx, item)
	if err == nil {
		s.hub.Broadcast(item.SessionID.String(), "order_item_updated", item)
	}
	return err
}

func (s *orderItemService) Delete(ctx context.Context, id uuid.UUID, deviceID uuid.UUID, idempotencyKey string) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := s.checkIdempotency(idempotencyKey); err != nil {
		return err
	}

	// 1. Fetch existing item to check ownership
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if existing == nil {
		return nil // Idempotent delete
	}

	// 2. Fetch participant to get their deviceID
	participant, err := s.partRepo.GetByID(ctx, existing.ParticipantID)
	if err != nil {
		return err
	}
	
	// Host can also delete any item? (REQ-00003 says "Host permissions")
	// For now, let's strictly check participant ownership as per QC "ownership verified"
	if participant == nil || participant.DeviceID != deviceID {
		return fmt.Errorf("unauthorized: you do not own this order item")
	}

	return s.repo.Delete(ctx, id)
}
