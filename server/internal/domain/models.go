package domain

import (
	"time"

	"github.com/google/uuid"
)

type Session struct {
	ID                     uuid.UUID `json:"id" db:"id"`
	Slug                   string    `json:"slug" db:"slug"`
	RoomID                 string    `json:"room_id" db:"room_id"`
	Title                  string    `json:"title" db:"title"`
	HostDeviceID           uuid.UUID `json:"host_device_id" json:"hostDeviceId" db:"host_device_id"`
	ShopLink               *string   `json:"shop_link" db:"shop_link"`
	HostDefaultBankName    *string   `json:"host_default_bank_name" db:"host_default_bank_name"`
	HostDefaultBankAccount *string   `json:"host_default_bank_account" db:"host_default_bank_account"`
	HostDefaultQrPayload   *string   `json:"host_default_qr_payload" db:"host_default_qr_payload"`
	Status                 string    `json:"status" db:"status"`
	DiscountType           string    `json:"discount_type" db:"discount_type"`
	DiscountValue          int64     `json:"discount_value" db:"discount_value"`
	ShippingFee            int64     `json:"shipping_fee" db:"shipping_fee"`
	IsSplitBatch           bool      `json:"is_split_batch" db:"is_split_batch"`
	UseDefaultQrForAll     bool      `json:"use_default_qr_for_all" db:"use_default_qr_for_all"`
	BatchConfigs           []byte    `json:"batch_configs" db:"batch_configs"` // JSONB
	Password               *string   `json:"-" db:"password"`                  // Never expose password in JSON
	HasPassword            bool      `json:"has_password" db:"-"`              // Virtual field
	CreatedAt              time.Time `json:"created_at" db:"created_at"`
}

type Participant struct {
	ID         uuid.UUID `json:"id" db:"id"`
	SessionID  uuid.UUID `json:"session_id" db:"session_id"`
	Name       string    `json:"name" db:"name"`
	IsHost     bool      `json:"is_host" db:"is_host"`
	IsPaid     bool      `json:"is_paid" db:"is_paid"`
	LastActive time.Time `json:"last_active" db:"last_active"`
}

type OrderBatch struct {
	ID          uuid.UUID `json:"id" db:"id"`
	SessionID   uuid.UUID `json:"session_id" db:"session_id"`
	Name        string    `json:"name" db:"name"`
	BankName    *string   `json:"bank_name" db:"bank_name"`
	BankAccount *string   `json:"bank_account" db:"bank_account"`
	QrPayload   *string   `json:"qr_payload" db:"qr_payload"`
	Status      string    `json:"status" db:"status"`
	IsDefault   bool      `json:"is_default" db:"is_default"`
	SortOrder   int       `json:"sort_order" db:"sort_order"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

type OrderItem struct {
	ID            uuid.UUID `json:"id" db:"id"`
	ParticipantID uuid.UUID `json:"participant_id" db:"participant_id"`
	SessionID     uuid.UUID `json:"session_id" db:"session_id"`
	OrderBatchID  *uuid.UUID `json:"order_batch_id" db:"order_batch_id"`
	ItemName      string    `json:"item_name" db:"item_name"`
	Price         int64     `json:"price" db:"price"`
	Quantity      int       `json:"quantity" db:"quantity"`
	Note          *string   `json:"note" db:"note"`
	Ice           *string   `json:"ice" db:"ice"`
	Sugar         *string   `json:"sugar" db:"sugar"`
	PaySeparate   bool      `json:"pay_separate" db:"pay_separate"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
}
