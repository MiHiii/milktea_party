package service

import (
	"context"
	"time"

	"milktea-server/internal/domain"
	"milktea-server/internal/repository"
	"milktea-server/internal/websocket"
	"github.com/google/uuid"
)

type orderBatchService struct {
	repo repository.OrderBatchRepository
	hub  *websocket.Hub
}

func NewOrderBatchService(repo repository.OrderBatchRepository, hub *websocket.Hub) OrderBatchService {
	return &orderBatchService{repo: repo, hub: hub}
}

func (s *orderBatchService) Create(ctx context.Context, batch *domain.OrderBatch) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	err := s.repo.Create(ctx, batch)
	if err == nil {
		s.hub.Broadcast(batch.SessionID.String(), "order_batch_created", batch)
	}
	return err
}

func (s *orderBatchService) GetBySessionID(ctx context.Context, sessionID uuid.UUID) ([]domain.OrderBatch, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	return s.repo.GetBySessionID(ctx, sessionID)
}

func (s *orderBatchService) Update(ctx context.Context, batch *domain.OrderBatch) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	err := s.repo.Update(ctx, batch)
	if err == nil {
		s.hub.Broadcast(batch.SessionID.String(), "order_batch_updated", batch)
	}
	return err
}

func (s *orderBatchService) Delete(ctx context.Context, id uuid.UUID) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	// Need sessionID to broadcast. We could fetch first.
	return s.repo.Delete(ctx, id)
}
