package handler

import (
	"net/http"
	"strings"

	"milktea-server/internal/domain"
	"milktea-server/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type SessionHandler struct {
	svc service.SessionService
}

func NewSessionHandler(svc service.SessionService) *SessionHandler {
	return &SessionHandler{svc: svc}
}

func (h *SessionHandler) Create(c *gin.Context) {
	var req struct {
		domain.Session
		HostName string `json:"hostName"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	participant, err := h.svc.Create(c.Request.Context(), &req.Session, req.HostName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"session":     req.Session,
		"participant": participant,
	})
}

func (h *SessionHandler) GetByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid UUID"})
		return
	}

	session, err := h.svc.GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if session == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
		return
	}

	c.JSON(http.StatusOK, session)
}

func (h *SessionHandler) GetBySlug(c *gin.Context) {
	slug := c.Param("slug")
	session, err := h.svc.GetBySlug(c.Request.Context(), slug)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if session == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
		return
	}

	c.JSON(http.StatusOK, session)
}

func (h *SessionHandler) Update(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid UUID"})
		return
	}

	var session domain.Session
	if err := c.ShouldBindJSON(&session); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	session.ID = id

	if err := h.svc.Update(c.Request.Context(), &session); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, session)
}

func (h *SessionHandler) Delete(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid UUID"})
		return
	}

	if err := h.svc.Delete(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *SessionHandler) ListByHost(c *gin.Context) {
	hostDeviceIDStr := c.Query("hostDeviceId")
	hostDeviceID, err := uuid.Parse(hostDeviceIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid hostDeviceId"})
		return
	}

	sessions, err := h.svc.ListByHost(c.Request.Context(), hostDeviceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, sessions)
}

func (h *SessionHandler) ListByBatch(c *gin.Context) {
	idsStr := c.Query("ids")
	if idsStr == "" {
		c.JSON(http.StatusOK, []domain.Session{})
		return
	}

	idStrs := strings.Split(idsStr, ",")
	var ids []uuid.UUID
	for _, idStr := range idStrs {
		if id, err := uuid.Parse(idStr); err == nil {
			ids = append(ids, id)
		}
	}

	sessions, err := h.svc.ListByIDs(c.Request.Context(), ids)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, sessions)
}

func (h *SessionHandler) VerifyPassword(c *gin.Context) {
	slug := c.Param("slug")
	var req struct {
		Password string `json:"password"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	success, err := h.svc.VerifyPassword(c.Request.Context(), slug, req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if !success {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid password"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}
