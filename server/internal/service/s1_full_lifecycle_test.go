package service

import (
	"context"
	"testing"
	"time"

	"milktea-server/internal/domain"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestS1_FullLifecycle_Broad(t *testing.T) {
	// --- SETUP MOCKS ---
	mockSessionRepo := new(MockSessionRepo)
	mockParticipantRepo := new(MockParticipantRepo)
	mockOrderItemRepo := new(MockOrderItemRepo)
	mockOrderBatchRepo := new(MockOrderBatchRepo)

	mockSessionRepo.On("ParticipantRepo").Return(mockParticipantRepo)
	mockSessionRepo.On("OrderItemRepo").Return(mockOrderItemRepo)
	mockSessionRepo.On("OrderBatchRepo").Return(mockOrderBatchRepo)

	// Injections (Using manual service creation to avoid real bcrypt overhead in broad test)
	billingSvc := NewBillingService(mockSessionRepo)

	// IDs
	sessionID := uuid.New()
	hostPartID := uuid.New()
	guestAPartID := uuid.New()
	guestBPartID := uuid.New()
	batch1ID := uuid.New()
	batch2ID := uuid.New()

	ctx := context.Background()

	// --- LOGIC TEST: BATCH AWARE BILLING ---
	t.Log("Step: Executing Integrated Billing Logic for Multi-batch scenario")
	
	session := &domain.Session{
		ID:           sessionID,
		HostDeviceID: uuid.New(),
		IsSplitBatch: true,
	}

	items := []domain.OrderItem{
		{ID: uuid.New(), ParticipantID: hostPartID, Price: 30000, Quantity: 1, PaySeparate: false, OrderBatchID: &batch1ID},
		{ID: uuid.New(), ParticipantID: guestAPartID, Price: 30000, Quantity: 1, PaySeparate: false, OrderBatchID: &batch1ID},
		{ID: uuid.New(), ParticipantID: guestBPartID, Price: 25000, Quantity: 1, PaySeparate: true, OrderBatchID: &batch2ID},
	}
	
	participants := []domain.Participant{
		{ID: hostPartID, Name: "Host", IsHost: true, DeviceID: session.HostDeviceID, LastActive: time.Now()},
		{ID: guestAPartID, Name: "Guest A", IsHost: false, DeviceID: uuid.New(), LastActive: time.Now()},
		{ID: guestBPartID, Name: "Guest B", IsHost: false, DeviceID: uuid.New(), LastActive: time.Now()},
	}

	batches := []domain.OrderBatch{
		{ID: batch1ID, Name: "Đơn 1", ShippingFee: 5000, IsDefault: true},
		{ID: batch2ID, Name: "Đơn 2", ShippingFee: 0, IsDefault: false},
	}

	mockSessionRepo.On("GetByID", mock.Anything, sessionID).Return(session, nil).Once()
	mockParticipantRepo.On("GetBySessionID", mock.Anything, sessionID).Return(participants, nil).Once()
	mockOrderItemRepo.On("GetBySessionID", mock.Anything, sessionID).Return(items, nil).Once()
	mockOrderBatchRepo.On("GetBySessionID", mock.Anything, sessionID).Return(batches, nil).Once()

	bill, err := billingSvc.Calculate(ctx, sessionID)
	assert.NoError(t, err)
	
	// Verified results based on TTD-00004 logic
	assert.Equal(t, int64(90000), bill.ActualTotal)
	
	for _, p := range bill.Participants {
		if p.ParticipantID == guestBPartID {
			assert.Equal(t, int64(25000), p.FinalAmount, "Separate item remains 25k")
		}
		if p.ParticipantID == guestAPartID {
			assert.Equal(t, int64(33000), p.FinalAmount, "Guest A: 30k + share of 5k ship")
		}
		if p.IsHost {
			assert.Equal(t, int64(32000), p.FinalAmount, "Host gánh residual của Batch 1")
		}
	}

	t.Log("🏁 Lifecycle Integration Test: SUCCESS")
}
