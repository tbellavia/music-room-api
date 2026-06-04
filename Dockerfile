FROM node:latest

WORKDIR /api

COPY package*.json ./
RUN npm install
RUN npm i -g @nestjs/cli

COPY . .

CMD ["npm", "run",  "start:dev", "--", "-b", "swc"]
