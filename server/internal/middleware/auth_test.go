package middleware

import (
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

func TestDeviceIDMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("Generate New UUID when header is empty", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/test", nil)

		middleware := DeviceIDMiddleware()
		middleware(c)

		// Check if DeviceID is set in context
		val, exists := c.Get(DeviceIDContextKey)
		assert.True(t, exists)
		deviceID := val.(uuid.UUID)
		assert.NotEqual(t, uuid.Nil, deviceID)

		// Check if DeviceID is returned in response header
		respHeader := w.Header().Get(DeviceIDHeader)
		assert.Equal(t, deviceID.String(), respHeader)
	})

	t.Run("Use existing valid UUID from header", func(t *testing.T) {
		validUUID := uuid.New()
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/test", nil)
		c.Request.Header.Set(DeviceIDHeader, validUUID.String())

		middleware := DeviceIDMiddleware()
		middleware(c)

		// Check if DeviceID in context matches the input
		val, exists := c.Get(DeviceIDContextKey)
		assert.True(t, exists)
		deviceID := val.(uuid.UUID)
		assert.Equal(t, validUUID, deviceID)
	})

	t.Run("Generate New UUID when header is invalid", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/test", nil)
		c.Request.Header.Set(DeviceIDHeader, "invalid-uuid")

		middleware := DeviceIDMiddleware()
		middleware(c)

		// Should generate a new valid UUID
		val, exists := c.Get(DeviceIDContextKey)
		assert.True(t, exists)
		deviceID := val.(uuid.UUID)
		assert.NotEqual(t, uuid.Nil, deviceID)

		// Check if New DeviceID is returned in response header
		respHeader := w.Header().Get(DeviceIDHeader)
		assert.Equal(t, deviceID.String(), respHeader)
	})
}
