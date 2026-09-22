# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@12.5.1 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml .npmrc ./
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --filter web...

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/package.json /app/pnpm-workspace.yaml /app/.npmrc ./
COPY apps/web ./apps/web
WORKDIR /app/apps/web
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://vial:vial@localhost:5432/vial_monitor?schema=public"
RUN pnpm exec prisma generate
RUN pnpm exec next build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache wget openssl \
  && addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/prisma ./apps/web/prisma
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/node_modules/.pnpm ./node_modules/.pnpm
COPY --from=builder /app/apps/web/node_modules ./apps/web/node_modules
COPY apps/web/docker-entrypoint.sh /docker-entrypoint.sh

RUN chmod +x /docker-entrypoint.sh \
  && mkdir -p /app/uploads \
  && chown -R nextjs:nodejs /app /docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "apps/web/server.js"]
