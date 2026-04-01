package service

import (
	"testing"

	"milktea-server/internal/domain"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

func TestCalculateBill(t *testing.T) {
	hostID := uuid.New()
	guestID := uuid.New()
	sessionID := uuid.New()

	host := domain.Participant{ID: hostID, Name: "Host", IsHost: true}
	guest := domain.Participant{ID: guestID, Name: "Guest", IsHost: false}
	participants := []domain.Participant{host, guest}

	t.Run("Simple session - No fees, no batches", func(t *testing.T) {
		session := &domain.Session{ID: sessionID, IsSplitBatch: false}
		items := []domain.OrderItem{
			{ID: uuid.New(), ParticipantID: hostID, SessionID: sessionID, Price: 30000, Quantity: 1, ItemName: "Item 1"},
			{ID: uuid.New(), ParticipantID: guestID, SessionID: sessionID, Price: 25000, Quantity: 1, ItemName: "Item 2"},
		}

		result := CalculateBill(session, participants, items, nil)

		assert.Equal(t, int64(55000), result.ActualTotal)
		assert.Equal(t, int64(55000), result.CalculatedTotal)
		assert.Equal(t, int64(0), result.GlobalResidual)

		for _, p := range result.Participants {
			if p.ParticipantID == hostID {
				assert.Equal(t, int64(30000), p.FinalAmount)
			} else {
				assert.Equal(t, int64(25000), p.FinalAmount)
			}
		}
	})

	t.Run("Session with Shipping and Discount Amount", func(t *testing.T) {
		// Gross Total = 30k + 20k = 50k
		// Net Fee = 10k (ship) - 5k (discount) = +5k
		// Total Actual Payable = 50k + 5k = 55k
		session := &domain.Session{
			ID:            sessionID,
			IsSplitBatch:  false,
			ShippingFee:   10000,
			DiscountType:  "amount",
			DiscountValue: 5000,
		}
		items := []domain.OrderItem{
			{ID: uuid.New(), ParticipantID: hostID, SessionID: sessionID, Price: 30000, Quantity: 1},
			{ID: uuid.New(), ParticipantID: guestID, SessionID: sessionID, Price: 20000, Quantity: 1},
		}

		result := CalculateBill(session, participants, items, nil)

		// ShareRatio: Host 0.6, Guest 0.4
		// Host: 30000 + (5000 * 0.6) = 33000 -> Round1k = 33000
		// Guest: 20000 + (5000 * 0.4) = 22000 -> Round1k = 22000
		// Sum Rounded = 55000. Residual = 55000 - 55000 = 0
		assert.Equal(t, int64(55000), result.ActualTotal)
		assert.Equal(t, int64(55000), result.CalculatedTotal)
		
		for _, p := range result.Participants {
			if p.ParticipantID == hostID {
				assert.Equal(t, int64(33000), p.FinalAmount)
			} else {
				assert.Equal(t, int64(22000), p.FinalAmount)
			}
		}
	})

	t.Run("Rounding and Residual Logic", func(t *testing.T) {
		// Total Base = 30k + 30k = 60k
		// Shipping = 5k. Net Fee = 5k
		// Total Actual = 65k
		session := &domain.Session{
			ID:           sessionID,
			IsSplitBatch: false,
			ShippingFee:  5000,
		}
		items := []domain.OrderItem{
			{ID: uuid.New(), ParticipantID: hostID, SessionID: sessionID, Price: 30000, Quantity: 1},
			{ID: uuid.New(), ParticipantID: guestID, SessionID: sessionID, Price: 30000, Quantity: 1},
		}

		result := CalculateBill(session, participants, items, nil)

		// Host Raw: 30000 + 2500 = 32500 -> Round1k = 33000
		// Guest Raw: 30000 + 2500 = 32500 -> Round1k = 33000
		// Sum Rounded = 66000
		// Residual = 65000 - 66000 = -1000 (Host gánh lỗ làm tròn)
		
		assert.Equal(t, int64(65000), result.ActualTotal)
		assert.Equal(t, int64(66000), result.CalculatedTotal)
		assert.Equal(t, int64(-1000), result.GlobalResidual)

		for _, p := range result.Participants {
			if p.ParticipantID == hostID {
				// Subtotal 33000 + Residual -1000 = 32000
				assert.Equal(t, int64(32000), p.FinalAmount)
				assert.Equal(t, int64(-1000), p.Residual)
			} else {
				assert.Equal(t, int64(33000), p.FinalAmount)
			}
		}
	})

	t.Run("Pay Separate Items", func(t *testing.T) {
		session := &domain.Session{
			ID:           sessionID,
			IsSplitBatch: false,
			ShippingFee:  10000, // Shared by others
		}
		items := []domain.OrderItem{
			{ID: uuid.New(), ParticipantID: hostID, SessionID: sessionID, Price: 30000, Quantity: 1, PaySeparate: false},
			{ID: uuid.New(), ParticipantID: guestID, SessionID: sessionID, Price: 20000, Quantity: 1, PaySeparate: true},
		}

		result := CalculateBill(session, participants, items, nil)

		// Base for allocation = 30k (only host item)
		// Host: 30000 + 10000 = 40000
		// Guest: 20000 (no ship) = 20000
		// Total Actual = 30k + 20k + 10k = 60k
		
		assert.Equal(t, int64(60000), result.ActualTotal)
		for _, p := range result.Participants {
			if p.ParticipantID == hostID {
				assert.Equal(t, int64(40000), p.FinalAmount)
			} else {
				assert.Equal(t, int64(20000), p.FinalAmount)
			}
		}
	})

	t.Run("Multi-Batch Allocation", func(t *testing.T) {
		batch1ID := uuid.New()
		batch2ID := uuid.New()
		
		session := &domain.Session{ID: sessionID, IsSplitBatch: true, HostDeviceID: uuid.New()} // Mock DeviceID for host
		
		// Update host with device ID for matching
		participants[0].DeviceID = session.HostDeviceID

		batches := []domain.OrderBatch{
			{ID: batch1ID, Name: "Batch 1", ShippingFee: 10000},
			{ID: batch2ID, Name: "Batch 2", ShippingFee: 5000},
		}

		items := []domain.OrderItem{
			{ID: uuid.New(), ParticipantID: hostID, SessionID: sessionID, OrderBatchID: &batch1ID, Price: 20000, Quantity: 1},
			{ID: uuid.New(), ParticipantID: guestID, SessionID: sessionID, OrderBatchID: &batch2ID, Price: 20000, Quantity: 1},
		}

		result := CalculateBill(session, participants, items, batches)

		// Batch 1: 20k + 10k = 30k
		// Batch 2: 20k + 5k = 25k
		// Total Actual = 55k
		
		assert.Equal(t, int64(55000), result.ActualTotal)
		for _, p := range result.Participants {
			if p.ParticipantID == hostID {
				assert.Equal(t, int64(30000), p.FinalAmount)
			} else {
				assert.Equal(t, int64(25000), p.FinalAmount)
			}
		}
	})

	t.Run("Division by Zero - Batch with no items", func(t *testing.T) {
		batchID := uuid.New()
		session := &domain.Session{ID: sessionID, IsSplitBatch: true}
		batches := []domain.OrderBatch{
			{ID: batchID, Name: "Empty Batch", ShippingFee: 5000},
		}
		items := []domain.OrderItem{} // No items

		// This should not panic and should assign 5000 to Host residual
		result := CalculateBill(session, participants, items, batches)
		
		assert.Equal(t, int64(5000), result.ActualTotal)
		assert.Equal(t, int64(5000), result.GlobalResidual)
	})
}
