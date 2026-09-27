FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/agency/package.json ./apps/agency/
COPY packages/client-template/package.json ./packages/client-template/
RUN pnpm install --filter @obelix/agency...

FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/agency/node_modules ./apps/agency/node_modules
COPY . .
WORKDIR /app/apps/agency
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/apps/agency/public ./apps/agency/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/agency/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/agency/.next/static ./apps/agency/.next/static
COPY --from=builder /app/packages/client-template ./packages/client-template
WORKDIR /app/apps/agency
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
