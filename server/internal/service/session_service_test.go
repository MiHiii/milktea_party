package service

import (
	"testing"

	"milktea-server/internal/domain"
	"github.com/stretchr/testify/assert"
)

func TestValidateTransition(t *testing.T) {
	tests := []struct {
		from     string
		to       string
		expected bool
	}{
		{domain.SessionStatusOpen, domain.SessionStatusLocked, true},
		{domain.SessionStatusOpen, domain.SessionStatusCancelled, true},
		{domain.SessionStatusOpen, domain.SessionStatusOrdered, false},
		{domain.SessionStatusLocked, domain.SessionStatusOpen, true},
		{domain.SessionStatusLocked, domain.SessionStatusOrdered, true},
		{domain.SessionStatusLocked, domain.SessionStatusCancelled, true},
		{domain.SessionStatusOrdered, domain.SessionStatusSettling, true},
		{domain.SessionStatusOrdered, domain.SessionStatusOpen, false},
		{domain.SessionStatusSettling, domain.SessionStatusCompleted, true},
		{domain.SessionStatusSettling, domain.SessionStatusCancelled, false},
		{domain.SessionStatusCompleted, domain.SessionStatusOpen, false},
		{domain.SessionStatusCancelled, domain.SessionStatusOpen, false},
		{"unknown", domain.SessionStatusOpen, false},
	}

	for _, tt := range tests {
		err := validateTransition(tt.from, tt.to)
		if tt.expected {
			assert.NoError(t, err, "From %s to %s should be valid", tt.from, tt.to)
		} else {
			assert.Error(t, err, "From %s to %s should be invalid", tt.from, tt.to)
		}
	}
}
