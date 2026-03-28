package repository

import (
	"context"
	"fmt"

	"milktea-server/internal/domain"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type postgresOrderItemRepository struct {
	db   pgxQuerier
	pool *pgxpool.Pool
}

func NewOrderItemRepository(db *PostgresPool) OrderItemRepository {
	return &postgresOrderItemRepository{
		db:   db.Pool,
		pool: db.Pool,
	}
}

func (r *postgresOrderItemRepository) Create(ctx context.Context, i *domain.OrderItem) error {
	query := `
		INSERT INTO order_items (
			participant_id, session_id, order_batch_id, item_name, price, quantity, note, ice, sugar, pay_separate
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, created_at`

	err := r.db.QueryRow(ctx, query,
		i.ParticipantID, i.SessionID, i.OrderBatchID, i.ItemName, i.Price, i.Quantity, i.Note, i.Ice, i.Sugar, i.PaySeparate,
	).Scan(&i.ID, &i.CreatedAt)

	if err != nil {
		return fmt.Errorf("failed to create order item: %w", err)
	}

	return nil
}

func (r *postgresOrderItemRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.OrderItem, error) {
	query := `
		SELECT id, participant_id, session_id, order_batch_id, item_name, price, quantity, note, ice, sugar, pay_separate, created_at
		FROM order_items WHERE id = $1`

	var i domain.OrderItem
	err := r.db.QueryRow(ctx, query, id).Scan(
		&i.ID, &i.ParticipantID, &i.SessionID, &i.OrderBatchID, &i.ItemName, &i.Price, &i.Quantity, &i.Note, &i.Ice, &i.Sugar, &i.PaySeparate, &i.CreatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get order item by id: %w", err)
	}

	return &i, nil
}

func (r *postgresOrderItemRepository) GetBySessionID(ctx context.Context, sessionID uuid.UUID) ([]domain.OrderItem, error) {
	query := `
		SELECT id, participant_id, session_id, order_batch_id, item_name, price, quantity, note, ice, sugar, pay_separate, created_at
		FROM order_items WHERE session_id = $1 ORDER BY created_at ASC`

	rows, err := r.db.Query(ctx, query, sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get order items by session id: %w", err)
	}
	defer rows.Close()

	items := []domain.OrderItem{}
	for rows.Next() {
		var i domain.OrderItem
		err := rows.Scan(
			&i.ID, &i.ParticipantID, &i.SessionID, &i.OrderBatchID, &i.ItemName, &i.Price, &i.Quantity, &i.Note, &i.Ice, &i.Sugar, &i.PaySeparate, &i.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan order item: %w", err)
		}
		items = append(items, i)
	}

	return items, nil
}

func (r *postgresOrderItemRepository) GetByParticipantID(ctx context.Context, participantID uuid.UUID) ([]domain.OrderItem, error) {
	query := `
		SELECT id, participant_id, session_id, order_batch_id, item_name, price, quantity, note, ice, sugar, pay_separate, created_at
		FROM order_items WHERE participant_id = $1 ORDER BY created_at ASC`

	rows, err := r.db.Query(ctx, query, participantID)
	if err != nil {
		return nil, fmt.Errorf("failed to get order items by participant id: %w", err)
	}
	defer rows.Close()

	items := []domain.OrderItem{}
	for rows.Next() {
		var i domain.OrderItem
		err := rows.Scan(
			&i.ID, &i.ParticipantID, &i.SessionID, &i.OrderBatchID, &i.ItemName, &i.Price, &i.Quantity, &i.Note, &i.Ice, &i.Sugar, &i.PaySeparate, &i.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan order item: %w", err)
		}
		items = append(items, i)
	}

	return items, nil
}

func (r *postgresOrderItemRepository) Update(ctx context.Context, i *domain.OrderItem) error {
	query := `
		UPDATE order_items SET
			order_batch_id = $1, item_name = $2, price = $3, quantity = $4, note = $5, ice = $6, sugar = $7, pay_separate = $8
		WHERE id = $9`

	_, err := r.db.Exec(ctx, query,
		i.OrderBatchID, i.ItemName, i.Price, i.Quantity, i.Note, i.Ice, i.Sugar, i.PaySeparate, i.ID,
	)

	if err != nil {
		return fmt.Errorf("failed to update order item: %w", err)
	}

	return nil
}

func (r *postgresOrderItemRepository) BulkUpdateBatch(ctx context.Context, sessionID uuid.UUID, oldBatchID *uuid.UUID, newBatchID *uuid.UUID) error {
	var query string
	var args []any

	if oldBatchID == nil {
		query = `UPDATE order_items SET order_batch_id = $1 WHERE session_id = $2 AND order_batch_id IS NULL`
		args = []any{newBatchID, sessionID}
	} else {
		query = `UPDATE order_items SET order_batch_id = $1 WHERE session_id = $2 AND order_batch_id = $3`
		args = []any{newBatchID, sessionID, *oldBatchID}
	}

	_, err := r.db.Exec(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("failed to bulk update order items: %w", err)
	}
	return nil
}

func (r *postgresOrderItemRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM order_items WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete order item: %w", err)
	}
	return nil
}
