package repository

import (
	"context"
	"fmt"

	"milktea-server/internal/domain"
	"github.com/google/uuid"
)

type postgresOrderBatchRepository struct {
	db *PostgresPool
}

func NewOrderBatchRepository(db *PostgresPool) OrderBatchRepository {
	return &postgresOrderBatchRepository{db: db}
}

func (r *postgresOrderBatchRepository) Create(ctx context.Context, b *domain.OrderBatch) error {
	query := `
		INSERT INTO order_batches (
			session_id, name, bank_name, bank_account, qr_payload, status, is_default, sort_order
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at`

	err := r.db.Pool.QueryRow(ctx, query,
		b.SessionID, b.Name, b.BankName, b.BankAccount, b.QrPayload, b.Status, b.IsDefault, b.SortOrder,
	).Scan(&b.ID, &b.CreatedAt)

	if err != nil {
		return fmt.Errorf("failed to create order batch: %w", err)
	}

	return nil
}

func (r *postgresOrderBatchRepository) GetBySessionID(ctx context.Context, sessionID uuid.UUID) ([]domain.OrderBatch, error) {
	query := `
		SELECT id, session_id, name, bank_name, bank_account, qr_payload, status, is_default, sort_order, created_at
		FROM order_batches WHERE session_id = $1 ORDER BY sort_order ASC, created_at ASC`

	rows, err := r.db.Pool.Query(ctx, query, sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get order batches by session id: %w", err)
	}
	defer rows.Close()

	batches := []domain.OrderBatch{}
	for rows.Next() {
		var b domain.OrderBatch
		err := rows.Scan(
			&b.ID, &b.SessionID, &b.Name, &b.BankName, &b.BankAccount, &b.QrPayload, &b.Status, &b.IsDefault, &b.SortOrder, &b.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan order batch: %w", err)
		}
		batches = append(batches, b)
	}

	return batches, nil
}

func (r *postgresOrderBatchRepository) Update(ctx context.Context, b *domain.OrderBatch) error {
	query := `
		UPDATE order_batches SET
			name = $1, bank_name = $2, bank_account = $3, qr_payload = $4, status = $5, is_default = $6, sort_order = $7
		WHERE id = $8`

	_, err := r.db.Pool.Exec(ctx, query,
		b.Name, b.BankName, b.BankAccount, b.QrPayload, b.Status, b.IsDefault, b.SortOrder, b.ID,
	)

	if err != nil {
		return fmt.Errorf("failed to update order batch: %w", err)
	}

	return nil
}

func (r *postgresOrderBatchRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM order_batches WHERE id = $1`
	_, err := r.db.Pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete order batch: %w", err)
	}
	return nil
}
