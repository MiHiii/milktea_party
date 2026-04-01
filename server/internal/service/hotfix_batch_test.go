package service

import (
	"context"
	"testing"

	"milktea-server/internal/domain"
	"milktea-server/internal/websocket"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestHotfix_BatchStatus_Constraint(t *testing.T) {
	mockSessionRepo := new(MockSessionRepo)
	wsHub := websocket.NewHub()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go wsHub.Run(ctx)

	svc := NewOrderBatchService(mockSessionRepo, wsHub)

	t.Run("Verify new batch gets 'open' status by default", func(t *testing.T) {
		sessionID := uuid.New()
		batch := &domain.OrderBatch{
			SessionID: sessionID,
			Name:      "New Batch",
		}

		mockSessionRepo.On("OrderBatchRepo").Return(new(MockOrderBatchRepo))
		
		batchRepo := mockSessionRepo.OrderBatchRepo().(*MockOrderBatchRepo)
		batchRepo.On("Create", mock.Anything, mock.MatchedBy(func(b *domain.OrderBatch) bool {
			return b.Status == "open"
		})).Return(nil).Once()

		err := svc.Create(context.Background(), batch)
		assert.NoError(t, err)
		assert.Equal(t, "open", batch.Status, "Status should be 'open' to satisfy DB constraint")
	})
}
