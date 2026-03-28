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

	// Setup relations
	mockSessionRepo.On("ParticipantRepo").Return(mockParticipantRepo)
	mockSessionRepo.On("OrderItemRepo").Return(mockOrderItemRepo)
	mockSessionRepo.On("OrderBatchRepo").Return(mockOrderBatchRepo)

	svc := NewBillingService(mockSessionRepo)

	sessionID := uuid.New()
	hostID := uuid.New()
	guestID := uuid.New()

	t.Run("TC-03: Odd Shipping Fee & Residual Check", func(t *testing.T) {
		// Scenario: Host (30k), Guest (30k), Ship (5k)
		// Actual total = 65k
		// Each raw = 32.5k -> Rounded = 33k
		// Sum rounded = 66k -> Residual = -1k
		// Host final should be 33k - 1k = 32k
		
		session := &domain.Session{
			ID:           sessionID,
			HostDeviceID: uuid.New(), // Simplified for test
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
		// Scenario: Guest 1 (30k, separate), Guest 2 (30k, shared), Ship (10k)
		// Guest 1 pays 30k (No ship)
		// Guest 2 pays 30k + 10k = 40k
		// Total actual = 70k
		
		session := &domain.Session{
			ID:           sessionID,
			HostDeviceID: hostID, // We use hostID defined outside
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

// Add MockOrderBatchRepo if not exists in other files
type MockOrderBatchRepo struct {
	mock.Mock
}
func (m *MockOrderBatchRepo) Create(ctx context.Context, b *domain.OrderBatch) error { return m.Called(ctx, b).Error(0) }
func (m *MockOrderBatchRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.OrderBatch, error) { 
	args := m.Called(ctx, id)
	if args.Get(0) == nil { return nil, args.Error(1) }
	return args.Get(0).(*domain.OrderBatch), args.Error(1)
}
func (m *MockOrderBatchRepo) GetBySessionID(ctx context.Context, sid uuid.UUID) ([]domain.OrderBatch, error) {
	args := m.Called(ctx, sid)
	return args.Get(0).([]domain.OrderBatch), args.Error(1)
}
func (m *MockOrderBatchRepo) GetDefaultBatch(ctx context.Context, sid uuid.UUID) (*domain.OrderBatch, error) {
	args := m.Called(ctx, sid)
	if args.Get(0) == nil { return nil, args.Error(1) }
	return args.Get(0).(*domain.OrderBatch), args.Error(1)
}
func (m *MockOrderBatchRepo) Update(ctx context.Context, b *domain.OrderBatch) error { return m.Called(ctx, b).Error(0) }
func (m *MockOrderBatchRepo) Delete(ctx context.Context, id uuid.UUID) error { return m.Called(ctx, id).Error(0) }
