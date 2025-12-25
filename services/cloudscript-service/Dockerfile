FROM node:20-alpine

WORKDIR /app

# Copy shared packages and build them
COPY packages/shared ./packages/shared
COPY packages/database ./packages/database

# Build shared packages
WORKDIR /app/packages/shared
RUN npm install && npm run build

WORKDIR /app/packages/database
RUN npm install && npm run build

# Now copy and setup the service
WORKDIR /app/services/cloudscript-service
COPY services/cloudscript-service/package*.json ./

# Install dependencies using file: protocol for local packages
RUN npm install --legacy-peer-deps

# Copy the rest of the service code
COPY services/cloudscript-service .

# Create node_modules links to shared packages
RUN mkdir -p node_modules/@nullstack && \
    ln -s /app/packages/shared node_modules/@nullstack/shared && \
    ln -s /app/packages/database node_modules/@nullstack/database

CMD ["npm", "run", "dev"]
