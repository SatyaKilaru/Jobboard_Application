FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /bin/service ./cmd

FROM alpine:3.19
RUN apk --no-cache add ca-certificates
COPY --from=builder /bin/service /bin/service
EXPOSE 8081
CMD ["/bin/service"]
