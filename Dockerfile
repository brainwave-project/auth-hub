FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache bash

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 3000

RUN npm install -g nodemon

CMD ["nodemon", "src/index.js"]
