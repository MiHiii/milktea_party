package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type userRateLimit struct {
	lastRequest time.Time
	count       int
}

var (
	mu           sync.Mutex
	rateLimiters = make(map[string]*userRateLimit)
)

func RateLimiter() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		
		mu.Lock()
		defer mu.Unlock()

		now := time.Now()
		limiter, exists := rateLimiters[ip]

		if !exists {
			rateLimiters[ip] = &userRateLimit{
				lastRequest: now,
				count:       1,
			}
			c.Next()
			return
		}

		// Reset count if 5 seconds have passed
		if now.Sub(limiter.lastRequest) > 5*time.Second {
			limiter.count = 1
			limiter.lastRequest = now
		} else {
			limiter.count++
		}

		if limiter.count > 10 {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "Rate limit exceeded. Please try again later.",
			})
			return
		}

		c.Next()
	}
}

// CleanupRateLimiters periodially removes old entries to prevent memory leak
func CleanupRateLimiters() {
	for {
		time.Sleep(10 * time.Minute)
		mu.Lock()
		now := time.Now()
		for ip, limiter := range rateLimiters {
			if now.Sub(limiter.lastRequest) > 1*time.Hour {
				delete(rateLimiters, ip)
			}
		}
		mu.Unlock()
	}
}
