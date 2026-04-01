package service

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"milktea-server/internal/domain"
	"milktea-server/internal/repository"
	"milktea-server/internal/websocket"
	"github.com/google/uuid"
)

type participantService struct {
	repo        repository.ParticipantRepository
	sessionRepo repository.SessionRepository
	hub         *websocket.Hub
}

func NewParticipantService(repo repository.ParticipantRepository, sessionRepo repository.SessionRepository, hub *websocket.Hub) ParticipantService {
	return &participantService{repo: repo, sessionRepo: sessionRepo, hub: hub}
}

// helper to calculate online status server-side
func setOnlineStatus(p *domain.Participant) {
	if p == nil {
		return
	}
	// Server-side logic: Online if active within last 60 seconds
	diff := time.Since(p.LastActive)
	p.IsOnline = diff < 60*time.Second
	slog.Debug("📊 Online Check", 
		"name", p.Name, 
		"last_active", p.LastActive.Format(time.RFC3339),
		"server_now", time.Now().Format(time.RFC3339),
		"diff_sec", diff.Seconds(), 
		"is_online", p.IsOnline,
	)
}

func (s *participantService) Create(ctx context.Context, p *domain.Participant) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	err := s.repo.Create(ctx, p)
	if err == nil {
		setOnlineStatus(p)
		s.hub.Broadcast(p.SessionID.String(), "participant_created", p)
	}
	return err
}

func (s *participantService) GetByID(ctx context.Context, id uuid.UUID) (*domain.Participant, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	p, err := s.repo.GetByID(ctx, id)
	if err == nil && p != nil {
		setOnlineStatus(p)
	}
	return p, err
}

func (s *participantService) GetBySessionID(ctx context.Context, sessionID uuid.UUID) ([]domain.Participant, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	participants, err := s.repo.GetBySessionID(ctx, sessionID)
	if err == nil {
		for i := range participants {
			setOnlineStatus(&participants[i])
		}
	}
	return participants, err
}

func (s *participantService) UpdateLastActive(ctx context.Context, id uuid.UUID, deviceID uuid.UUID) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	slog.Debug("💓 Heartbeat received", "id", id, "deviceID", deviceID)

	// 1. Verify ownership
	p, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if p == nil {
		return fmt.Errorf("participant not found")
	}
	if p.DeviceID != deviceID {
		slog.Warn("🚫 Heartbeat rejected: DeviceID mismatch", "expected", p.DeviceID, "received", deviceID)
		return fmt.Errorf("unauthorized: you do not own this participant profile")
	}

	// 2. Update participant heartbeat (Online status)
	p, err = s.repo.UpdateLastActive(ctx, id)
	if err != nil {
		return err
	}

	// 3. Special: If this is the active Host device, update host_last_active in session
	session, err := s.sessionRepo.GetByID(ctx, p.SessionID)
	if err == nil && session != nil && session.HostDeviceID == deviceID {
		_ = s.sessionRepo.UpdateHostLastActive(ctx, session.ID)
	}

	if p != nil {
		setOnlineStatus(p)
		s.hub.Broadcast(p.SessionID.String(), "participant_updated", p)
	}
	return nil
}

func (s *participantService) UpdateDeviceID(ctx context.Context, id uuid.UUID, deviceID uuid.UUID) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	slog.Info("🔄 Device ID re-binding", "id", id, "new_deviceID", deviceID)

	// SILENT re-binding: Only update device_id, don't touch last_active
	err := s.repo.UpdateDeviceID(ctx, id, deviceID)
	if err == nil {
		p, _ := s.repo.GetByID(ctx, id)
		if p != nil {
			setOnlineStatus(p)
			s.hub.Broadcast(p.SessionID.String(), "participant_updated", p)
		}
	}
	return err
}
