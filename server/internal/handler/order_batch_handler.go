package handler

import (
	"net/http"

	"milktea-server/internal/domain"
	"milktea-server/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type OrderBatchHandler struct {
	svc service.OrderBatchService
}

func NewOrderBatchHandler(svc service.OrderBatchService) *OrderBatchHandler {
	return &OrderBatchHandler{svc: svc}
}

func (h *OrderBatchHandler) Create(c *gin.Context) {
	var batch domain.OrderBatch
	if err := c.ShouldBindJSON(&batch); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_FAILED",
				"message": err.Error(),
			},
		})
		return
	}

	if err := h.svc.Create(c.Request.Context(), &batch); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": batch})
}

func (h *OrderBatchHandler) GetBySessionID(c *gin.Context) {
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

	batches, err := h.svc.GetBySessionID(c.Request.Context(), sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": err.Error(),
			},
		})
		return
	}

	if batches == nil {
		batches = []domain.OrderBatch{}
	}

	c.JSON(http.StatusOK, gin.H{"data": batches})
}

func (h *OrderBatchHandler) Update(c *gin.Context) {
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

	var batch domain.OrderBatch
	if err := c.ShouldBindJSON(&batch); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_FAILED",
				"message": err.Error(),
			},
		})
		return
	}
	batch.ID = id

	if err := h.svc.Update(c.Request.Context(), &batch); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": batch})
}

func (h *OrderBatchHandler) Delete(c *gin.Context) {
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

	if err := h.svc.Delete(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": err.Error(),
			},
		})
		return
	}

	c.Status(http.StatusNoContent)
}
