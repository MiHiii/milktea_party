package repository

import (
	"context"
	"fmt"

	"milktea-server/internal/domain"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type postgresOrderBatchRepository struct {
	db   pgxQuerier
	pool *pgxpool.Pool
}

func NewOrderBatchRepository(db *PostgresPool) OrderBatchRepository {
	return &postgresOrderBatchRepository{
		db:   db.Pool,
		pool: db.Pool,
	}
}

func (r *postgresOrderBatchRepository) Create(ctx context.Context, b *domain.OrderBatch) error {
	query := `
		INSERT INTO order_batches (
			session_id, name, bank_name, bank_account, qr_payload, status, is_default, sort_order, discount_amount, shipping_fee
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, created_at`

	err := r.db.QueryRow(ctx, query,
		b.SessionID, b.Name, b.BankName, b.BankAccount, b.QrPayload, b.Status, b.IsDefault, b.SortOrder, b.DiscountAmount, b.ShippingFee,
	).Scan(&b.ID, &b.CreatedAt)

	if err != nil {
		return fmt.Errorf("failed to create order batch: %w", err)
	}

	return nil
}

func (r *postgresOrderBatchRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.OrderBatch, error) {
	query := `
		SELECT id, session_id, name, bank_name, bank_account, qr_payload, status, is_default, sort_order, discount_amount, shipping_fee, created_at
		FROM order_batches WHERE id = $1`

	var b domain.OrderBatch
	err := r.db.QueryRow(ctx, query, id).Scan(
		&b.ID, &b.SessionID, &b.Name, &b.BankName, &b.BankAccount, &b.QrPayload, &b.Status, &b.IsDefault, &b.SortOrder, &b.DiscountAmount, &b.ShippingFee, &b.CreatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get order batch by id: %w", err)
	}

	return &b, nil
}

func (r *postgresOrderBatchRepository) GetBySessionID(ctx context.Context, sessionID uuid.UUID) ([]domain.OrderBatch, error) {
	query := `
		SELECT id, session_id, name, bank_name, bank_account, qr_payload, status, is_default, sort_order, discount_amount, shipping_fee, created_at
		FROM order_batches WHERE session_id = $1 ORDER BY sort_order ASC, created_at ASC`

	rows, err := r.db.Query(ctx, query, sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get order batches by session id: %w", err)
	}
	defer rows.Close()

	batches := []domain.OrderBatch{}
	for rows.Next() {
		var b domain.OrderBatch
		err := rows.Scan(
			&b.ID, &b.SessionID, &b.Name, &b.BankName, &b.BankAccount, &b.QrPayload, &b.Status, &b.IsDefault, &b.SortOrder, &b.DiscountAmount, &b.ShippingFee, &b.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan order batch: %w", err)
		}
		batches = append(batches, b)
	}

	return batches, nil
}

func (r *postgresOrderBatchRepository) GetDefaultBatch(ctx context.Context, sessionID uuid.UUID) (*domain.OrderBatch, error) {
	query := `
		SELECT id, session_id, name, bank_name, bank_account, qr_payload, status, is_default, sort_order, discount_amount, shipping_fee, created_at
		FROM order_batches WHERE session_id = $1 AND is_default = true LIMIT 1`

	var b domain.OrderBatch
	err := r.db.QueryRow(ctx, query, sessionID).Scan(
		&b.ID, &b.SessionID, &b.Name, &b.BankName, &b.BankAccount, &b.QrPayload, &b.Status, &b.IsDefault, &b.SortOrder, &b.DiscountAmount, &b.ShippingFee, &b.CreatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get default order batch: %w", err)
	}

	return &b, nil
}

func (r *postgresOrderBatchRepository) Update(ctx context.Context, b *domain.OrderBatch) error {
	query := `
		UPDATE order_batches SET
			name = $1, bank_name = $2, bank_account = $3, qr_payload = $4, status = $5, is_default = $6, sort_order = $7,
			discount_amount = $8, shipping_fee = $9
		WHERE id = $10`

	_, err := r.db.Exec(ctx, query,
		b.Name, b.BankName, b.BankAccount, b.QrPayload, b.Status, b.IsDefault, b.SortOrder,
		b.DiscountAmount, b.ShippingFee,
		b.ID,
	)

	if err != nil {
		return fmt.Errorf("failed to update order batch: %w", err)
	}

	return nil
}

func (r *postgresOrderBatchRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM order_batches WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete order batch: %w", err)
	}
	return nil
}
