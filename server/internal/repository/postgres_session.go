package repository

import (
	"context"
	"fmt"

	"milktea-server/internal/domain"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type pgxQuerier interface {
	Exec(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag, error)
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

type postgresSessionRepository struct {
	db   pgxQuerier
	pool *pgxpool.Pool
}

func NewSessionRepository(db *PostgresPool) SessionRepository {
	return &postgresSessionRepository{
		db:   db.Pool,
		pool: db.Pool,
	}
}

func (r *postgresSessionRepository) WithTx(ctx context.Context, fn func(SessionRepository) error) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}

	defer func() {
		if p := recover(); p != nil {
			_ = tx.Rollback(ctx)
			panic(p)
		}
	}()

	repo := &postgresSessionRepository{
		db:   tx,
		pool: r.pool,
	}

	if err := fn(repo); err != nil {
		_ = tx.Rollback(ctx)
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

func (r *postgresSessionRepository) Create(ctx context.Context, s *domain.Session) error {
	query := `
		INSERT INTO sessions (
			slug, room_id, title, host_device_id, shop_link, 
			host_default_bank_name, host_default_bank_account, host_default_qr_payload, 
			status, discount_type, discount_value, shipping_fee, 
			is_split_batch, use_default_qr_for_all, batch_configs, password
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
		RETURNING id, created_at`

	err := r.db.QueryRow(ctx, query,
		s.Slug, s.RoomID, s.Title, s.HostDeviceID, s.ShopLink,
		s.HostDefaultBankName, s.HostDefaultBankAccount, s.HostDefaultQrPayload,
		s.Status, s.DiscountType, s.DiscountValue, s.ShippingFee,
		s.IsSplitBatch, s.UseDefaultQrForAll, s.BatchConfigs, s.Password,
	).Scan(&s.ID, &s.CreatedAt)

	if err != nil {
		return fmt.Errorf("failed to create session: %w", err)
	}

	return nil
}

func (r *postgresSessionRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Session, error) {
	query := `
		SELECT id, slug, room_id, title, host_device_id, shop_link, 
		       host_default_bank_name, host_default_bank_account, host_default_qr_payload, 
		       status, discount_type, discount_value, shipping_fee, 
		       is_split_batch, use_default_qr_for_all, batch_configs, password, created_at
		FROM sessions WHERE id = $1`

	var s domain.Session
	err := r.db.QueryRow(ctx, query, id).Scan(
		&s.ID, &s.Slug, &s.RoomID, &s.Title, &s.HostDeviceID, &s.ShopLink,
		&s.HostDefaultBankName, &s.HostDefaultBankAccount, &s.HostDefaultQrPayload,
		&s.Status, &s.DiscountType, &s.DiscountValue, &s.ShippingFee,
		&s.IsSplitBatch, &s.UseDefaultQrForAll, &s.BatchConfigs, &s.Password, &s.CreatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get session by id: %w", err)
	}

	s.HasPassword = s.Password != nil && *s.Password != ""
	return &s, nil
}

func (r *postgresSessionRepository) GetByIDForUpdate(ctx context.Context, id uuid.UUID) (*domain.Session, error) {
	query := `
		SELECT id, slug, room_id, title, host_device_id, shop_link, 
		       host_default_bank_name, host_default_bank_account, host_default_qr_payload, 
		       status, discount_type, discount_value, shipping_fee, 
		       is_split_batch, use_default_qr_for_all, batch_configs, password, created_at
		FROM sessions WHERE id = $1 FOR UPDATE`

	var s domain.Session
	err := r.db.QueryRow(ctx, query, id).Scan(
		&s.ID, &s.Slug, &s.RoomID, &s.Title, &s.HostDeviceID, &s.ShopLink,
		&s.HostDefaultBankName, &s.HostDefaultBankAccount, &s.HostDefaultQrPayload,
		&s.Status, &s.DiscountType, &s.DiscountValue, &s.ShippingFee,
		&s.IsSplitBatch, &s.UseDefaultQrForAll, &s.BatchConfigs, &s.Password, &s.CreatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get session by id for update: %w", err)
	}

	s.HasPassword = s.Password != nil && *s.Password != ""
	return &s, nil
}

func (r *postgresSessionRepository) GetBySlug(ctx context.Context, slug string) (*domain.Session, error) {
	query := `
		SELECT id, slug, room_id, title, host_device_id, shop_link, 
		       host_default_bank_name, host_default_bank_account, host_default_qr_payload, 
		       status, discount_type, discount_value, shipping_fee, 
		       is_split_batch, use_default_qr_for_all, batch_configs, password, created_at
		FROM sessions WHERE slug = $1 OR room_id = $1`

	var s domain.Session
	err := r.db.QueryRow(ctx, query, slug).Scan(
		&s.ID, &s.Slug, &s.RoomID, &s.Title, &s.HostDeviceID, &s.ShopLink,
		&s.HostDefaultBankName, &s.HostDefaultBankAccount, &s.HostDefaultQrPayload,
		&s.Status, &s.DiscountType, &s.DiscountValue, &s.ShippingFee,
		&s.IsSplitBatch, &s.UseDefaultQrForAll, &s.BatchConfigs, &s.Password, &s.CreatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get session by slug: %w", err)
	}

	s.HasPassword = s.Password != nil && *s.Password != ""
	return &s, nil
}

func (r *postgresSessionRepository) Update(ctx context.Context, s *domain.Session) error {
	query := `
		UPDATE sessions SET
			title = $1, shop_link = $2, 
			host_default_bank_name = $3, host_default_bank_account = $4, host_default_qr_payload = $5, 
			status = $6, discount_type = $7, discount_value = $8, shipping_fee = $9, 
			is_split_batch = $10, use_default_qr_for_all = $11, batch_configs = $12, password = $13
		WHERE id = $14`

	_, err := r.db.Exec(ctx, query,
		s.Title, s.ShopLink,
		s.HostDefaultBankName, s.HostDefaultBankAccount, s.HostDefaultQrPayload,
		s.Status, s.DiscountType, s.DiscountValue, s.ShippingFee,
		s.IsSplitBatch, s.UseDefaultQrForAll, s.BatchConfigs, s.Password,
		s.ID,
	)

	if err != nil {
		return fmt.Errorf("failed to update session: %w", err)
	}

	return nil
}

func (r *postgresSessionRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM sessions WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete session: %w", err)
	}
	return nil
}

func (r *postgresSessionRepository) ListByHost(ctx context.Context, hostDeviceID uuid.UUID) ([]domain.Session, error) {
	query := `
		SELECT id, slug, title, host_device_id, status, created_at
		FROM sessions WHERE host_device_id = $1 ORDER BY created_at DESC LIMIT 50`

	rows, err := r.db.Query(ctx, query, hostDeviceID)
	if err != nil {
		return nil, fmt.Errorf("failed to list sessions by host: %w", err)
	}
	defer rows.Close()

	var sessions []domain.Session
	for rows.Next() {
		var s domain.Session
		err := rows.Scan(&s.ID, &s.Slug, &s.Title, &s.HostDeviceID, &s.Status, &s.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan session: %w", err)
		}
		sessions = append(sessions, s)
	}
	return sessions, nil
}

func (r *postgresSessionRepository) ListByIDs(ctx context.Context, ids []uuid.UUID) ([]domain.Session, error) {
	if len(ids) == 0 {
		return []domain.Session{}, nil
	}
	query := `
		SELECT id, slug, title, host_device_id, status, created_at
		FROM sessions WHERE id = ANY($1) ORDER BY created_at DESC LIMIT 50`

	rows, err := r.db.Query(ctx, query, ids)
	if err != nil {
		return nil, fmt.Errorf("failed to list sessions by ids: %w", err)
	}
	defer rows.Close()

	var sessions []domain.Session
	for rows.Next() {
		var s domain.Session
		err := rows.Scan(&s.ID, &s.Slug, &s.Title, &s.HostDeviceID, &s.Status, &s.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan session: %w", err)
		}
		sessions = append(sessions, s)
	}
	return sessions, nil
}

func (r *postgresSessionRepository) CleanupOldSessions(ctx context.Context, days int) (int64, error) {
	query := `DELETE FROM sessions WHERE created_at < NOW() - $1 * INTERVAL '1 day'`
	result, err := r.db.Exec(ctx, query, days)
	if err != nil {
		return 0, fmt.Errorf("failed to cleanup old sessions: %w", err)
	}
	return result.RowsAffected(), nil
}
