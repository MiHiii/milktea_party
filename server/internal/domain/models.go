package domain

import (
	"time"

	"github.com/google/uuid"
)

const (
	SessionStatusOpen      = "open"
	SessionStatusLocked    = "locked"
	SessionStatusOrdered   = "ordered"
	SessionStatusSettling  = "settling"
	SessionStatusCompleted = "completed"
	SessionStatusCancelled = "cancelled"
)

type Session struct {
	ID                     uuid.UUID `json:"id" db:"id"`
	Slug                   string    `json:"slug" db:"slug"`
	RoomID                 string    `json:"roomId" db:"room_id"`
	Title                  string    `json:"title" db:"title"`
	HostDeviceID           uuid.UUID `json:"hostDeviceId" db:"host_device_id"`
	ShopLink               *string   `json:"shopLink" db:"shop_link"`
	HostDefaultBankName    *string   `json:"hostDefaultBankName" db:"host_default_bank_name"`
	HostDefaultBankAccount *string   `json:"hostDefaultBankAccount" db:"host_default_bank_account"`
	HostDefaultQrPayload   *string   `json:"hostDefaultQrPayload" db:"host_default_qr_payload"`
	Status                 string    `json:"status" db:"status"`
	DiscountType           string    `json:"discountType" db:"discount_type"`
	DiscountValue          int64     `json:"discountValue" db:"discount_value"`
	ShippingFee            int64     `json:"shippingFee" db:"shipping_fee"`
	IsSplitBatch           bool      `json:"isSplitBatch" db:"is_split_batch"`
	UseDefaultQrForAll     bool      `json:"useDefaultQrForAll" db:"use_default_qr_for_all"`
	BatchConfigs           []byte    `json:"batchConfigs" db:"batch_configs"` // JSONB
	Password               *string   `json:"password,omitempty" db:"password"` // Allow unmarshaling but hide if empty in responses
	HasPassword            bool      `json:"hasPassword" db:"-"`              // Virtual field
	AdminSecret            string    `json:"adminSecret,omitempty" db:"-"`    // Return only once on create
	AdminSecretHash        string    `json:"-" db:"admin_secret_hash"`        // Never expose in JSON
	CreatedAt              time.Time `json:"createdAt" db:"created_at"`
}

type Participant struct {
	ID         uuid.UUID `json:"id" db:"id"`
	SessionID  uuid.UUID `json:"sessionId" db:"session_id"`
	DeviceID   uuid.UUID `json:"deviceId" db:"device_id"`
	Name       string    `json:"name" db:"name"`
	IsHost     bool      `json:"isHost" db:"is_host"`
	IsPaid     bool      `json:"isPaid" db:"is_paid"`
	LastActive time.Time `json:"lastActive" db:"last_active"`
}

type OrderBatch struct {
	ID          uuid.UUID `json:"id" db:"id"`
	SessionID   uuid.UUID `json:"sessionId" db:"session_id"`
	Name        string    `json:"name" db:"name"`
	BankName    *string   `json:"bankName" db:"bank_name"`
	BankAccount *string   `json:"bankAccount" db:"bank_account"`
	QrPayload   *string   `json:"qrPayload" db:"qr_payload"`
	Status      string    `json:"status" db:"status"`
	IsDefault   bool      `json:"isDefault" db:"is_default"`
	SortOrder   int       `json:"sortOrder" db:"sort_order"`
	CreatedAt   time.Time `json:"createdAt" db:"created_at"`
}

type OrderItem struct {
	ID            uuid.UUID  `json:"id" db:"id"`
	ParticipantID uuid.UUID  `json:"participantId" db:"participant_id" binding:"required"`
	SessionID     uuid.UUID  `json:"sessionId" db:"session_id" binding:"required"`
	OrderBatchID  *uuid.UUID `json:"orderBatchId" db:"order_batch_id"`
	ItemName      string     `json:"itemName" db:"item_name" binding:"required"`
	Price         int64      `json:"price" db:"price" binding:"min=0"`
	Quantity      int        `json:"quantity" db:"quantity" binding:"required,gt=0"`
	Note          *string    `json:"note" db:"note"`
	Ice           *string    `json:"ice" db:"ice"`
	Sugar         *string    `json:"sugar" db:"sugar"`
	PaySeparate   bool       `json:"paySeparate" db:"pay_separate"`
	CreatedAt     time.Time  `json:"createdAt" db:"created_at"`
}
