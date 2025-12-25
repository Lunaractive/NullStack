FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY packages ./packages
COPY services/player-service ./services/player-service

RUN npm install

WORKDIR /app/services/player-service

CMD ["npm", "run", "dev"]
