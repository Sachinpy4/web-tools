FROM node:24.14.0-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:24.14.0-alpine
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
ENV NODE_ENV=production
USER appuser
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -q --spider http://localhost:5000/api || exit 1
CMD ["npm", "run", "start:prod"]
