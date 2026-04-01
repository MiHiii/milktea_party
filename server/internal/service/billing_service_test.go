package service

import (
	"context"
	"testing"

	"milktea-server/internal/domain"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestBillingService_Calculate(t *testing.T) {
	// Mock Repositories
	mockSessionRepo := new(MockSessionRepo)
	mockParticipantRepo := new(MockParticipantRepo)
	mockOrderItemRepo := new(MockOrderItemRepo)
	mockOrderBatchRepo := new(MockOrderBatchRepo)

	svc := NewBillingService(mockSessionRepo, mockParticipantRepo, mockOrderItemRepo, mockOrderBatchRepo)

	sessionID := uuid.New()
	hostID := uuid.New()
	guestID := uuid.New()

	t.Run("TC-03: Odd Shipping Fee & Residual Check", func(t *testing.T) {
		session := &domain.Session{
			ID:           sessionID,
			HostDeviceID: uuid.New(),
			IsSplitBatch: false,
			ShippingFee:  5000,
			DiscountValue: 0,
		}
		
		participants := []domain.Participant{
			{ID: hostID, Name: "Host", IsHost: true, DeviceID: session.HostDeviceID},
			{ID: guestID, Name: "Guest", IsHost: false, DeviceID: uuid.New()},
		}

		items := []domain.OrderItem{
			{ID: uuid.New(), ParticipantID: hostID, Price: 30000, Quantity: 1, PaySeparate: false},
			{ID: uuid.New(), ParticipantID: guestID, Price: 30000, Quantity: 1, PaySeparate: false},
		}

		mockSessionRepo.On("GetByID", mock.Anything, sessionID).Return(session, nil).Once()
		mockParticipantRepo.On("GetBySessionID", mock.Anything, sessionID).Return(participants, nil).Once()
		mockOrderItemRepo.On("GetBySessionID", mock.Anything, sessionID).Return(items, nil).Once()
		mockOrderBatchRepo.On("GetBySessionID", mock.Anything, sessionID).Return([]domain.OrderBatch{}, nil).Once()

		result, err := svc.Calculate(context.Background(), sessionID)

		assert.NoError(t, err)
		assert.Equal(t, int64(65000), result.ActualTotal)
		assert.Equal(t, int64(-1000), result.GlobalResidual)

		for _, p := range result.Participants {
			if p.IsHost {
				assert.Equal(t, int64(32000), p.FinalAmount, "Host should absorb residual")
			} else {
				assert.Equal(t, int64(33000), p.FinalAmount, "Guest should pay rounded up amount")
			}
		}
	})

	t.Run("TC-04: Pay Separate Exclusion", func(t *testing.T) {
		session := &domain.Session{
			ID:           sessionID,
			HostDeviceID: hostID,
			IsSplitBatch: false,
			ShippingFee:  10000,
		}

		participants := []domain.Participant{
			{ID: hostID, Name: "Host", IsHost: true, DeviceID: hostID},
			{ID: guestID, Name: "Guest Separate", IsHost: false, DeviceID: uuid.New()},
		}

		items := []domain.OrderItem{
			{ID: uuid.New(), ParticipantID: hostID, Price: 30000, Quantity: 1, PaySeparate: false},
			{ID: uuid.New(), ParticipantID: guestID, Price: 30000, Quantity: 1, PaySeparate: true},
		}

		mockSessionRepo.On("GetByID", mock.Anything, sessionID).Return(session, nil).Once()
		mockParticipantRepo.On("GetBySessionID", mock.Anything, sessionID).Return(participants, nil).Once()
		mockOrderItemRepo.On("GetBySessionID", mock.Anything, sessionID).Return(items, nil).Once()
		mockOrderBatchRepo.On("GetBySessionID", mock.Anything, sessionID).Return([]domain.OrderBatch{}, nil).Once()

		result, err := svc.Calculate(context.Background(), sessionID)

		assert.NoError(t, err)
		
		var separateTotal, sharedTotal int64
		for _, p := range result.Participants {
			if p.ParticipantID == guestID { separateTotal = p.FinalAmount }
			if p.ParticipantID == hostID { sharedTotal = p.FinalAmount }
		}

		assert.Equal(t, int64(30000), separateTotal, "Separate item should not have ship fee")
		assert.Equal(t, int64(40000), sharedTotal, "Shared item should take all ship fee")
	})
}
