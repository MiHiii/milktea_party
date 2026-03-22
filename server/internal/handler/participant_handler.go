package handler

import (
	"milktea-server/internal/middleware"
	"net/http"

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
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Use device ID from middleware
	p.DeviceID = middleware.GetDeviceID(c)

	if err := h.svc.Create(c.Request.Context(), &p); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, p)
}

func (h *ParticipantHandler) GetBySessionID(c *gin.Context) {
	sessionIDStr := c.Param("sessionId")
	sessionID, err := uuid.Parse(sessionIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid session ID"})
		return
	}

	participants, err := h.svc.GetBySessionID(c.Request.Context(), sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, participants)
}

func (h *ParticipantHandler) Heartbeat(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	if err := h.svc.UpdateLastActive(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}
