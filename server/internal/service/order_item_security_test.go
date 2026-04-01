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
	mockSessionRepo := new(MockSessionRepo)
	hub := websocket.NewHub()
	
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go hub.Run(ctx)

	svc := NewParticipantService(mockPartRepo, mockSessionRepo, hub)

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
		mockSessionRepo.On("GetByID", mock.Anything, mock.Anything).Return(&domain.Session{HostDeviceID: uuid.New()}, nil).Once()

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
