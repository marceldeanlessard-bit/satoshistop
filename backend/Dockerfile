FROM node:22-alpine as deps
WORKDIR /app
COPY package*.json prisma/schema.prisma ./
RUN npm ci
RUN npx prisma generate --schema=./prisma/schema.prisma

FROM node:22-alpine as builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build || true

FROM node:22-alpine
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY server.js middleware/ routes/ services/ ./
EXPOSE 3000
CMD ["npm", "start"]
USER node
