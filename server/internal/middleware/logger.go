package middleware

import (
	"bytes"
	"fmt"
	"io"
	"log/slog"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type responseBodyWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (r responseBodyWriter) Write(b []byte) (int, error) {
	r.body.Write(b)
	return r.ResponseWriter.Write(b)
}

func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip logging for OPTIONS requests (CORS preflight)
		if c.Request.Method == "OPTIONS" {
			c.Next()
			return
		}

		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery

		// Skip body logging for heartbeats to reduce noise
		isHeartbeat := strings.Contains(path, "heartbeat")

		// Read Request Body
		var reqBody []byte
		if c.Request.Body != nil && !isHeartbeat {
			reqBody, _ = io.ReadAll(c.Request.Body)
			c.Request.Body = io.NopCloser(bytes.NewBuffer(reqBody))
		}

		// Wrap response writer to capture body
		respWriter := &responseBodyWriter{body: bytes.NewBufferString(""), ResponseWriter: c.Writer}
		c.Writer = respWriter

		c.Next()

		latency := time.Since(start)
		if raw != "" {
			path = path + "?" + raw
		}

		// Structured Logging
		status := c.Writer.Status()
		
		statusEmoji := "🟢"
		if status >= 500 {
			statusEmoji = "🔴"
		} else if status >= 400 {
			statusEmoji = "🟡"
		}

		attrs := []any{
			"status", status,
			"ms", latency.Milliseconds(),
			"ip", c.ClientIP(),
		}

		if !isHeartbeat {
			if len(reqBody) > 0 {
				attrs = append(attrs, "req", string(reqBody))
			}
			
			respBody := respWriter.body.String()
			if status >= 400 {
				attrs = append(attrs, "resp", respBody)
			} else if len(respBody) > 0 && len(respBody) < 200 {
				attrs = append(attrs, "resp", respBody)
			}
		}

		logMsg := fmt.Sprintf("%s %-6s %s", statusEmoji, c.Request.Method, path)

		if status >= 500 {
			slog.Error(logMsg, attrs...)
		} else if status >= 400 {
			slog.Warn(logMsg, attrs...)
		} else {
			slog.Info(logMsg, attrs...)
		}
	}
}
