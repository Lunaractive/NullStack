# Production Deployment Guide

This guide covers deploying NullStack to a production Kubernetes cluster.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Infrastructure Setup](#infrastructure-setup)
- [Configuration](#configuration)
- [Deployment Methods](#deployment-methods)
- [Post-Deployment](#post-deployment)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Scaling](#scaling)
- [Rollback Procedures](#rollback-procedures)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Tools

- **kubectl** - Kubernetes command-line tool
  ```bash
  curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
  chmod +x kubectl
  sudo mv kubectl /usr/local/bin/
  ```

- **Docker** - For building images
  ```bash
  # Installation varies by OS
  # See: https://docs.docker.com/get-docker/
  ```

- **helm** (optional) - Kubernetes package manager
  ```bash
  curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
  ```

### Kubernetes Cluster

You need a Kubernetes cluster (version 1.24+) from one of these providers:
- Google Kubernetes Engine (GKE)
- Amazon Elastic Kubernetes Service (EKS)
- Azure Kubernetes Service (AKS)
- DigitalOcean Kubernetes
- Self-hosted (kubeadm, k3s, etc.)

Minimum recommended cluster size:
- **Staging**: 3 nodes, 4 CPU, 8GB RAM each
- **Production**: 5+ nodes, 8 CPU, 16GB RAM each

### Domain and DNS

- A domain name for your NullStack instance
- Access to DNS management for the domain
- SSL/TLS certificates (Let's Encrypt recommended)

## Infrastructure Setup

### 1. Create Kubernetes Cluster

#### GKE Example

```bash
gcloud container clusters create nullstack-prod \
  --zone=us-central1-a \
  --num-nodes=5 \
  --machine-type=n1-standard-4 \
  --disk-size=100 \
  --enable-autoscaling \
  --min-nodes=3 \
  --max-nodes=10
```

#### EKS Example

```bash
eksctl create cluster \
  --name=nullstack-prod \
  --region=us-east-1 \
  --nodegroup-name=standard-workers \
  --node-type=t3.xlarge \
  --nodes=5 \
  --nodes-min=3 \
  --nodes-max=10
```

### 2. Configure kubectl

```bash
# GKE
gcloud container clusters get-credentials nullstack-prod --zone=us-central1-a

# EKS
aws eks update-kubeconfig --name nullstack-prod --region us-east-1

# Verify connection
kubectl cluster-info
kubectl get nodes
```

### 3. Set Up Persistent Storage

#### Create Storage Class (if needed)

```yaml
# storage-class.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: kubernetes.io/gce-pd  # or appropriate for your provider
parameters:
  type: pd-ssd
  replication-type: regional-pd
```

```bash
kubectl apply -f storage-class.yaml
```

### 4. Install Ingress Controller

#### Using nginx-ingress

```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=LoadBalancer
```

#### Get Ingress IP

```bash
kubectl get svc -n ingress-nginx
```

### 5. Set Up Cert-Manager (for SSL)

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Wait for cert-manager to be ready
kubectl wait --for=condition=Available --timeout=300s deployment/cert-manager -n cert-manager
```

#### Create ClusterIssuer

```yaml
# cluster-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@yourdomain.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
```

```bash
kubectl apply -f cluster-issuer.yaml
```

## Configuration

### 1. Prepare Secrets

Create a file with your production secrets (DO NOT commit this file):

```bash
# secrets.env
POSTGRES_PASSWORD=<strong-random-password>
MONGODB_PASSWORD=<strong-random-password>
REDIS_PASSWORD=<strong-random-password>
RABBITMQ_PASSWORD=<strong-random-password>
JWT_SECRET=<long-random-string>
JWT_REFRESH_SECRET=<different-long-random-string>
```

### 2. Create Kubernetes Secrets

```bash
# Load secrets from file
source secrets.env

# Create secrets
kubectl create secret generic nullstack-secrets \
  --from-literal=postgres-password="${POSTGRES_PASSWORD}" \
  --from-literal=mongodb-password="${MONGODB_PASSWORD}" \
  --from-literal=redis-password="${REDIS_PASSWORD}" \
  --from-literal=rabbitmq-password="${RABBITMQ_PASSWORD}" \
  --from-literal=jwt-secret="${JWT_SECRET}" \
  --from-literal=jwt-refresh-secret="${JWT_REFRESH_SECRET}" \
  --namespace=nullstack

# Verify
kubectl get secret nullstack-secrets -n nullstack
```

### 3. Update ConfigMap

Edit `kubernetes/configmap.yaml` with production values:

```yaml
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  # Update other production-specific values
```

### 4. Update Image References

In `kubernetes/services-deployment.yaml`, update image references:

```yaml
image: ghcr.io/your-org/nullstack/api-gateway:v1.0.0
```

Replace `your-org` with your GitHub organization and update version tags.

## Deployment Methods

### Method 1: Automated Deployment Script (Recommended)

```bash
# Set required environment variables
export POSTGRES_PASSWORD="your-password"
export MONGODB_PASSWORD="your-password"
export REDIS_PASSWORD="your-password"
export RABBITMQ_PASSWORD="your-password"
export JWT_SECRET="your-jwt-secret"
export JWT_REFRESH_SECRET="your-jwt-refresh-secret"

# Run deployment script
chmod +x scripts/deploy.sh
./scripts/deploy.sh production
```

### Method 2: GitHub Actions (CI/CD)

1. Set up GitHub Secrets:
   - Go to repository Settings > Secrets and Variables > Actions
   - Add the following secrets:
     - `KUBE_CONFIG` - Base64 encoded kubeconfig file
     - `POSTGRES_PASSWORD`
     - `MONGODB_PASSWORD`
     - `REDIS_PASSWORD`
     - `RABBITMQ_PASSWORD`
     - `JWT_SECRET`
     - `JWT_REFRESH_SECRET`

2. Create a release tag:
```bash
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

3. GitHub Actions will automatically:
   - Build Docker images
   - Run tests
   - Scan for vulnerabilities
   - Deploy to production

### Method 3: Manual Deployment

#### Step 1: Create Namespace

```bash
kubectl apply -f kubernetes/namespace.yaml
```

#### Step 2: Deploy ConfigMap

```bash
kubectl apply -f kubernetes/configmap.yaml
```

#### Step 3: Deploy Databases

```bash
kubectl apply -f kubernetes/postgres-deployment.yaml
kubectl apply -f kubernetes/mongodb-deployment.yaml
kubectl apply -f kubernetes/redis-deployment.yaml

# Wait for databases to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n nullstack --timeout=300s
kubectl wait --for=condition=ready pod -l app=mongodb -n nullstack --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n nullstack --timeout=300s
```

#### Step 4: Run Database Migrations

```bash
# Get PostgreSQL pod name
POSTGRES_POD=$(kubectl get pod -l app=postgres -n nullstack -o jsonpath='{.items[0].metadata.name}')

# Copy migration files
kubectl cp packages/database/migrations $POSTGRES_POD:/tmp/migrations -n nullstack

# Run migrations
kubectl exec -n nullstack $POSTGRES_POD -- bash -c "
  export PGPASSWORD='${POSTGRES_PASSWORD}'
  for migration in /tmp/migrations/*.sql; do
    psql -U nullstack -d nullstack -f \$migration
  done
"
```

#### Step 5: Deploy Services

```bash
kubectl apply -f kubernetes/services-deployment.yaml

# Monitor rollout
kubectl rollout status deployment/api-gateway -n nullstack
kubectl rollout status deployment/auth-service -n nullstack
# ... repeat for all services
```

#### Step 6: Configure Ingress

Create `ingress.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nullstack-ingress
  namespace: nullstack
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - api.yourdomain.com
    - portal.yourdomain.com
    secretName: nullstack-tls
  rules:
  - host: api.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-gateway
            port:
              number: 3000
  - host: portal.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: developer-portal
            port:
              number: 80
```

```bash
kubectl apply -f ingress.yaml
```

## Post-Deployment

### 1. Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n nullstack

# Check services
kubectl get svc -n nullstack

# Check ingress
kubectl get ingress -n nullstack
```

### 2. Health Checks

```bash
# Test API Gateway
curl https://api.yourdomain.com/health

# Test specific services via API Gateway
curl https://api.yourdomain.com/api/auth/health
curl https://api.yourdomain.com/api/player/health
```

### 3. Configure DNS

Point your domain to the Ingress LoadBalancer IP:

```bash
# Get LoadBalancer IP
kubectl get svc ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].ip}'

# Create DNS A records:
# api.yourdomain.com -> LoadBalancer IP
# portal.yourdomain.com -> LoadBalancer IP
```

### 4. Verify SSL Certificates

```bash
# Check certificate status
kubectl get certificate -n nullstack

# Wait for certificate to be ready
kubectl wait --for=condition=ready certificate/nullstack-tls -n nullstack --timeout=300s
```

## Monitoring and Maintenance

### Logging

#### View Logs

```bash
# All pods in namespace
kubectl logs -n nullstack -l tier=backend --tail=100

# Specific service
kubectl logs -n nullstack -l app=api-gateway --tail=100 -f

# Previous crashed container
kubectl logs -n nullstack <pod-name> --previous
```

#### Centralized Logging (Optional)

Deploy ELK stack or use cloud provider logging:

```bash
# Example: Deploy Elasticsearch and Kibana
helm repo add elastic https://helm.elastic.co
helm install elasticsearch elastic/elasticsearch -n logging --create-namespace
helm install kibana elastic/kibana -n logging
```

### Monitoring

#### Install Prometheus and Grafana

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack -n monitoring --create-namespace
```

Access Grafana:
```bash
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
# Default credentials: admin/prom-operator
```

### Backups

#### Database Backups

Create a CronJob for automated backups:

```yaml
# backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: nullstack
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:16-alpine
            command:
            - /bin/sh
            - -c
            - |
              pg_dump -h postgres -U nullstack nullstack | gzip > /backup/nullstack-$(date +%Y%m%d).sql.gz
              # Upload to S3 or other storage
            env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: nullstack-secrets
                  key: postgres-password
            volumeMounts:
            - name: backup-storage
              mountPath: /backup
          restartPolicy: OnFailure
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: backup-pvc
```

## Scaling

### Manual Scaling

```bash
# Scale specific deployment
kubectl scale deployment api-gateway -n nullstack --replicas=5

# Scale multiple services
kubectl scale deployment player-service -n nullstack --replicas=10
```

### Auto-scaling

Horizontal Pod Autoscaler (HPA) is configured in `services-deployment.yaml`.

Monitor HPA:
```bash
kubectl get hpa -n nullstack
kubectl describe hpa api-gateway-hpa -n nullstack
```

### Cluster Auto-scaling

Enable cluster autoscaling on your cloud provider:

#### GKE
```bash
gcloud container clusters update nullstack-prod \
  --enable-autoscaling \
  --min-nodes=3 \
  --max-nodes=20 \
  --zone=us-central1-a
```

#### EKS
```bash
eksctl scale nodegroup --cluster=nullstack-prod \
  --nodes=5 \
  --nodes-min=3 \
  --nodes-max=20 \
  standard-workers
```

## Rollback Procedures

### Rollback Deployment

```bash
# Rollback specific service to previous version
kubectl rollout undo deployment/api-gateway -n nullstack

# Rollback to specific revision
kubectl rollout history deployment/api-gateway -n nullstack
kubectl rollout undo deployment/api-gateway -n nullstack --to-revision=2
```

### Full System Rollback

```bash
# Run rollback for all services
services=("api-gateway" "auth-service" "title-service" "player-service" "economy-service" "analytics-service" "cloudscript-service" "matchmaking-service" "automation-service" "developer-portal")

for service in "${services[@]}"; do
  echo "Rolling back $service..."
  kubectl rollout undo deployment/$service -n nullstack
done
```

## Troubleshooting

### Pod Not Starting

```bash
# Check pod status
kubectl get pods -n nullstack

# Describe pod
kubectl describe pod <pod-name> -n nullstack

# Check events
kubectl get events -n nullstack --sort-by='.lastTimestamp'
```

### Database Connection Issues

```bash
# Test database connectivity
kubectl run -it --rm debug --image=postgres:16-alpine --restart=Never -n nullstack -- \
  psql -h postgres -U nullstack -d nullstack

# Check database pod logs
kubectl logs -n nullstack -l app=postgres
```

### Service Not Accessible

```bash
# Check service endpoints
kubectl get endpoints -n nullstack

# Check ingress
kubectl describe ingress nullstack-ingress -n nullstack

# Test service internally
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -n nullstack -- \
  curl http://api-gateway:3000/health
```

### High Memory/CPU Usage

```bash
# Check resource usage
kubectl top pods -n nullstack
kubectl top nodes

# Check if HPA is working
kubectl get hpa -n nullstack
```

### Certificate Issues

```bash
# Check certificate status
kubectl describe certificate nullstack-tls -n nullstack

# Check cert-manager logs
kubectl logs -n cert-manager -l app=cert-manager

# Delete and recreate certificate
kubectl delete certificate nullstack-tls -n nullstack
kubectl apply -f ingress.yaml
```

## Security Best Practices

1. **Secrets Management**
   - Never commit secrets to version control
   - Use Kubernetes secrets or external secret managers (Vault, AWS Secrets Manager)
   - Rotate secrets regularly

2. **Network Policies**
   - Implement network policies to restrict pod communication
   - Use service mesh (Istio, Linkerd) for advanced security

3. **RBAC**
   - Configure Role-Based Access Control
   - Use service accounts with minimal permissions
   - Audit RBAC policies regularly

4. **Image Security**
   - Scan images for vulnerabilities (Trivy, Snyk)
   - Use minimal base images
   - Keep images updated

5. **Pod Security**
   - Run containers as non-root users
   - Use read-only root filesystems
   - Set resource limits

## Performance Optimization

1. **Database Optimization**
   - Use connection pooling
   - Add appropriate indexes
   - Monitor slow queries

2. **Caching**
   - Leverage Redis for frequently accessed data
   - Implement application-level caching
   - Use CDN for static assets

3. **Resource Allocation**
   - Set appropriate resource requests and limits
   - Monitor actual usage and adjust
   - Use node affinity for optimal placement

## Support

For deployment issues:
- Check the [Troubleshooting](#troubleshooting) section
- Review [GitHub Issues](https://github.com/your-org/nullstack/issues)
- Contact DevOps team
- Create a support ticket

## Next Steps

- [Set up monitoring dashboards](MONITORING.md)
- [Configure automated backups](BACKUPS.md)
- [Review security checklist](SECURITY.md)
- [Performance tuning guide](PERFORMANCE.md)
