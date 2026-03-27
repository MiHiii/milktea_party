package service

import (
	"context"

	"milktea-server/internal/domain"
	"github.com/google/uuid"
)

type SessionService interface {
	Create(ctx context.Context, session *domain.Session, hostName string) (*domain.Participant, error)
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Session, error)
	GetBySlug(ctx context.Context, slug string) (*domain.Session, error)
	Update(ctx context.Context, session *domain.Session, requesterDeviceID uuid.UUID) error
	Delete(ctx context.Context, id uuid.UUID, requesterDeviceID uuid.UUID) error
	ListByHost(ctx context.Context, hostDeviceID uuid.UUID) ([]domain.Session, error)
	ListByIDs(ctx context.Context, ids []uuid.UUID) ([]domain.Session, error)
	VerifyPassword(ctx context.Context, slug string, password string) (bool, error)
	CleanupOldSessions(ctx context.Context, days int) (int64, error)
}

type ParticipantService interface {
	Create(ctx context.Context, participant *domain.Participant) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Participant, error)
	GetBySessionID(ctx context.Context, sessionID uuid.UUID) ([]domain.Participant, error)
	UpdateLastActive(ctx context.Context, id uuid.UUID, deviceID uuid.UUID) error
}

type OrderBatchService interface {
	Create(ctx context.Context, batch *domain.OrderBatch) error
	GetBySessionID(ctx context.Context, sessionID uuid.UUID) ([]domain.OrderBatch, error)
	Update(ctx context.Context, batch *domain.OrderBatch) error
	Delete(ctx context.Context, id uuid.UUID) error
}

type OrderItemService interface {
	Create(ctx context.Context, item *domain.OrderItem, idempotencyKey string) error
	GetBySessionID(ctx context.Context, sessionID uuid.UUID) ([]domain.OrderItem, error)
	Update(ctx context.Context, item *domain.OrderItem, deviceID uuid.UUID, idempotencyKey string) error
	Delete(ctx context.Context, id uuid.UUID, deviceID uuid.UUID, idempotencyKey string) error
}
