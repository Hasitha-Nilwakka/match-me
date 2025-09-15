// Package utils provides utility functions for JWT token management.
// It handles token generation, validation, and user authentication
// for the Match-Me dating application.
package utils

import (
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// GenerateJWT creates a new JWT token for a user with a 24-hour expiration.
// The token contains the user ID and standard JWT claims (issued at, expiration).
// Returns the signed token string or an error if token creation fails.
//
// Parameters:
//   - userID: The unique identifier of the user
//
// Returns:
//   - string: The signed JWT token
//   - error: Any error that occurred during token creation
func GenerateJWT(userID uint) (string, error) {
	// Get JWT secret from environment variable
	// In production, this should be a strong, randomly generated secret
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "default-secret-key" // Fallback for development only
	}

	// Create JWT claims with user information and expiration
	claims := jwt.MapClaims{
		"user_id": userID,                                    // User identifier
		"exp":     time.Now().Add(time.Hour * 24).Unix(),    // Expires in 24 hours
		"iat":     time.Now().Unix(),                        // Issued at current time
	}

	// Create and sign the token using HS256 algorithm
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// ValidateJWT validates a JWT token and extracts the user ID from it.
// It verifies the token signature, checks expiration, and returns the user ID
// if the token is valid. Returns an error if validation fails.
//
// Parameters:
//   - tokenString: The JWT token string to validate
//
// Returns:
//   - uint: The user ID extracted from the token
//   - error: Any error that occurred during validation (invalid token, expired, etc.)
func ValidateJWT(tokenString string) (uint, error) {
	// Get JWT secret from environment variable
	// Must match the secret used to sign the token
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "default-secret-key" // Fallback for development only
	}

	// Parse and validate the token using the secret
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// Verify the signing method is HMAC
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrInvalidKey
		}
		return []byte(secret), nil
	})

	if err != nil {
		return 0, err
	}

	// Extract and validate claims
	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		// Extract user ID from claims (JWT stores numbers as float64)
		if userID, ok := claims["user_id"].(float64); ok {
			return uint(userID), nil
		}
	}

	return 0, jwt.ErrInvalidKey
}
