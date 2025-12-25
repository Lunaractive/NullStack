FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY packages ./packages
COPY services/economy-service ./services/economy-service

RUN npm install

WORKDIR /app/services/economy-service

CMD ["npm", "run", "dev"]
