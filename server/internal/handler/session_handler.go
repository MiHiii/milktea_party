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
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_FAILED",
				"message": err.Error(),
			},
		})
		return
	}

	// Use device ID from middleware
	deviceID := middleware.GetDeviceID(c)
	req.Session.HostDeviceID = deviceID

	participant, err := h.svc.Create(c.Request.Context(), &req.Session, req.HostName)
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{
				"code":    "PROCESS_FAILED",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data": gin.H{
			"session":     req.Session,
			"participant": participant,
		},
	})
}

func (h *SessionHandler) GetByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "INVALID_ID",
				"message": "Invalid UUID",
			},
		})
		return
	}

	session, err := h.svc.GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": err.Error(),
			},
		})
		return
	}

	if session == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "Session not found",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": session})
}

func (h *SessionHandler) GetBySlug(c *gin.Context) {
	slug := c.Param("slug")
	session, err := h.svc.GetBySlug(c.Request.Context(), slug)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": err.Error(),
			},
		})
		return
	}

	if session == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "Session not found",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": session})
}

func (h *SessionHandler) Update(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "INVALID_ID",
				"message": "Invalid UUID",
			},
		})
		return
	}

	var session domain.Session
	if err := c.ShouldBindJSON(&session); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_FAILED",
				"message": err.Error(),
			},
		})
		return
	}
	session.ID = id

	// Get device ID from middleware to prevent IDOR
	deviceID := middleware.GetDeviceID(c)

	if err := h.svc.Update(c.Request.Context(), &session, deviceID); err != nil {
		status := http.StatusUnprocessableEntity
		code := "PROCESS_FAILED"
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

	c.JSON(http.StatusOK, gin.H{"data": session})
}

func (h *SessionHandler) Delete(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "INVALID_ID",
				"message": "Invalid UUID",
			},
		})
		return
	}

	// Get device ID from middleware to prevent IDOR
	deviceID := middleware.GetDeviceID(c)

	if err := h.svc.Delete(c.Request.Context(), id, deviceID); err != nil {
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

func (h *SessionHandler) ListByHost(c *gin.Context) {
	// Prioritize device ID from middleware, fallback to query param
	hostDeviceID := middleware.GetDeviceID(c)

	if hostDeviceID == uuid.Nil {
		hostDeviceIDStr := c.Query("host_device_id")
		var err error
		hostDeviceID, err = uuid.Parse(hostDeviceIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{
					"code":    "INVALID_ID",
					"message": "Invalid host_device_id",
				},
			})
			return
		}
	}

	sessions, err := h.svc.ListByHost(c.Request.Context(), hostDeviceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": err.Error(),
			},
		})
		return
	}

	if sessions == nil {
		sessions = []domain.Session{}
	}

	c.JSON(http.StatusOK, gin.H{"data": sessions})
}

func (h *SessionHandler) ListByBatch(c *gin.Context) {
	idsStr := c.Query("ids")
	if idsStr == "" {
		c.JSON(http.StatusOK, gin.H{"data": []domain.Session{}})
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
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": err.Error(),
			},
		})
		return
	}

	if sessions == nil {
		sessions = []domain.Session{}
	}

	c.JSON(http.StatusOK, gin.H{"data": sessions})
}

func (h *SessionHandler) VerifyPassword(c *gin.Context) {
	slug := c.Param("slug")
	var req struct {
		Password string `json:"password"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_FAILED",
				"message": err.Error(),
			},
		})
		return
	}

	success, err := h.svc.VerifyPassword(c.Request.Context(), slug, req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": err.Error(),
			},
		})
		return
	}

	if !success {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"code":    "UNAUTHORIZED",
				"message": "Invalid password",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{"success": true},
	})
}
func (h *SessionHandler) ClaimHost(c *gin.Context) {
	slug := c.Param("slug")
	var req struct {
		AdminSecret string `json:"adminSecret"`
		HostName    string `json:"hostName"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
// ...

		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_FAILED",
				"message": err.Error(),
			},
		})
		return
	}

	// Use device ID from middleware as the new host
	deviceID := middleware.GetDeviceID(c)

	if err := h.svc.ClaimHost(c.Request.Context(), slug, req.AdminSecret, req.HostName, deviceID); err != nil {
		status := http.StatusUnprocessableEntity
		code := "PROCESS_FAILED"
		
		if strings.Contains(err.Error(), "invalid admin secret") {
			status = http.StatusUnauthorized
			code = "UNAUTHORIZED"
		} else if strings.Contains(err.Error(), "still active") {
			status = http.StatusForbidden
			code = "FORBIDDEN"
		} else if strings.Contains(err.Error(), "must join") {
			status = http.StatusBadRequest
			code = "BAD_REQUEST"
		}

		c.JSON(status, gin.H{
			"error": gin.H{
				"code":    code,
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{"success": true},
	})
}
