FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./

FROM base AS development
RUN npm ci
COPY . .
CMD ["npm", "run", "dev"]

FROM base AS production
RUN npm ci --omit=dev
COPY . .

ENV NODE_ENV=production

EXPOSE 4000

USER node

CMD ["node", "src/index.js"]
