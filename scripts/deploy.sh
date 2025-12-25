#!/bin/bash

# NullStack Production Deployment Script
# This script automates the deployment of NullStack to Kubernetes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=${1:-staging}
NAMESPACE="nullstack"
CONTEXT=""

# Helper functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Validate environment
validate_environment() {
    if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
        print_error "Invalid environment: $ENVIRONMENT"
        echo "Usage: $0 [staging|production]"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"

    if ! command_exists kubectl; then
        print_error "kubectl is not installed. Please install kubectl."
        exit 1
    fi
    print_success "kubectl is installed"

    if ! command_exists helm; then
        print_info "helm is not installed. Proceeding without Helm."
    else
        print_success "helm is installed"
    fi

    if ! command_exists docker; then
        print_error "Docker is not installed. Please install Docker."
        exit 1
    fi
    print_success "Docker is installed"
}

# Set Kubernetes context
set_kubernetes_context() {
    print_header "Configuring Kubernetes Context"

    if [ "$ENVIRONMENT" = "production" ]; then
        CONTEXT="nullstack-prod-cluster"
    else
        CONTEXT="nullstack-staging-cluster"
    fi

    print_info "Switching to context: $CONTEXT"
    kubectl config use-context "$CONTEXT" || {
        print_error "Failed to switch to context: $CONTEXT"
        exit 1
    }

    print_success "Using context: $(kubectl config current-context)"
    print_info "Cluster info:"
    kubectl cluster-info
}

# Create namespace if it doesn't exist
create_namespace() {
    print_header "Creating Namespace"

    if kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
        print_info "Namespace $NAMESPACE already exists"
    else
        print_info "Creating namespace: $NAMESPACE"
        kubectl apply -f ../kubernetes/namespace.yaml
        print_success "Namespace created"
    fi
}

# Deploy secrets
deploy_secrets() {
    print_header "Deploying Secrets"

    print_info "Please ensure you have set the following environment variables:"
    echo "  - POSTGRES_PASSWORD"
    echo "  - MONGODB_PASSWORD"
    echo "  - REDIS_PASSWORD"
    echo "  - RABBITMQ_PASSWORD"
    echo "  - JWT_SECRET"
    echo "  - JWT_REFRESH_SECRET"

    # Check if required secrets are set
    if [ -z "$POSTGRES_PASSWORD" ] || [ -z "$MONGODB_PASSWORD" ] || [ -z "$REDIS_PASSWORD" ] || \
       [ -z "$RABBITMQ_PASSWORD" ] || [ -z "$JWT_SECRET" ] || [ -z "$JWT_REFRESH_SECRET" ]; then
        print_error "Required environment variables are not set."
        exit 1
    fi

    # Create or update secrets
    kubectl create secret generic nullstack-secrets \
        --from-literal=postgres-password="$POSTGRES_PASSWORD" \
        --from-literal=mongodb-password="$MONGODB_PASSWORD" \
        --from-literal=redis-password="$REDIS_PASSWORD" \
        --from-literal=rabbitmq-password="$RABBITMQ_PASSWORD" \
        --from-literal=jwt-secret="$JWT_SECRET" \
        --from-literal=jwt-refresh-secret="$JWT_REFRESH_SECRET" \
        --namespace="$NAMESPACE" \
        --dry-run=client -o yaml | kubectl apply -f -

    print_success "Secrets deployed"
}

# Deploy ConfigMap
deploy_configmap() {
    print_header "Deploying ConfigMap"

    kubectl apply -f ../kubernetes/configmap.yaml
    print_success "ConfigMap deployed"
}

# Deploy databases
deploy_databases() {
    print_header "Deploying Databases"

    print_info "Deploying PostgreSQL..."
    kubectl apply -f ../kubernetes/postgres-deployment.yaml
    kubectl rollout status deployment/postgres -n "$NAMESPACE" --timeout=5m
    print_success "PostgreSQL deployed"

    print_info "Deploying MongoDB..."
    kubectl apply -f ../kubernetes/mongodb-deployment.yaml
    kubectl rollout status deployment/mongodb -n "$NAMESPACE" --timeout=5m
    print_success "MongoDB deployed"

    print_info "Deploying Redis..."
    kubectl apply -f ../kubernetes/redis-deployment.yaml
    kubectl rollout status deployment/redis -n "$NAMESPACE" --timeout=5m
    print_success "Redis deployed"

    print_info "Waiting for databases to be ready..."
    kubectl wait --for=condition=ready pod -l app=postgres -n "$NAMESPACE" --timeout=300s
    kubectl wait --for=condition=ready pod -l app=mongodb -n "$NAMESPACE" --timeout=300s
    kubectl wait --for=condition=ready pod -l app=redis -n "$NAMESPACE" --timeout=300s
    print_success "All databases are ready"
}

# Run migrations
run_migrations() {
    print_header "Running Database Migrations"

    # Get the PostgreSQL pod
    POSTGRES_POD=$(kubectl get pod -l app=postgres -n "$NAMESPACE" -o jsonpath='{.items[0].metadata.name}')

    print_info "Running migrations on pod: $POSTGRES_POD"

    # Copy migration files to the pod
    kubectl cp ../packages/database/migrations "$POSTGRES_POD":/tmp/migrations -n "$NAMESPACE"

    # Run migrations
    kubectl exec -n "$NAMESPACE" "$POSTGRES_POD" -- bash -c "
        export PGPASSWORD='$POSTGRES_PASSWORD'
        for migration in /tmp/migrations/*.sql; do
            echo \"Running \$migration...\"
            psql -U nullstack -d nullstack -f \"\$migration\"
        done
    "

    print_success "Migrations completed"
}

# Deploy services
deploy_services() {
    print_header "Deploying Services"

    kubectl apply -f ../kubernetes/services-deployment.yaml

    SERVICES=(
        "api-gateway"
        "auth-service"
        "title-service"
        "player-service"
        "economy-service"
        "analytics-service"
        "cloudscript-service"
        "matchmaking-service"
        "automation-service"
        "developer-portal"
    )

    for service in "${SERVICES[@]}"; do
        print_info "Deploying $service..."
        kubectl rollout status deployment/"$service" -n "$NAMESPACE" --timeout=10m
        print_success "$service deployed"
    done

    print_success "All services deployed"
}

# Health check
health_check() {
    print_header "Running Health Checks"

    print_info "Waiting for all pods to be ready..."
    kubectl wait --for=condition=ready pod -l tier=backend -n "$NAMESPACE" --timeout=600s

    # Get API Gateway service URL
    API_GATEWAY_IP=$(kubectl get svc api-gateway -n "$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

    if [ -z "$API_GATEWAY_IP" ]; then
        print_info "LoadBalancer IP not yet assigned, checking NodePort..."
        API_GATEWAY_PORT=$(kubectl get svc api-gateway -n "$NAMESPACE" -o jsonpath='{.spec.ports[0].nodePort}')
        NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="ExternalIP")].address}')
        API_URL="http://${NODE_IP}:${API_GATEWAY_PORT}"
    else
        API_URL="http://${API_GATEWAY_IP}:3000"
    fi

    print_info "API Gateway URL: $API_URL"

    # Run health checks
    print_info "Running health checks..."
    for i in {1..30}; do
        if curl -sf "$API_URL/health" >/dev/null; then
            print_success "Health check passed"
            return 0
        fi
        print_info "Waiting for services to be ready... (attempt $i/30)"
        sleep 10
    done

    print_error "Health check failed"
    return 1
}

# Display deployment info
display_info() {
    print_header "Deployment Information"

    echo ""
    print_info "Namespace: $NAMESPACE"
    print_info "Environment: $ENVIRONMENT"
    echo ""

    print_info "Services:"
    kubectl get svc -n "$NAMESPACE"

    echo ""
    print_info "Deployments:"
    kubectl get deployments -n "$NAMESPACE"

    echo ""
    print_info "Pods:"
    kubectl get pods -n "$NAMESPACE"

    echo ""
    API_GATEWAY_IP=$(kubectl get svc api-gateway -n "$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
    if [ -n "$API_GATEWAY_IP" ]; then
        print_success "API Gateway: http://${API_GATEWAY_IP}:3000"
    fi
}

# Rollback function
rollback() {
    print_header "Rolling Back Deployment"

    SERVICES=(
        "api-gateway"
        "auth-service"
        "title-service"
        "player-service"
        "economy-service"
        "analytics-service"
        "cloudscript-service"
        "matchmaking-service"
        "automation-service"
        "developer-portal"
    )

    for service in "${SERVICES[@]}"; do
        print_info "Rolling back $service..."
        kubectl rollout undo deployment/"$service" -n "$NAMESPACE"
    done

    print_success "Rollback completed"
}

# Main deployment flow
main() {
    print_header "NullStack Deployment - $ENVIRONMENT"

    validate_environment
    check_prerequisites
    set_kubernetes_context
    create_namespace
    deploy_secrets
    deploy_configmap
    deploy_databases
    run_migrations
    deploy_services

    if health_check; then
        display_info
        print_success "Deployment completed successfully!"
    else
        print_error "Deployment failed health checks"
        read -p "Do you want to rollback? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rollback
        fi
        exit 1
    fi
}

# Trap errors and rollback
trap 'print_error "Deployment failed!"; exit 1' ERR

# Run main function
main
