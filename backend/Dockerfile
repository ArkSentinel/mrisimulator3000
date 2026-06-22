# Backend Docker Multi-stage Build
# Stage 1: Builder
FROM golang:1.23 AS builder

RUN apt-get update && apt-get install -y gcc musl-dev

WORKDIR /build

# Copy go mod files first for caching
COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o mri-server ./cmd/server

# Stage 2: Runner
FROM debian:bookworm

RUN apt-get update && apt-get install -y ca-certificates mariadb-client

WORKDIR /app

COPY --from=builder /build/mri-server .

EXPOSE 3000

CMD ["./mri-server"]
