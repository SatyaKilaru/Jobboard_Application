.PHONY: dev build stop docker docker-down

GOBIN = ~/sdk/go1.22.5/bin/go

build:
	cd auth-service && $(GOBIN) build -o bin/auth-service ./cmd
	cd jobs-service && $(GOBIN) build -o bin/jobs-service ./cmd
	cd api-gateway && $(GOBIN) build -o bin/api-gateway ./cmd
	@echo "all services built"

dev: build
	@echo "starting services..."
	cd auth-service && nohup ./bin/auth-service > /tmp/auth.log 2>&1 &
	cd jobs-service && nohup ./bin/jobs-service > /tmp/jobs.log 2>&1 &
	cd api-gateway && nohup ./bin/api-gateway > /tmp/gateway.log 2>&1 &
	cd frontend && npm run dev &
	@echo "all services started"

stop:
	-fuser -k 8080/tcp 2>/dev/null
	-fuser -k 8081/tcp 2>/dev/null
	-fuser -k 8082/tcp 2>/dev/null
	-fuser -k 5173/tcp 2>/dev/null
	@echo "all services stopped"

docker:
	docker-compose up --build -d

docker-down:
	docker-compose down
