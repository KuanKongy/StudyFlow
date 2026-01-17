FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

ENV AUTH0_DOMAIN=${AUTH0_DOMAIN}
ENV AUTH0_AUDIENCE=${AUTH0_AUDIENCE}

CMD ["npm", "run", "dev"]