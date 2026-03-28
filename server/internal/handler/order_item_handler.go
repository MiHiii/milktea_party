package handler

import (
	"net/http"
	"strings"

	"milktea-server/internal/domain"
	"milktea-server/internal/middleware"
	"milktea-server/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type OrderItemHandler struct {
	svc service.OrderItemService
}

func NewOrderItemHandler(svc service.OrderItemService) *OrderItemHandler {
	return &OrderItemHandler{svc: svc}
}

func (h *OrderItemHandler) Create(c *gin.Context) {
	var item domain.OrderItem
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_FAILED",
				"message": err.Error(),
			},
		})
		return
	}

	idempotencyKey := c.GetHeader("Idempotency-Key")

	if err := h.svc.Create(c.Request.Context(), &item, idempotencyKey); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{
				"code":    "PROCESS_FAILED",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": item})
}

func (h *OrderItemHandler) GetBySessionID(c *gin.Context) {
	sessionIDStr := c.Param("sessionId")
	sessionID, err := uuid.Parse(sessionIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "INVALID_ID",
				"message": "Invalid session ID",
			},
		})
		return
	}

	items, err := h.svc.GetBySessionID(c.Request.Context(), sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": err.Error(),
			},
		})
		return
	}

	if items == nil {
		items = []domain.OrderItem{}
	}

	c.JSON(http.StatusOK, gin.H{"data": items})
}

func (h *OrderItemHandler) Update(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "INVALID_ID",
				"message": "Invalid ID",
			},
		})
		return
	}

	var item domain.OrderItem
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_FAILED",
				"message": err.Error(),
			},
		})
		return
	}
	item.ID = id

	deviceID := middleware.GetDeviceID(c)
	idempotencyKey := c.GetHeader("Idempotency-Key")

	if err := h.svc.Update(c.Request.Context(), &item, deviceID, idempotencyKey); err != nil {
		status := http.StatusUnprocessableEntity
		code := "PROCESS_FAILED"
		if strings.Contains(err.Error(), "unauthorized") {
			status = http.StatusForbidden
			code = "FORBIDDEN"
		} else if strings.Contains(err.Error(), "not found") {
			status = http.StatusNotFound
			code = "NOT_FOUND"
		}

		c.JSON(status, gin.H{
			"error": gin.H{
				"code":    code,
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": item})
}

func (h *OrderItemHandler) Delete(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "INVALID_ID",
				"message": "Invalid ID",
			},
		})
		return
	}

	deviceID := middleware.GetDeviceID(c)
	idempotencyKey := c.GetHeader("Idempotency-Key")

	if err := h.svc.Delete(c.Request.Context(), id, deviceID, idempotencyKey); err != nil {
		status := http.StatusInternalServerError
		code := "INTERNAL_ERROR"
		if strings.Contains(err.Error(), "unauthorized") {
			status = http.StatusForbidden
			code = "FORBIDDEN"
		}

		c.JSON(status, gin.H{
			"error": gin.H{
				"code":    code,
				"message": err.Error(),
			},
		})
		return
	}

	c.Status(http.StatusNoContent)
}
