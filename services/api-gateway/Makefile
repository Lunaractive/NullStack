.PHONY: help install build dev start test lint clean docker-build docker-run docker-push k8s-deploy k8s-delete

# Variables
IMAGE_NAME = nullstack/api-gateway
IMAGE_TAG = latest
NAMESPACE = nullstack

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	npm install

build: ## Build TypeScript
	npm run build

dev: ## Start development server
	npm run dev

start: build ## Build and start production server
	npm start

test: ## Run tests
	npm test

test-watch: ## Run tests in watch mode
	npm run test:watch

lint: ## Run linter
	npm run lint

lint-fix: ## Run linter with auto-fix
	npm run lint -- --fix

clean: ## Clean build artifacts
	rm -rf dist node_modules coverage

# Docker targets
docker-build: ## Build Docker image
	docker build -t $(IMAGE_NAME):$(IMAGE_TAG) .

docker-run: ## Run Docker container
	docker run -p 8080:8080 --env-file .env $(IMAGE_NAME):$(IMAGE_TAG)

docker-push: docker-build ## Build and push Docker image
	docker push $(IMAGE_NAME):$(IMAGE_TAG)

docker-compose-up: ## Start with Docker Compose
	docker-compose up -d

docker-compose-down: ## Stop Docker Compose
	docker-compose down

docker-compose-logs: ## View Docker Compose logs
	docker-compose logs -f

# Kubernetes targets
k8s-deploy: ## Deploy to Kubernetes
	kubectl create namespace $(NAMESPACE) --dry-run=client -o yaml | kubectl apply -f -
	kubectl apply -f k8s/deployment.yaml
	kubectl apply -f k8s/ingress.yaml

k8s-delete: ## Delete from Kubernetes
	kubectl delete -f k8s/ingress.yaml || true
	kubectl delete -f k8s/deployment.yaml || true

k8s-logs: ## View Kubernetes logs
	kubectl logs -f -l app=api-gateway -n $(NAMESPACE)

k8s-status: ## Check Kubernetes deployment status
	kubectl get all -l app=api-gateway -n $(NAMESPACE)

k8s-describe: ## Describe Kubernetes deployment
	kubectl describe deployment api-gateway -n $(NAMESPACE)

k8s-restart: ## Restart Kubernetes deployment
	kubectl rollout restart deployment/api-gateway -n $(NAMESPACE)

# Development helpers
setup: install ## Initial setup
	cp .env.example .env
	@echo "Setup complete! Please update .env with your configuration."

check-health: ## Check health endpoint
	curl http://localhost:8080/health

check-health-detailed: ## Check detailed health endpoint
	curl http://localhost:8080/health/detailed | jq

check-metrics: ## Check metrics endpoint
	curl http://localhost:8080/metrics | jq

watch-logs: ## Watch logs
	tail -f logs/*.log

# CI/CD targets
ci-test: install lint test ## Run CI tests

ci-build: install build docker-build ## Build for CI

ci-deploy: ci-build docker-push k8s-deploy ## Full CI/CD pipeline
