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
	hub          *websocket.Hub
	idempotencyMu sync.Mutex
	idempotency   map[string]time.Time
}

func NewOrderItemService(repo repository.OrderItemRepository, sessionRepo repository.SessionRepository, hub *websocket.Hub) OrderItemService {
	return &orderItemService{
		repo:        repo,
		sessionRepo: sessionRepo,
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

func (s *orderItemService) Update(ctx context.Context, item *domain.OrderItem, idempotencyKey string) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := s.checkIdempotency(idempotencyKey); err != nil {
		return err
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

func (s *orderItemService) Delete(ctx context.Context, id uuid.UUID, idempotencyKey string) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := s.checkIdempotency(idempotencyKey); err != nil {
		return err
	}

	// In a real app we might want to broadcast with sessionID, 
	// but here we might need to fetch the item first if we don't have sessionID.
	return s.repo.Delete(ctx, id)
}
