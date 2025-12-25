FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY packages ./packages
COPY services/title-service ./services/title-service

RUN npm install

WORKDIR /app/services/title-service

CMD ["npm", "run", "dev"]
