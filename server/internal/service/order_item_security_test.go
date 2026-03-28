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

type MockOrderItemRepo struct {
	mock.Mock
}

func (m *MockOrderItemRepo) Create(ctx context.Context, i *domain.OrderItem) error {
	args := m.Called(ctx, i)
	return args.Error(0)
}

func (m *MockOrderItemRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.OrderItem, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.OrderItem), args.Error(1)
}

func (m *MockOrderItemRepo) GetBySessionID(ctx context.Context, sessionID uuid.UUID) ([]domain.OrderItem, error) {
	args := m.Called(ctx, sessionID)
	return args.Get(0).([]domain.OrderItem), args.Error(1)
}

func (m *MockOrderItemRepo) GetByParticipantID(ctx context.Context, participantID uuid.UUID) ([]domain.OrderItem, error) {
	args := m.Called(ctx, participantID)
	return args.Get(0).([]domain.OrderItem), args.Error(1)
}

func (m *MockOrderItemRepo) Update(ctx context.Context, item *domain.OrderItem) error {
	args := m.Called(ctx, item)
	return args.Error(0)
}

func (m *MockOrderItemRepo) BulkUpdateBatch(ctx context.Context, sessionID uuid.UUID, oldBatchID *uuid.UUID, newBatchID *uuid.UUID) error {
	args := m.Called(ctx, sessionID, oldBatchID, newBatchID)
	return args.Error(0)
}

func (m *MockOrderItemRepo) Delete(ctx context.Context, id uuid.UUID) error {

	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockParticipantRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Participant, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Participant), args.Error(1)
}

func (m *MockParticipantRepo) GetBySessionID(ctx context.Context, sessionID uuid.UUID) ([]domain.Participant, error) {
	args := m.Called(ctx, sessionID)
	return args.Get(0).([]domain.Participant), args.Error(1)
}

func (m *MockParticipantRepo) Update(ctx context.Context, p *domain.Participant) error {
	args := m.Called(ctx, p)
	return args.Error(0)
}

func (m *MockParticipantRepo) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockParticipantRepo) UpdateLastActive(ctx context.Context, id uuid.UUID) (*domain.Participant, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Participant), args.Error(1)
}

func TestOrderItemSecurity_IDOR(t *testing.T) {
	mockRepo := new(MockOrderItemRepo)
	mockSessionRepo := new(MockSessionRepo)
	mockPartRepo := new(MockParticipantRepo)
	hub := websocket.NewHub()
	
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go hub.Run(ctx)

	svc := NewOrderItemService(mockRepo, mockSessionRepo, mockPartRepo, hub)

	deviceID := uuid.New()
	otherDeviceID := uuid.New()
	participantID := uuid.New()
	itemID := uuid.New()
	sessionID := uuid.New()

	item := &domain.OrderItem{
		ID:            itemID,
		ParticipantID: participantID,
		SessionID:     sessionID,
		Quantity:      1,
		Price:         1000,
	}

	participant := &domain.Participant{
		ID:       participantID,
		DeviceID: deviceID,
	}

	t.Run("Update with correct deviceID should succeed", func(t *testing.T) {
		mockRepo.On("GetByID", mock.Anything, itemID).Return(item, nil).Once()
		mockPartRepo.On("GetByID", mock.Anything, participantID).Return(participant, nil).Once()
		mockSessionRepo.On("GetByID", mock.Anything, sessionID).Return(&domain.Session{Status: "open"}, nil).Once()
		mockRepo.On("Update", mock.Anything, mock.Anything).Return(nil).Once()

		err := svc.Update(context.Background(), item, deviceID, "")
		assert.NoError(t, err)
	})

	t.Run("Update with wrong deviceID should fail (IDOR)", func(t *testing.T) {
		mockRepo.On("GetByID", mock.Anything, itemID).Return(item, nil).Once()
		mockPartRepo.On("GetByID", mock.Anything, participantID).Return(participant, nil).Once()

		err := svc.Update(context.Background(), item, otherDeviceID, "")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "unauthorized")
	})

	t.Run("Delete with wrong deviceID should fail (IDOR)", func(t *testing.T) {
		mockRepo.On("GetByID", mock.Anything, itemID).Return(item, nil).Once()
		mockPartRepo.On("GetByID", mock.Anything, participantID).Return(participant, nil).Once()

		err := svc.Delete(context.Background(), itemID, otherDeviceID, "")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "unauthorized")
	})
}

func TestParticipantSecurity_IDOR(t *testing.T) {
	mockPartRepo := new(MockParticipantRepo)
	hub := websocket.NewHub()
	
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go hub.Run(ctx)

	svc := NewParticipantService(mockPartRepo, hub)

	deviceID := uuid.New()
	otherDeviceID := uuid.New()
	participantID := uuid.New()

	participant := &domain.Participant{
		ID:       participantID,
		DeviceID: deviceID,
	}

	t.Run("UpdateLastActive with correct deviceID should succeed", func(t *testing.T) {
		mockPartRepo.On("GetByID", mock.Anything, participantID).Return(participant, nil).Once()
		mockPartRepo.On("UpdateLastActive", mock.Anything, participantID).Return(participant, nil).Once()

		err := svc.UpdateLastActive(context.Background(), participantID, deviceID)
		assert.NoError(t, err)
	})

	t.Run("UpdateLastActive with wrong deviceID should fail (IDOR)", func(t *testing.T) {
		mockPartRepo.On("GetByID", mock.Anything, participantID).Return(participant, nil).Once()

		err := svc.UpdateLastActive(context.Background(), participantID, otherDeviceID)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "unauthorized")
	})
}
