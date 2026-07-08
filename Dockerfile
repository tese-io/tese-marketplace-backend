FROM node:24-alpine AS base

FROM base AS builder
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN yarn global add turbo
COPY . .
RUN turbo prune api --docker

FROM base AS installer
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY --from=builder /app/out/json/ .
RUN yarn install

COPY --from=builder /app/out/full/ .

RUN yarn turbo build

FROM base AS runner
WORKDIR /app

RUN apk add --no-cache wget curl

RUN addgroup --system --gid 1001 medusa
RUN adduser --system --uid 1001 medusa

RUN mkdir -p /app/apps/backend/static
RUN chown -R medusa:medusa /app/apps/backend

USER medusa
COPY --from=installer --chown=medusa:medusa /app .

WORKDIR /app/apps/backend

ENV NODE_ENV=production
ENV PORT=9000

EXPOSE 9000

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:9000/health || exit 1

CMD ["sh", "-c", "case \"$MIGRATE_LINKS\" in skip) LINK_FLAG='--skip-links';; all) LINK_FLAG='--execute-all-links';; *) LINK_FLAG='--execute-safe-links';; esac && yarn db:migrate $LINK_FLAG && if [ \"$SEED_DEMO_DATA\" = \"true\" ]; then yarn seed || true; fi && yarn start"]
