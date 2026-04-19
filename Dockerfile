# 1. Stage: Dependencies
FROM node:20-slim AS deps
WORKDIR /app
# Installiere Build-Tools für native Module
RUN apt-get update && apt-get install -y python3 make g++ 
COPY app/package*.json ./
# Nutze npm install statt ci, um Inkompatibilitäten bei den Binaries zu vermeiden
RUN npm install

# 2. Stage: Builder
FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY app/ .

# CRITICAL FIX: Erzwinge das Re-Compiling für Node 20
RUN npm rebuild better-sqlite3
RUN npm run build

# 3. Stage: Runner
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]