package service

import (
	"context"
	"fmt"
	"time"

	"milktea-server/internal/domain"
	"milktea-server/internal/repository"
	"milktea-server/internal/websocket"
	"github.com/google/uuid"
)

type orderBatchService struct {
	repo repository.SessionRepository // Use SessionRepo for transactions
	hub  *websocket.Hub
}

func NewOrderBatchService(repo repository.SessionRepository, hub *websocket.Hub) OrderBatchService {
	return &orderBatchService{repo: repo, hub: hub}
}

func (s *orderBatchService) Create(ctx context.Context, batch *domain.OrderBatch) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if batch.Status == "" {
		batch.Status = "open"
	}

	err := s.repo.OrderBatchRepo().Create(ctx, batch)
	if err == nil {
		s.hub.Broadcast(batch.SessionID.String(), "order_batch_created", batch)
	}
	return err
}

func (s *orderBatchService) GetBySessionID(ctx context.Context, sessionID uuid.UUID) ([]domain.OrderBatch, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	return s.repo.OrderBatchRepo().GetBySessionID(ctx, sessionID)
}

func (s *orderBatchService) Update(ctx context.Context, batch *domain.OrderBatch) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	return s.repo.WithTx(ctx, func(txRepo repository.SessionRepository) error {
		existing, err := txRepo.OrderBatchRepo().GetByID(ctx, batch.ID)
		if err != nil {
			return err
		}
		if existing == nil {
			return fmt.Errorf("batch not found")
		}

		// Merge fields
		if batch.Name == "" {
			batch.Name = existing.Name
		}
		if batch.BankName == nil {
			batch.BankName = existing.BankName
		}
		if batch.BankAccount == nil {
			batch.BankAccount = existing.BankAccount
		}
		if batch.QrPayload == nil {
			batch.QrPayload = existing.QrPayload
		}
		if batch.Status == "" {
			batch.Status = existing.Status
		}
		// Note: isDefault, sortOrder, discountAmount, shippingFee are updated if provided (non-zero or explicit)
		// For simplicity in this stage, we assume if they are zero and existing is non-zero, we might need a better merge logic.
		// But for now, let's keep it simple.

		batch.SessionID = existing.SessionID
		batch.CreatedAt = existing.CreatedAt

		err = txRepo.OrderBatchRepo().Update(ctx, batch)
		if err == nil {
			s.hub.Broadcast(batch.SessionID.String(), "order_batch_updated", batch)
		}
		return err
	})
}

func (s *orderBatchService) Delete(ctx context.Context, id uuid.UUID) error {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	return s.repo.WithTx(ctx, func(txRepo repository.SessionRepository) error {
		// 1. Get batch to delete
		batch, err := txRepo.OrderBatchRepo().GetByID(ctx, id)
		if err != nil {
			return err
		}
		if batch == nil {
			return fmt.Errorf("batch not found")
		}

		// 2. Safety Check: Cannot delete default batch
		if batch.IsDefault {
			return fmt.Errorf("cannot delete the default batch")
		}

		// 3. Find default batch to move items to
		defaultBatch, err := txRepo.OrderBatchRepo().GetDefaultBatch(ctx, batch.SessionID)
		if err != nil {
			return err
		}
		if defaultBatch == nil {
			// Fallback: Just clear batch IDs if no default found (should not happen if logic is correct)
			if err := txRepo.OrderItemRepo().BulkUpdateBatch(ctx, batch.SessionID, &batch.ID, nil); err != nil {
				return err
			}
		} else {
			// Move items to default batch
			if err := txRepo.OrderItemRepo().BulkUpdateBatch(ctx, batch.SessionID, &batch.ID, &defaultBatch.ID); err != nil {
				return err
			}
		}

		// 4. Delete the batch
		if err := txRepo.OrderBatchRepo().Delete(ctx, id); err != nil {
			return err
		}

		s.hub.Broadcast(batch.SessionID.String(), "order_batch_deleted", map[string]any{"id": id})
		return nil
	})
}
