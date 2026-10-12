# syntax=docker.io/docker/dockerfile:1

# ── 1. DEPENDENCIES STAGE ──
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat perl
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --include=dev

# ── 2. BUILDER STAGE ──
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat perl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables públicas requeridas por Next.js en tiempo de compilación con fallbacks
ARG NEXT_PUBLIC_SUPABASE_URL=http://supabasekong-t0c40gs0ks0ksc80woo8cos0.46.224.62.53.sslip.io
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4OTkxODUwMCwiZXhwIjo0OTQ1NTkyMTAwLCJyb2xlIjoiYW5vbiJ9.BO0AL139qok5hXKYeU5c7tmD2J0QroXeFuqndyhln0Y
ARG NEXT_PUBLIC_ADMIN_EMAIL=afaf@lamhastudios.ma

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_ADMIN_EMAIL=$NEXT_PUBLIC_ADMIN_EMAIL
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ── 3. PRODUCTION RUNNER STAGE ──
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat perl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copiar archivos públicos estáticos
COPY --from=builder /app/public ./public

# Copiar artefactos de salida standalone de Next.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
