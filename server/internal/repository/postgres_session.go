package repository

import (
	"context"
	"fmt"

	"milktea-server/internal/domain"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

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

	defer tx.Rollback(ctx)

	txRepo := &postgresSessionRepository{
		db:   tx,
		pool: r.pool,
	}

	if err := fn(txRepo); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (r *postgresSessionRepository) ParticipantRepo() ParticipantRepository {
	return &postgresParticipantRepository{db: r.db, pool: r.pool}
}

func (r *postgresSessionRepository) OrderBatchRepo() OrderBatchRepository {
	return &postgresOrderBatchRepository{db: r.db, pool: r.pool}
}

func (r *postgresSessionRepository) OrderItemRepo() OrderItemRepository {
	return &postgresOrderItemRepository{db: r.db, pool: r.pool}
}

func (r *postgresSessionRepository) Create(ctx context.Context, s *domain.Session) error {
	query := `
		INSERT INTO sessions (
			slug, room_id, title, host_device_id, shop_link, 
			host_default_bank_name, host_default_bank_account, host_default_qr_payload, 
			status, discount_type, discount_value, shipping_fee, is_split_batch, 
			use_default_qr_for_all, batch_configs, password, admin_secret_hash, host_last_active
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
		RETURNING id, created_at`

	return r.db.QueryRow(ctx, query,
		s.Slug, s.RoomID, s.Title, s.HostDeviceID, s.ShopLink,
		s.HostDefaultBankName, s.HostDefaultBankAccount, s.HostDefaultQrPayload,
		s.Status, s.DiscountType, s.DiscountValue, s.ShippingFee, s.IsSplitBatch,
		s.UseDefaultQrForAll, s.BatchConfigs, s.Password, s.AdminSecretHash,
	).Scan(&s.ID, &s.CreatedAt)
}

func (r *postgresSessionRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Session, error) {
	query := `
		SELECT id, slug, room_id, title, host_device_id, shop_link, 
			host_default_bank_name, host_default_bank_account, host_default_qr_payload, 
			status, discount_type, discount_value, shipping_fee, is_split_batch, 
			use_default_qr_for_all, batch_configs, password, admin_secret_hash, host_last_active, created_at
		FROM sessions WHERE id = $1`

	var s domain.Session
	err := r.db.QueryRow(ctx, query, id).Scan(
		&s.ID, &s.Slug, &s.RoomID, &s.Title, &s.HostDeviceID, &s.ShopLink,
		&s.HostDefaultBankName, &s.HostDefaultBankAccount, &s.HostDefaultQrPayload,
		&s.Status, &s.DiscountType, &s.DiscountValue, &s.ShippingFee, &s.IsSplitBatch,
		&s.UseDefaultQrForAll, &s.BatchConfigs, &s.Password, &s.AdminSecretHash, &s.HostLastActive, &s.CreatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get session: %w", err)
	}

	return &s, nil
}

func (r *postgresSessionRepository) GetByIDForUpdate(ctx context.Context, id uuid.UUID) (*domain.Session, error) {
	query := `
		SELECT id, slug, room_id, title, host_device_id, shop_link, 
			host_default_bank_name, host_default_bank_account, host_default_qr_payload, 
			status, discount_type, discount_value, shipping_fee, is_split_batch, 
			use_default_qr_for_all, batch_configs, password, admin_secret_hash, host_last_active, created_at
		FROM sessions WHERE id = $1 FOR UPDATE`

	var s domain.Session
	err := r.db.QueryRow(ctx, query, id).Scan(
		&s.ID, &s.Slug, &s.RoomID, &s.Title, &s.HostDeviceID, &s.ShopLink,
		&s.HostDefaultBankName, &s.HostDefaultBankAccount, &s.HostDefaultQrPayload,
		&s.Status, &s.DiscountType, &s.DiscountValue, &s.ShippingFee, &s.IsSplitBatch,
		&s.UseDefaultQrForAll, &s.BatchConfigs, &s.Password, &s.AdminSecretHash, &s.HostLastActive, &s.CreatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get session for update: %w", err)
	}

	return &s, nil
}

func (r *postgresSessionRepository) GetBySlug(ctx context.Context, slug string) (*domain.Session, error) {
	query := `
		SELECT id, slug, room_id, title, host_device_id, shop_link, 
			host_default_bank_name, host_default_bank_account, host_default_qr_payload, 
			status, discount_type, discount_value, shipping_fee, is_split_batch, 
			use_default_qr_for_all, batch_configs, password, admin_secret_hash, host_last_active, created_at
		FROM sessions WHERE slug = $1 OR room_id = $1`

	var s domain.Session
	err := r.db.QueryRow(ctx, query, slug).Scan(
		&s.ID, &s.Slug, &s.RoomID, &s.Title, &s.HostDeviceID, &s.ShopLink,
		&s.HostDefaultBankName, &s.HostDefaultBankAccount, &s.HostDefaultQrPayload,
		&s.Status, &s.DiscountType, &s.DiscountValue, &s.ShippingFee, &s.IsSplitBatch,
		&s.UseDefaultQrForAll, &s.BatchConfigs, &s.Password, &s.AdminSecretHash, &s.HostLastActive, &s.CreatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get session by slug: %w", err)
	}

	return &s, nil
}

func (r *postgresSessionRepository) Update(ctx context.Context, s *domain.Session) error {
	query := `
		UPDATE sessions SET 
			title = $1, shop_link = $2, host_default_bank_name = $3, 
			host_default_bank_account = $4, host_default_qr_payload = $5, 
			status = $6, discount_type = $7, discount_value = $8, 
			shipping_fee = $9, is_split_batch = $10, use_default_qr_for_all = $11, 
			batch_configs = $12, password = $13, host_device_id = $14
		WHERE id = $15`

	_, err := r.db.Exec(ctx, query,
		s.Title, s.ShopLink, s.HostDefaultBankName,
		s.HostDefaultBankAccount, s.HostDefaultQrPayload,
		s.Status, s.DiscountType, s.DiscountValue,
		s.ShippingFee, s.IsSplitBatch, s.UseDefaultQrForAll,
		s.BatchConfigs, s.Password, s.HostDeviceID, s.ID,
	)

	if err != nil {
		return fmt.Errorf("failed to update session: %w", err)
	}

	return nil
}

func (r *postgresSessionRepository) UpdateHostLastActive(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE sessions SET host_last_active = NOW() WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id)
	return err
}

func (r *postgresSessionRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM sessions WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id)
	return err
}

func (r *postgresSessionRepository) ListByHost(ctx context.Context, hostDeviceID uuid.UUID) ([]domain.Session, error) {
	query := `
		SELECT id, slug, room_id, title, host_device_id, shop_link, 
			host_default_bank_name, host_default_bank_account, host_default_qr_payload, 
			status, discount_type, discount_value, shipping_fee, is_split_batch, 
			use_default_qr_for_all, batch_configs, password, admin_secret_hash, host_last_active, created_at
		FROM sessions WHERE host_device_id = $1 ORDER BY created_at DESC`

	rows, err := r.db.Query(ctx, query, hostDeviceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	sessions := []domain.Session{}
	for rows.Next() {
		var s domain.Session
		err := rows.Scan(
			&s.ID, &s.Slug, &s.RoomID, &s.Title, &s.HostDeviceID, &s.ShopLink,
			&s.HostDefaultBankName, &s.HostDefaultBankAccount, &s.HostDefaultQrPayload,
			&s.Status, &s.DiscountType, &s.DiscountValue, &s.ShippingFee, &s.IsSplitBatch,
			&s.UseDefaultQrForAll, &s.BatchConfigs, &s.Password, &s.AdminSecretHash, &s.HostLastActive, &s.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		sessions = append(sessions, s)
	}
	return sessions, nil
}

func (r *postgresSessionRepository) ListByIDs(ctx context.Context, ids []uuid.UUID) ([]domain.Session, error) {
	query := `
		SELECT id, slug, room_id, title, host_device_id, shop_link, 
			host_default_bank_name, host_default_bank_account, host_default_qr_payload, 
			status, discount_type, discount_value, shipping_fee, is_split_batch, 
			use_default_qr_for_all, batch_configs, password, admin_secret_hash, host_last_active, created_at
		FROM sessions WHERE id = ANY($1) ORDER BY created_at DESC`

	rows, err := r.db.Query(ctx, query, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	sessions := []domain.Session{}
	for rows.Next() {
		var s domain.Session
		err := rows.Scan(
			&s.ID, &s.Slug, &s.RoomID, &s.Title, &s.HostDeviceID, &s.ShopLink,
			&s.HostDefaultBankName, &s.HostDefaultBankAccount, &s.HostDefaultQrPayload,
			&s.Status, &s.DiscountType, &s.DiscountValue, &s.ShippingFee, &s.IsSplitBatch,
			&s.UseDefaultQrForAll, &s.BatchConfigs, &s.Password, &s.AdminSecretHash, &s.HostLastActive, &s.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		sessions = append(sessions, s)
	}
	return sessions, nil
}

func (r *postgresSessionRepository) CleanupOldSessions(ctx context.Context, days int) (int64, error) {
	query := `DELETE FROM sessions WHERE created_at < NOW() - $1 * INTERVAL '1 day' AND status IN ('completed', 'cancelled')`
	result, err := r.db.Exec(ctx, query, days)
	if err != nil {
		return 0, fmt.Errorf("failed to cleanup old sessions: %w", err)
	}
	return result.RowsAffected(), nil
}
