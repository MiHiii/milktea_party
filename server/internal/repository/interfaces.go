package repository

import (
	"context"

	"milktea-server/internal/domain"
	"github.com/google/uuid"
)

type SessionRepository interface {
	WithTx(ctx context.Context, fn func(SessionRepository) error) error
	Create(ctx context.Context, session *domain.Session) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Session, error)
	GetByIDForUpdate(ctx context.Context, id uuid.UUID) (*domain.Session, error)
	GetBySlug(ctx context.Context, slug string) (*domain.Session, error)
	Update(ctx context.Context, session *domain.Session) error
	Delete(ctx context.Context, id uuid.UUID) error
	ListByHost(ctx context.Context, hostDeviceID uuid.UUID) ([]domain.Session, error)
	ListByIDs(ctx context.Context, ids []uuid.UUID) ([]domain.Session, error)
	CleanupOldSessions(ctx context.Context, days int) (int64, error)
}

type ParticipantRepository interface {
	Create(ctx context.Context, participant *domain.Participant) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Participant, error)
	GetBySessionID(ctx context.Context, sessionID uuid.UUID) ([]domain.Participant, error)
	Update(ctx context.Context, participant *domain.Participant) error
	Delete(ctx context.Context, id uuid.UUID) error
	UpdateLastActive(ctx context.Context, id uuid.UUID) error
}

type OrderBatchRepository interface {
	Create(ctx context.Context, batch *domain.OrderBatch) error
	GetBySessionID(ctx context.Context, sessionID uuid.UUID) ([]domain.OrderBatch, error)
	Update(ctx context.Context, batch *domain.OrderBatch) error
	Delete(ctx context.Context, id uuid.UUID) error
}

type OrderItemRepository interface {
	Create(ctx context.Context, item *domain.OrderItem) error
	GetBySessionID(ctx context.Context, sessionID uuid.UUID) ([]domain.OrderItem, error)
	GetByParticipantID(ctx context.Context, participantID uuid.UUID) ([]domain.OrderItem, error)
	Update(ctx context.Context, item *domain.OrderItem) error
	Delete(ctx context.Context, id uuid.UUID) error
}
