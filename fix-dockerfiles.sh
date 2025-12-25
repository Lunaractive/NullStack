#!/bin/bash

# Script to fix all service Dockerfiles with the correct pattern

SERVICES=("leaderboards-service" "matchmaking-service" "automation-service" "notifications-service")

for SERVICE in "${SERVICES[@]}"; do
  echo "Fixing $SERVICE Dockerfile..."

  cat > "services/$SERVICE/Dockerfile" <<'EOF'
FROM node:20-alpine

WORKDIR /app

# Copy shared packages and build them
COPY packages/shared ./packages/shared

# Build shared packages
WORKDIR /app/packages/shared
RUN npm install && npm run build

# Now copy and setup the service
WORKDIR /app/services/SERVICE_NAME
COPY services/SERVICE_NAME/package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy the rest of the service code
COPY services/SERVICE_NAME .

# Create node_modules links to shared packages
RUN mkdir -p node_modules/@nullstack && \
    ln -s /app/packages/shared node_modules/@nullstack/shared

CMD ["npm", "run", "dev"]
EOF

  # Replace SERVICE_NAME placeholder
  sed -i "s/SERVICE_NAME/$SERVICE/g" "services/$SERVICE/Dockerfile"

  echo "Fixed $SERVICE"
done

echo "All Dockerfiles fixed!"
