package service

import (
	"context"
	"milktea-server/internal/domain"
	"milktea-server/internal/repository"
	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"
)

// MockSessionRepo
type MockSessionRepo struct {
	mock.Mock
	repository.SessionRepository
}

func (m *MockSessionRepo) Create(ctx context.Context, s *domain.Session) error {
	return m.Called(ctx, s).Error(0)
}
func (m *MockSessionRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Session, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil { return nil, args.Error(1) }
	return args.Get(0).(*domain.Session), args.Error(1)
}
func (m *MockSessionRepo) GetByIDForUpdate(ctx context.Context, id uuid.UUID) (*domain.Session, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil { return nil, args.Error(1) }
	return args.Get(0).(*domain.Session), args.Error(1)
}
func (m *MockSessionRepo) GetBySlug(ctx context.Context, slug string) (*domain.Session, error) {
	args := m.Called(ctx, slug)
	if args.Get(0) == nil { return nil, args.Error(1) }
	return args.Get(0).(*domain.Session), args.Error(1)
}
func (m *MockSessionRepo) Update(ctx context.Context, s *domain.Session) error {
	return m.Called(ctx, s).Error(0)
}
func (m *MockSessionRepo) UpdateHostLastActive(ctx context.Context, id uuid.UUID) error {
	return m.Called(ctx, id).Error(0)
}
func (m *MockSessionRepo) WithTx(ctx context.Context, fn func(repository.SessionRepository) error) error {
	return fn(m)
}
func (m *MockSessionRepo) ParticipantRepo() repository.ParticipantRepository {
	return m.Called().Get(0).(repository.ParticipantRepository)
}
func (m *MockSessionRepo) OrderBatchRepo() repository.OrderBatchRepository {
	return m.Called().Get(0).(repository.OrderBatchRepository)
}
func (m *MockSessionRepo) OrderItemRepo() repository.OrderItemRepository {
	return m.Called().Get(0).(repository.OrderItemRepository)
}

// MockParticipantRepo
type MockParticipantRepo struct {
	mock.Mock
	repository.ParticipantRepository
}

func (m *MockParticipantRepo) Create(ctx context.Context, p *domain.Participant) error {
	return m.Called(ctx, p).Error(0)
}
func (m *MockParticipantRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Participant, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil { return nil, args.Error(1) }
	return args.Get(0).(*domain.Participant), args.Error(1)
}
func (m *MockParticipantRepo) GetBySessionID(ctx context.Context, sid uuid.UUID) ([]domain.Participant, error) {
	args := m.Called(ctx, sid)
	if args.Get(0) == nil { return nil, args.Error(1) }
	return args.Get(0).([]domain.Participant), args.Error(1)
}
func (m *MockParticipantRepo) Update(ctx context.Context, p *domain.Participant) error {
	return m.Called(ctx, p).Error(0)
}
func (m *MockParticipantRepo) UpdateDeviceID(ctx context.Context, id uuid.UUID, dID uuid.UUID) error {
	return m.Called(ctx, id, dID).Error(0)
}
func (m *MockParticipantRepo) UpdateLastActive(ctx context.Context, id uuid.UUID) (*domain.Participant, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil { return nil, args.Error(1) }
	return args.Get(0).(*domain.Participant), args.Error(1)
}

// MockOrderItemRepo
type MockOrderItemRepo struct {
	mock.Mock
	repository.OrderItemRepository
}

func (m *MockOrderItemRepo) Create(ctx context.Context, i *domain.OrderItem) error {
	return m.Called(ctx, i).Error(0)
}
func (m *MockOrderItemRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.OrderItem, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil { return nil, args.Error(1) }
	return args.Get(0).(*domain.OrderItem), args.Error(1)
}
func (m *MockOrderItemRepo) GetBySessionID(ctx context.Context, sid uuid.UUID) ([]domain.OrderItem, error) {
	args := m.Called(ctx, sid)
	if args.Get(0) == nil { return nil, args.Error(1) }
	return args.Get(0).([]domain.OrderItem), args.Error(1)
}
func (m *MockOrderItemRepo) GetByParticipantID(ctx context.Context, pid uuid.UUID) ([]domain.OrderItem, error) {
	args := m.Called(ctx, pid)
	if args.Get(0) == nil { return nil, args.Error(1) }
	return args.Get(0).([]domain.OrderItem), args.Error(1)
}
func (m *MockOrderItemRepo) Update(ctx context.Context, i *domain.OrderItem) error {
	return m.Called(ctx, i).Error(0)
}
func (m *MockOrderItemRepo) BulkUpdateBatch(ctx context.Context, sid uuid.UUID, oldB, newB *uuid.UUID) error {
	return m.Called(ctx, sid, oldB, newB).Error(0)
}
func (m *MockOrderItemRepo) Delete(ctx context.Context, id uuid.UUID) error {
	return m.Called(ctx, id).Error(0)
}

// MockOrderBatchRepo
type MockOrderBatchRepo struct {
	mock.Mock
	repository.OrderBatchRepository
}

func (m *MockOrderBatchRepo) Create(ctx context.Context, b *domain.OrderBatch) error {
	return m.Called(ctx, b).Error(0)
}
func (m *MockOrderBatchRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.OrderBatch, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil { return nil, args.Error(1) }
	return args.Get(0).(*domain.OrderBatch), args.Error(1)
}
func (m *MockOrderBatchRepo) GetBySessionID(ctx context.Context, sid uuid.UUID) ([]domain.OrderBatch, error) {
	args := m.Called(ctx, sid)
	if args.Get(0) == nil { return nil, args.Error(1) }
	return args.Get(0).([]domain.OrderBatch), args.Error(1)
}
func (m *MockOrderBatchRepo) Update(ctx context.Context, b *domain.OrderBatch) error {
	return m.Called(ctx, b).Error(0)
}
func (m *MockOrderBatchRepo) Delete(ctx context.Context, id uuid.UUID) error {
	return m.Called(ctx, id).Error(0)
}
