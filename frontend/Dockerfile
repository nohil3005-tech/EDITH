# ─── Build stage ─────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Accept build args to inject as env vars
ARG VITE_API_BASE_URL=""
ARG VITE_API_KEY=edith-dev-key
ARG VITE_SUPABASE_URL=https://ouqrjjdyvgrxntpzuhcg.supabase.co
ARG VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91cXJqamR5dmdyeG50cHp1aGNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MDk4OTgsImV4cCI6MjA5MzQ4NTg5OH0.Vqh73PaU9ejE4_KzfzfMBnv1_5emNUosmGCkysYSw6k

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_API_KEY=$VITE_API_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ─── Serve stage ─────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/dist ./dist
COPY package*.json ./
RUN npm install --omit=dev

EXPOSE 3000

CMD ["node", "dist/server/index.mjs"]
