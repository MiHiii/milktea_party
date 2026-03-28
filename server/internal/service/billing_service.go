package service

import (
	"context"
	"fmt"
	"time"

	"milktea-server/internal/domain"
	"milktea-server/internal/repository"
	"milktea-server/pkg/utils"
	"github.com/google/uuid"
)

type billingService struct {
	repo repository.SessionRepository
}

func NewBillingService(repo repository.SessionRepository) BillingService {
	return &billingService{repo: repo}
}

func (s *billingService) Calculate(ctx context.Context, sessionID uuid.UUID) (*domain.BillResult, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	// 1. Fetch all necessary data
	session, err := s.repo.GetByID(ctx, sessionID)
	if err != nil {
		return nil, err
	}
	if session == nil {
		return nil, fmt.Errorf("session not found")
	}

	participants, err := s.repo.ParticipantRepo().GetBySessionID(ctx, sessionID)
	if err != nil {
		return nil, err
	}

	items, err := s.repo.OrderItemRepo().GetBySessionID(ctx, sessionID)
	if err != nil {
		return nil, err
	}

	batches, err := s.repo.OrderBatchRepo().GetBySessionID(ctx, sessionID)
	if err != nil {
		return nil, err
	}

	batchMap := make(map[uuid.UUID]domain.OrderBatch)
	for _, b := range batches {
		batchMap[b.ID] = b
	}

	// 2. Group items
	// Group 0: pay_separate = true
	// Groups by BatchID: pay_separate = false
	paySeparateItems := []domain.OrderItem{}
	batchGroups := make(map[string][]domain.OrderItem) // string key for uuid or "default"

	for _, item := range items {
		if item.PaySeparate {
			paySeparateItems = append(paySeparateItems, item)
			continue
		}

		groupKey := "default"
		if item.OrderBatchID != nil {
			groupKey = item.OrderBatchID.String()
		}
		batchGroups[groupKey] = append(batchGroups[groupKey], item)
	}

	// 3. Initialize Result
	result := &domain.BillResult{
		SessionID:    sessionID,
		Participants: []domain.ParticipantBill{},
	}

	participantBillMap := make(map[uuid.UUID]*domain.ParticipantBill)
	for _, p := range participants {
		pb := &domain.ParticipantBill{
			ParticipantID: p.ID,
			Name:          p.Name,
			IsHost:        p.IsHost,
			Items:         []domain.BillItem{},
		}
		participantBillMap[p.ID] = pb
	}

	var totalActual int64 = 0
	var totalCalculated int64 = 0
	var globalResidual int64 = 0

	// 4. Calculate Pay Separate Group (No fees)
	for _, item := range paySeparateItems {
		rounded := utils.Round1000(float64(item.Price * int64(item.Quantity)))
		billItem := domain.BillItem{
			ItemID:        item.ID,
			ItemName:      item.ItemName,
			Price:         item.Price,
			Quantity:      item.Quantity,
			RawPrice:      float64(item.Price * int64(item.Quantity)),
			RoundedPrice:  rounded,
			IsPaySeparate: true,
		}
		if item.OrderBatchID != nil {
			if b, ok := batchMap[*item.OrderBatchID]; ok {
				billItem.BatchName = b.Name
			}
		}

		if pb, ok := participantBillMap[item.ParticipantID]; ok {
			pb.Items = append(pb.Items, billItem)
			pb.Subtotal += rounded
		}
		totalActual += int64(billItem.RawPrice)
		totalCalculated += rounded
	}

	// 5. Calculate Batch Groups (With allocation)
	for groupKey, groupItems := range batchGroups {
		var discount int64 = 0
		var ship int64 = 0
		var batchName = "Mặc định"

		// Identify fee source
		if session.IsSplitBatch && groupKey != "default" {
			batchID, _ := uuid.Parse(groupKey)
			if b, ok := batchMap[batchID]; ok {
				discount = b.DiscountAmount
				ship = b.ShippingFee
				batchName = b.Name
			}
		} else if !session.IsSplitBatch {
			// Calculate discount for entire session if not percentage
			ship = session.ShippingFee
			if session.DiscountType == "amount" {
				discount = session.DiscountValue
			} else {
				// percentage
				var tBase int64 = 0
				for _, it := range groupItems {
					tBase += it.Price * int64(it.Quantity)
				}
				discount = tBase * session.DiscountValue / 100
			}
		}

		// Calculate T_base for this group
		var tBaseBatch int64 = 0
		for _, it := range groupItems {
			tBaseBatch += it.Price * int64(it.Quantity)
		}

		if tBaseBatch == 0 {
			continue
		}

		// Proportional Allocation
		// K = (Ship - Discount) / T_base
		k := float64(ship-discount) / float64(tBaseBatch)
		
		var batchCalculatedSum int64 = 0
		for _, item := range groupItems {
			raw := float64(item.Price*int64(item.Quantity)) * (1 + k)
			rounded := utils.Round1000(raw)
			
			billItem := domain.BillItem{
				ItemID:        item.ID,
				ItemName:      item.ItemName,
				Price:         item.Price,
				Quantity:      item.Quantity,
				RawPrice:      raw,
				RoundedPrice:  rounded,
				IsPaySeparate: false,
				BatchName:     batchName,
			}

			if pb, ok := participantBillMap[item.ParticipantID]; ok {
				pb.Items = append(pb.Items, billItem)
				pb.Subtotal += rounded
			}
			batchCalculatedSum += rounded
		}

		batchActual := tBaseBatch - discount + ship
		residual := batchActual - batchCalculatedSum
		globalResidual += residual
		
		totalActual += batchActual
		totalCalculated += batchCalculatedSum
	}

	// 6. Assign residual to Host and Finalize
	for _, pb := range participantBillMap {
		if pb.IsHost {
			pb.Residual = globalResidual
			pb.FinalAmount = pb.Subtotal + pb.Residual
		} else {
			pb.FinalAmount = pb.Subtotal
		}
		result.Participants = append(result.Participants, *pb)
	}

	result.ActualTotal = totalActual
	result.CalculatedTotal = totalCalculated
	result.GlobalResidual = globalResidual

	return result, nil
}
