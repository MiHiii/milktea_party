package handler

import (
	"milktea-server/internal/middleware"
	"net/http"
	"strings"

	"milktea-server/internal/domain"
	"milktea-server/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ParticipantHandler struct {
	svc service.ParticipantService
}

func NewParticipantHandler(svc service.ParticipantService) *ParticipantHandler {
	return &ParticipantHandler{svc: svc}
}

func (h *ParticipantHandler) Create(c *gin.Context) {
	var p domain.Participant
	if err := c.ShouldBindJSON(&p); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_FAILED",
				"message": err.Error(),
			},
		})
		return
	}

	// Use device ID from middleware
	p.DeviceID = middleware.GetDeviceID(c)

	if err := h.svc.Create(c.Request.Context(), &p); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{
				"code":    "PROCESS_FAILED",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": p})
}

func (h *ParticipantHandler) GetBySessionID(c *gin.Context) {
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

	participants, err := h.svc.GetBySessionID(c.Request.Context(), sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": err.Error(),
			},
		})
		return
	}

	if participants == nil {
		participants = []domain.Participant{}
	}

	c.JSON(http.StatusOK, gin.H{"data": participants})
}

func (h *ParticipantHandler) Heartbeat(c *gin.Context) {
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

	if err := h.svc.UpdateLastActive(c.Request.Context(), id, deviceID); err != nil {
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

	c.Status(http.StatusNoContent)
}
