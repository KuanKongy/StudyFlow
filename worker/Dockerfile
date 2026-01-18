FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

ENV OPENAI_API_KEY=${OPENAI_API_KEY}

CMD ["npm", "run", "dev"]