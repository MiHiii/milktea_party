package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const DeviceIDHeader = "X-Device-ID"
const DeviceIDContextKey = "deviceID"

func DeviceIDMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		deviceIDStr := c.GetHeader(DeviceIDHeader)
		var deviceID uuid.UUID
		var err error

		if deviceIDStr == "" {
			// Generate new UUID if missing
			deviceID = uuid.New()
			c.Header(DeviceIDHeader, deviceID.String())
		} else {
			deviceID, err = uuid.Parse(deviceIDStr)
			if err != nil {
				// If invalid, generate a new one
				deviceID = uuid.New()
				c.Header(DeviceIDHeader, deviceID.String())
			}
		}

		// Store in context for handlers
		c.Set(DeviceIDContextKey, deviceID)
		c.Next()
	}
}

func GetDeviceID(c *gin.Context) uuid.UUID {
	val, exists := c.Get(DeviceIDContextKey)
	if !exists {
		return uuid.Nil
	}
	return val.(uuid.UUID)
}
