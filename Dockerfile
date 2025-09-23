ARG NODE_VERSION=22.11.0

FROM node:${NODE_VERSION}-alpine AS base

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
