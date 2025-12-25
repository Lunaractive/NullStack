FROM node:20-alpine

# Add build dependencies for bcrypt FIRST
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
COPY packages ./packages
COPY services/auth-service ./services/auth-service

# Install all dependencies
RUN npm install

# Move to auth service directory
WORKDIR /app/services/auth-service

# Rebuild bcrypt in the service directory specifically
RUN npm rebuild bcrypt --build-from-source

CMD ["npm", "run", "dev"]
