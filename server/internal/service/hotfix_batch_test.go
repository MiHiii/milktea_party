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
	mockOrderBatchRepo := new(MockOrderBatchRepo)
	mockSessionRepo.On("OrderBatchRepo").Return(mockOrderBatchRepo)

	wsHub := websocket.NewHub()
	svc := NewOrderBatchService(mockSessionRepo, wsHub)

	t.Run("Verify new batch gets 'open' status by default", func(t *testing.T) {
		batch := &domain.OrderBatch{
			SessionID: uuid.New(),
			Name:      "Đơn ShopeeFood",
			// Status is empty
		}

		// Expectation: Service should set status to "open" before calling repo
		mockOrderBatchRepo.On("Create", mock.Anything, mock.MatchedBy(func(b *domain.OrderBatch) bool {
			return b.Status == "open"
		})).Return(nil).Once()

		err := svc.Create(context.Background(), batch)
		assert.NoError(t, err)
		assert.Equal(t, "open", batch.Status, "Status should be 'open' to satisfy DB constraint")
	})
}
