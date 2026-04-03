FROM node:20-alpine AS builder
WORKDIR /app

# Build React client
COPY client/package*.json ./client/
RUN cd client && npm ci
COPY client ./client
RUN cd client && npm run build

# Build Node API
COPY server/package*.json ./server/
RUN cd server && npm ci
COPY server/tsconfig.json ./server/
COPY server/src ./server/src
RUN cd server && npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/node_modules ./node_modules
COPY --from=builder /app/client/dist ./public
ENV STATIC_DIR=/app/public
EXPOSE 4000
CMD ["node", "dist/index.js"]
