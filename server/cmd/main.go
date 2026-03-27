package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"milktea-server/internal/handler"
	"milktea-server/internal/middleware"
	"milktea-server/internal/repository"
	"milktea-server/internal/service"
	"milktea-server/internal/websocket"
	"milktea-server/pkg/config"
	"github.com/gin-gonic/gin"
)

func main() {
	// 1. Load Config
	cfg := config.Load()

	// 2. Setup Logger & Gin Mode
	var logger *slog.Logger
	if cfg.IsProduction() {
		gin.SetMode(gin.ReleaseMode)
		logger = slog.New(slog.NewJSONHandler(os.Stdout, nil))
	} else {
		gin.SetMode(gin.DebugMode)
		logger = slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))
	}
	slog.SetDefault(logger)

	// 3. Initialize Database Pool
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	dbPool, err := repository.NewPostgresPool(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("failed to initialize database pool", "error", err)
		os.Exit(1)
	}
	defer dbPool.Close()

	// 4. Initialize WebSocket Hub
	wsHub := websocket.NewHub()
	go wsHub.Run(context.Background()) // Should ideally use a cancellable context for graceful shutdown

	// 5. Initialize Repositories
	sessionRepo := repository.NewSessionRepository(dbPool)
	participantRepo := repository.NewParticipantRepository(dbPool)
	orderBatchRepo := repository.NewOrderBatchRepository(dbPool)
	orderItemRepo := repository.NewOrderItemRepository(dbPool)

	// 6. Initialize Services
	sessionSvc := service.NewSessionService(sessionRepo, participantRepo, wsHub)
	participantSvc := service.NewParticipantService(participantRepo, wsHub)
	orderItemSvc := service.NewOrderItemService(orderItemRepo, sessionRepo, participantRepo, wsHub)
	orderBatchSvc := service.NewOrderBatchService(orderBatchRepo, wsHub)

	// 7. Initialize Handlers
	sessionHdl := handler.NewSessionHandler(sessionSvc)
	participantHdl := handler.NewParticipantHandler(participantSvc)
	orderItemHdl := handler.NewOrderItemHandler(orderItemSvc)
	orderBatchHdl := handler.NewOrderBatchHandler(orderBatchSvc)

	// 8. Setup Router
	router := gin.New()

	// 9. Global Middleware
	router.Use(middleware.Recovery())
	router.Use(middleware.Logger())
	router.Use(middleware.CORS())
	router.Use(middleware.RateLimiter())

	// Start background cleanup for rate limiters
	go middleware.CleanupRateLimiters()

	// 10. Start background cleanup for old sessions (older than 30 days)
	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		for range ticker.C {
			count, err := sessionSvc.CleanupOldSessions(context.Background(), 30)
			if err != nil {
				slog.Error("failed to cleanup old sessions", "error", err)
			} else if count > 0 {
				slog.Info("cleaned up old sessions", "count", count)
			}
		}
	}()

	// 11. Register Routes
	appRouter := &handler.Router{
		Session:     sessionHdl,
		Participant: participantHdl,
		OrderItem:   orderItemHdl,
		OrderBatch:  orderBatchHdl,
	}
	appRouter.Register(router)

	// WebSocket Endpoint
	router.GET("/ws/:sessionId", func(c *gin.Context) {
		sessionID := c.Param("sessionId")
		websocket.ServeWs(wsHub, c.Writer, c.Request, sessionID)
	})

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "ok",
			"time":   time.Now().Format(time.RFC3339),
		})
	})

	// 10. Server Config
	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: router,
	}

	// 8. Start Server
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server failed", "error", err)
			os.Exit(1)
		}
	}()

	slog.Info("server started", "port", cfg.Port)

	// 9. Graceful Shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	slog.Info("shutting down server...")

	// Create a deadline for shutdown
	ctxShutdown, cancelShutdown := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancelShutdown()

	if err := srv.Shutdown(ctxShutdown); err != nil {
		slog.Error("server forced to shutdown", "error", err)
	}

	slog.Info("server exiting")
}
