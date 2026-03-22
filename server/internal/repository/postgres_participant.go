package repository

import (
	"context"
	"fmt"

	"milktea-server/internal/domain"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type postgresParticipantRepository struct {
	db *PostgresPool
}

func NewParticipantRepository(db *PostgresPool) ParticipantRepository {
	return &postgresParticipantRepository{db: db}
}

func (r *postgresParticipantRepository) Create(ctx context.Context, p *domain.Participant) error {
	query := `
		INSERT INTO participants (session_id, device_id, name, is_host, is_paid)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, last_active`

	err := r.db.Pool.QueryRow(ctx, query, p.SessionID, p.DeviceID, p.Name, p.IsHost, p.IsPaid).
		Scan(&p.ID, &p.LastActive)

	if err != nil {
		return fmt.Errorf("failed to create participant: %w", err)
	}

	return nil
}

func (r *postgresParticipantRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Participant, error) {
	query := `SELECT id, session_id, device_id, name, is_host, is_paid, last_active FROM participants WHERE id = $1`

	var p domain.Participant
	err := r.db.Pool.QueryRow(ctx, query, id).
		Scan(&p.ID, &p.SessionID, &p.DeviceID, &p.Name, &p.IsHost, &p.IsPaid, &p.LastActive)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get participant by id: %w", err)
	}

	return &p, nil
}

func (r *postgresParticipantRepository) GetBySessionID(ctx context.Context, sessionID uuid.UUID) ([]domain.Participant, error) {
	query := `SELECT id, session_id, device_id, name, is_host, is_paid, last_active FROM participants WHERE session_id = $1`

	rows, err := r.db.Pool.Query(ctx, query, sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get participants by session id: %w", err)
	}
	defer rows.Close()

	var participants []domain.Participant
	for rows.Next() {
		var p domain.Participant
		if err := rows.Scan(&p.ID, &p.SessionID, &p.DeviceID, &p.Name, &p.IsHost, &p.IsPaid, &p.LastActive); err != nil {
			return nil, fmt.Errorf("failed to scan participant: %w", err)
		}
		participants = append(participants, p)
	}

	return participants, nil
}

func (r *postgresParticipantRepository) Update(ctx context.Context, p *domain.Participant) error {
	query := `UPDATE participants SET name = $1, is_host = $2, is_paid = $3, last_active = NOW() WHERE id = $4`
	_, err := r.db.Pool.Exec(ctx, query, p.Name, p.IsHost, p.IsPaid, p.ID)
	if err != nil {
		return fmt.Errorf("failed to update participant: %w", err)
	}
	return nil
}

func (r *postgresParticipantRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM participants WHERE id = $1`
	_, err := r.db.Pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete participant: %w", err)
	}
	return nil
}

func (r *postgresParticipantRepository) UpdateLastActive(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE participants SET last_active = NOW() WHERE id = $1`
	_, err := r.db.Pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to update participant last active: %w", err)
	}
	return nil
}
