# Backend Makefile for match-me project

.PHONY: test test-verbose test-coverage build run clean deps

# Run all tests
test:
	go test ./...

# Run tests with verbose output
test-verbose:
	go test ./... -v

# Run tests with coverage
test-coverage:
	go test ./... -cover

# Run tests with coverage and generate HTML report
test-coverage-html:
	go test ./... -coverprofile=coverage.out
	go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"

# Build the application
build:
	go build -o bin/server .

# Run the server (requires .env file)
run:
	go run .

# Clean build artifacts
clean:
	rm -rf bin/
	rm -f coverage.out coverage.html

# Install dependencies
deps:
	go mod download
	go mod tidy

# Run linter
lint:
	golangci-lint run

# Format code
fmt:
	go fmt ./...

# Run all checks (format, lint, test)
check: fmt lint test

# Help
help:
	@echo "Available targets:"
	@echo "  test              - Run all tests"
	@echo "  test-verbose      - Run tests with verbose output"
	@echo "  test-coverage     - Run tests with coverage"
	@echo "  test-coverage-html- Generate HTML coverage report"
	@echo "  build             - Build the application"
	@echo "  run               - Run the server"
	@echo "  clean             - Clean build artifacts"
	@echo "  deps              - Install dependencies"
	@echo "  lint              - Run linter"
	@echo "  fmt               - Format code"
	@echo "  check             - Run all checks (format, lint, test)"
	@echo "  help              - Show this help"
