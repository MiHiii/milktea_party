package service

import (
	"context"
	"time"

	"milktea-server/internal/domain"
	"milktea-server/internal/repository"
	"milktea-server/internal/websocket"
	"github.com/google/uuid"
)

type participantService struct {
	repo repository.ParticipantRepository
	hub  *websocket.Hub
}

func NewParticipantService(repo repository.ParticipantRepository, hub *websocket.Hub) ParticipantService {
	return &participantService{repo: repo, hub: hub}
}

func (s *participantService) Create(ctx context.Context, p *domain.Participant) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	err := s.repo.Create(ctx, p)
	if err == nil {
		s.hub.Broadcast(p.SessionID.String(), "participant_created", p)
	}
	return err
}

func (s *participantService) GetByID(ctx context.Context, id uuid.UUID) (*domain.Participant, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	return s.repo.GetByID(ctx, id)
}

func (s *participantService) GetBySessionID(ctx context.Context, sessionID uuid.UUID) ([]domain.Participant, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	return s.repo.GetBySessionID(ctx, sessionID)
}

func (s *participantService) UpdateLastActive(ctx context.Context, id uuid.UUID) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	p, err := s.repo.UpdateLastActive(ctx, id)
	if err == nil && p != nil {
		s.hub.Broadcast(p.SessionID.String(), "participant_updated", p)
	}
	return err
}
