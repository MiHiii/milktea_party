package handler

import (
	"milktea-server/internal/middleware"
	"github.com/gin-gonic/gin"
)

type Router struct {
	Session     *SessionHandler
	Participant *ParticipantHandler
	OrderItem   *OrderItemHandler
	OrderBatch  *OrderBatchHandler
}

func (r *Router) Register(engine *gin.Engine) {
	api := engine.Group("/api")
	api.Use(middleware.DeviceIDMiddleware())
	{
		// Sessions
		sessions := api.Group("/sessions")
		{
			sessions.POST("", r.Session.Create)
			sessions.GET("", r.Session.ListByHost)
			sessions.GET("/batch", r.Session.ListByBatch)
			sessions.GET("/:id", r.Session.GetByID)
			sessions.GET("/slug/:slug", r.Session.GetBySlug)
			sessions.POST("/slug/:slug/verify", r.Session.VerifyPassword)
			sessions.PUT("/:id", r.Session.Update)
			sessions.DELETE("/:id", r.Session.Delete)
		}

		// Participants
		participants := api.Group("/participants")
		{
			participants.POST("", r.Participant.Create)
			participants.GET("/session/:sessionId", r.Participant.GetBySessionID)
			participants.POST("/:id/heartbeat", r.Participant.Heartbeat)
		}

		// Order Items
		orderItems := api.Group("/order-items")
		{
			orderItems.POST("", r.OrderItem.Create)
			orderItems.GET("/session/:sessionId", r.OrderItem.GetBySessionID)
			orderItems.PUT("/:id", r.OrderItem.Update)
			orderItems.DELETE("/:id", r.OrderItem.Delete)
		}

		// Order Batches
		orderBatches := api.Group("/order-batches")
		{
			orderBatches.POST("", r.OrderBatch.Create)
			orderBatches.GET("/session/:sessionId", r.OrderBatch.GetBySessionID)
			orderBatches.PUT("/:id", r.OrderBatch.Update)
			orderBatches.DELETE("/:id", r.OrderBatch.Delete)
		}
	}
}
