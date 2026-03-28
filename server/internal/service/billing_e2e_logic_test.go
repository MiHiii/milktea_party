package service

import (
	"context"
	"testing"

	"milktea-server/internal/domain"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestBilling_E2E_Scenario(t *testing.T) {
	// Setup Mocks
	mockSessionRepo := new(MockSessionRepo)
	mockParticipantRepo := new(MockParticipantRepo)
	mockOrderItemRepo := new(MockOrderItemRepo)
	mockOrderBatchRepo := new(MockOrderBatchRepo)

	mockSessionRepo.On("ParticipantRepo").Return(mockParticipantRepo)
	mockSessionRepo.On("OrderItemRepo").Return(mockOrderItemRepo)
	mockSessionRepo.On("OrderBatchRepo").Return(mockOrderBatchRepo)

	svc := NewBillingService(mockSessionRepo)

	// IDs
	sessionID := uuid.New()
	hostID := uuid.New()
	guestAID := uuid.New()
	guestBID := uuid.New()
	batchID := uuid.New()

	// 1. Session state
	session := &domain.Session{
		ID:           sessionID,
		HostDeviceID: uuid.New(), // Host Device
		IsSplitBatch: true,
	}

	// 2. Participants
	participants := []domain.Participant{
		{ID: hostID, Name: "Host", IsHost: true, DeviceID: session.HostDeviceID},
		{ID: guestAID, Name: "Guest A", IsHost: false, DeviceID: uuid.New()},
		{ID: guestBID, Name: "Guest B (Separate)", IsHost: false, DeviceID: uuid.New()},
	}

	// 3. Batches
	batches := []domain.OrderBatch{
		{ID: batchID, SessionID: sessionID, Name: "Đơn 1", ShippingFee: 10000, DiscountAmount: 0, IsDefault: true},
	}

	// 4. Items
	items := []domain.OrderItem{
		{ID: uuid.New(), ParticipantID: guestAID, Price: 30000, Quantity: 1, PaySeparate: false, OrderBatchID: &batchID},
		{ID: uuid.New(), ParticipantID: guestBID, Price: 25000, Quantity: 1, PaySeparate: true}, // Separate
		{ID: uuid.New(), ParticipantID: hostID, Price: 35000, Quantity: 1, PaySeparate: false, OrderBatchID: &batchID},
	}

	// Mock Expectations
	mockSessionRepo.On("GetByID", mock.Anything, sessionID).Return(session, nil)
	mockParticipantRepo.On("GetBySessionID", mock.Anything, sessionID).Return(participants, nil)
	mockOrderItemRepo.On("GetBySessionID", mock.Anything, sessionID).Return(items, nil)
	mockOrderBatchRepo.On("GetBySessionID", mock.Anything, sessionID).Return(batches, nil)

	// Execute Calculation
	result, err := svc.Calculate(context.Background(), sessionID)

	// Verify
	assert.NoError(t, err)
	assert.Equal(t, int64(100000), result.ActualTotal, "Grand total should be 100k")
	assert.Equal(t, int64(0), result.GlobalResidual, "Residual should be 0 in this specific case")

	var finalA, finalB, finalHost int64
	for _, p := range result.Participants {
		if p.ParticipantID == guestAID { finalA = p.FinalAmount }
		if p.ParticipantID == guestBID { finalB = p.FinalAmount }
		if p.ParticipantID == hostID { finalHost = p.FinalAmount }
	}

	assert.Equal(t, int64(35000), finalA, "Guest A should pay 30k + proportional ship")
	assert.Equal(t, int64(25000), finalB, "Guest B should pay exactly 25k (separate)")
	assert.Equal(t, int64(40000), finalHost, "Host should pay 35k + proportional ship")
}
