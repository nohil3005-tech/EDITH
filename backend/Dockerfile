FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# ─── Production stage ───────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache chromium \
    && addgroup -g 1001 -S nodejs \
    && adduser -S edith -u 1001

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

RUN mkdir -p uploads && chown -R edith:nodejs /app

USER edith

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/api/v1/health', r => process.exit([200,207].includes(r.statusCode) ? 0 : 1))"

CMD ["node", "dist/index.js"]
