package service

import (
	"context"
	"fmt"
	"math"
	"time"

	"milktea-server/internal/domain"
	"milktea-server/internal/repository"
	"github.com/google/uuid"
)

type billingService struct {
	sessionRepo repository.SessionRepository
	partRepo    repository.ParticipantRepository
	itemRepo    repository.OrderItemRepository
	batchRepo   repository.OrderBatchRepository
}

func NewBillingService(
	sessionRepo repository.SessionRepository,
	partRepo repository.ParticipantRepository,
	itemRepo repository.OrderItemRepository,
	batchRepo repository.OrderBatchRepository,
) BillingService {
	return &billingService{
		sessionRepo: sessionRepo,
		partRepo:    partRepo,
		itemRepo:    itemRepo,
		batchRepo:   batchRepo,
	}
}

func (s *billingService) Calculate(ctx context.Context, sessionID uuid.UUID) (*domain.BillResult, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	// 1. Fetch all data
	session, err := s.sessionRepo.GetByID(ctx, sessionID)
	if err != nil {
		return nil, err
	}
	if session == nil {
		return nil, fmt.Errorf("session not found")
	}

	participants, err := s.partRepo.GetBySessionID(ctx, sessionID)
	if err != nil {
		return nil, err
	}

	items, err := s.itemRepo.GetBySessionID(ctx, sessionID)
	if err != nil {
		return nil, err
	}

	batches, err := s.batchRepo.GetBySessionID(ctx, sessionID)
	if err != nil {
		return nil, err
	}

	// 2. Run Engine logic
	return CalculateBill(session, participants, items, batches), nil
}

// Round1000 rounds an amount to the nearest 1000 VND.
// Formula: floor((x + 500) / 1000) * 1000
func Round1000(amount float64) int64 {
	return int64(math.Floor((amount+500)/1000)) * 1000
}

// CalculateBill implements TTD-00004 v2.0 Billing Engine logic.
func CalculateBill(
	session *domain.Session,
	participants []domain.Participant,
	items []domain.OrderItem,
	batches []domain.OrderBatch,
) *domain.BillResult {
	
	result := &domain.BillResult{
		SessionID:    session.ID,
		Participants: make([]domain.ParticipantBill, len(participants)),
	}

	// 1. Group items by Batch or Pay Separate
	batchItems := make(map[uuid.UUID][]domain.OrderItem)
	paySeparateItems := []domain.OrderItem{}

	for _, item := range items {
		if item.PaySeparate {
			paySeparateItems = append(paySeparateItems, item)
		} else {
			key := uuid.Nil
			if item.OrderBatchID != nil {
				key = *item.OrderBatchID
			}
			batchItems[key] = append(batchItems[key], item)
		}
	}

	// 2. Track results per item
	calculatedItems := make(map[uuid.UUID]domain.BillItem)

	// Step 2: Pay Separate Group
	for _, item := range paySeparateItems {
		baseTotal := float64(item.Price * int64(item.Quantity))
		rounded := Round1000(baseTotal)
		
		calculatedItems[item.ID] = domain.BillItem{
			ItemID:        item.ID,
			ItemName:      item.ItemName,
			Price:         item.Price,
			Quantity:      item.Quantity,
			RawPrice:      baseTotal,
			RoundedPrice:  rounded,
			IsPaySeparate: true,
		}
		result.ActualTotal += int64(baseTotal)
		result.CalculatedTotal += rounded
	}

	// Step 3: Allocation per Batch
	totalResidual := int64(0)

	// If not split batch, treat all non-separate items as one virtual batch
	if !session.IsSplitBatch {
		processBatch(session.ShippingFee, getSessionDiscountAmount(session, batchItems[uuid.Nil]), batchItems[uuid.Nil], calculatedItems, &result.ActualTotal, &result.CalculatedTotal, &totalResidual)
	} else {
		// Split batch: Process each defined batch
		for _, b := range batches {
			processBatch(b.ShippingFee, b.DiscountAmount, batchItems[b.ID], calculatedItems, &result.ActualTotal, &result.CalculatedTotal, &totalResidual)
		}
		// Handle items in "Nil" batch if any (items not assigned to a batch while in split mode)
		if len(batchItems[uuid.Nil]) > 0 {
			processBatch(0, 0, batchItems[uuid.Nil], calculatedItems, &result.ActualTotal, &result.CalculatedTotal, &totalResidual)
		}
	}

	result.GlobalResidual = totalResidual

	// Step 4: Aggregate into Participant Bills
	for idx, p := range participants {
		pBill := domain.ParticipantBill{
			ParticipantID: p.ID,
			Name:          p.Name,
			IsHost:        p.IsHost,
			Items:         []domain.BillItem{},
		}

		subtotal := int64(0)
		for _, item := range items {
			if item.ParticipantID == p.ID {
				calc := calculatedItems[item.ID]
				pBill.Items = append(pBill.Items, calc)
				subtotal += calc.RoundedPrice
			}
		}

		pBill.Subtotal = subtotal
		if p.IsHost {
			pBill.Residual = totalResidual
			pBill.FinalAmount = subtotal + totalResidual
		} else {
			pBill.FinalAmount = subtotal
		}

		result.Participants[idx] = pBill
	}

	return result
}

func processBatch(
	ship int64,
	discount int64,
	items []domain.OrderItem,
	calcMap map[uuid.UUID]domain.BillItem,
	actualTotal *int64,
	calcTotal *int64,
	residualTotal *int64,
) {
	tBase := int64(0)
	for _, item := range items {
		tBase += item.Price * int64(item.Quantity)
	}

	netFee := ship - discount
	*actualTotal += tBase + netFee

	if tBase == 0 {
		*residualTotal += netFee
		return
	}

	batchRoundedSum := int64(0)
	for _, item := range items {
		itemBase := float64(item.Price * int64(item.Quantity))
		shareRatio := itemBase / float64(tBase)
		
		raw := itemBase + (float64(netFee) * shareRatio)
		rounded := Round1000(raw)
		
		calcMap[item.ID] = domain.BillItem{
			ItemID:       item.ID,
			ItemName:     item.ItemName,
			Price:        item.Price,
			Quantity:     item.Quantity,
			RawPrice:     raw,
			RoundedPrice: rounded,
		}
		batchRoundedSum += rounded
	}

	*calcTotal += batchRoundedSum
	*residualTotal += (tBase + netFee) - batchRoundedSum
}

func getSessionDiscountAmount(s *domain.Session, items []domain.OrderItem) int64 {
	if s.DiscountType == "amount" {
		return s.DiscountValue
	}
	if s.DiscountType == "percentage" {
		gross := int64(0)
		for _, i := range items {
			gross += i.Price * int64(i.Quantity)
		}
		return int64(math.Round(float64(gross*s.DiscountValue) / 100.0))
	}
	return 0
}
