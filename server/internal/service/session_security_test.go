package service

import (
	"context"
	"testing"
	"time"

	"milktea-server/internal/domain"
	"milktea-server/internal/repository"
	"milktea-server/internal/websocket"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"golang.org/x/crypto/bcrypt"
)

// Mock repositories for testing
type MockSessionRepo struct {
	mock.Mock
	repository.SessionRepository
}

func (m *MockSessionRepo) Create(ctx context.Context, s *domain.Session) error {
	args := m.Called(ctx, s)
	return args.Error(0)
}

func (m *MockSessionRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Session, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Session), args.Error(1)
}

func (m *MockSessionRepo) GetByIDForUpdate(ctx context.Context, id uuid.UUID) (*domain.Session, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Session), args.Error(1)
}

func (m *MockSessionRepo) Update(ctx context.Context, s *domain.Session) error {
	args := m.Called(ctx, s)
	return args.Error(0)
}

func (m *MockSessionRepo) WithTx(ctx context.Context, fn func(repository.SessionRepository) error) error {
	return fn(m)
}

func (m *MockSessionRepo) GetBySlug(ctx context.Context, slug string) (*domain.Session, error) {
	args := m.Called(ctx, slug)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Session), args.Error(1)
}

type MockParticipantRepo struct {
	mock.Mock
	repository.ParticipantRepository
}

func (m *MockParticipantRepo) Create(ctx context.Context, p *domain.Participant) error {
	args := m.Called(ctx, p)
	return args.Error(0)
}

func setupTestSvc() (*sessionService, *MockSessionRepo, *MockParticipantRepo, context.CancelFunc) {
	mockRepo := new(MockSessionRepo)
	mockPartRepo := new(MockParticipantRepo)
	hub := websocket.NewHub()
	
	ctx, cancel := context.WithCancel(context.Background())
	go hub.Run(ctx) // Start hub in background to prevent deadlock on Broadcast

	svc := NewSessionService(mockRepo, mockPartRepo, hub).(*sessionService)
	return svc, mockRepo, mockPartRepo, cancel
}

func TestSecurity_BcryptHashing(t *testing.T) {
	svc, mockRepo, mockPartRepo, cancel := setupTestSvc()
	defer cancel()

	password := "mypassword123"
	session := &domain.Session{
		Title:        "Test Session",
		HostDeviceID: uuid.New(),
		Password:     &password,
	}

	mockRepo.On("Create", mock.Anything, mock.Anything).Return(nil).Run(func(args mock.Arguments) {
		s := args.Get(1).(*domain.Session)
		assert.NotEqual(t, password, *s.Password)
		err := bcrypt.CompareHashAndPassword([]byte(*s.Password), []byte(password))
		assert.NoError(t, err)
	})
	mockPartRepo.On("Create", mock.Anything, mock.Anything).Return(nil)

	_, err := svc.Create(context.Background(), session, "Host")
	assert.NoError(t, err)
	
	time.Sleep(10 * time.Millisecond) // Give hub a moment to process broadcast
}

func TestSecurity_IDOR_Protection(t *testing.T) {
	svc, mockRepo, _, cancel := setupTestSvc()
	defer cancel()

	hostID := uuid.New()
	attackerID := uuid.New()
	sessionID := uuid.New()

	existingSession := &domain.Session{
		ID:           sessionID,
		HostDeviceID: hostID,
		Status:       "open",
	}

	// 1. Test Update IDOR
	mockRepo.On("GetByID", mock.Anything, sessionID).Return(existingSession, nil)
	
	updateReq := &domain.Session{ID: sessionID, Status: "locked"}
	err := svc.Update(context.Background(), updateReq, attackerID)
	
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "unauthorized")

	// 2. Test Success Update by Host
	mockRepo.On("Update", mock.Anything, mock.Anything).Return(nil)
	err = svc.Update(context.Background(), updateReq, hostID)
	assert.NoError(t, err)
}

func TestSecurity_VerifyPassword_Bcrypt(t *testing.T) {
	svc, mockRepo, _, cancel := setupTestSvc()
	defer cancel()

	password := "secret"
	hashed, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	strHashed := string(hashed)

	mockRepo.On("GetBySlug", mock.Anything, "test-slug").Return(&domain.Session{
		Password: &strHashed,
	}, nil)

	// Correct password
	success, err := svc.VerifyPassword(context.Background(), "test-slug", password)
	assert.NoError(t, err)
	assert.True(t, success)

	// Wrong password
	success, err = svc.VerifyPassword(context.Background(), "test-slug", "wrong")
	assert.NoError(t, err)
	assert.False(t, success)
}
