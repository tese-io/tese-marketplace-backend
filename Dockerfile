FROM node:22-alpine AS base

# Install system dependencies
RUN apk update && apk add --no-cache \
    libc6-compat \
    git \
    python3 \
    make \
    g++ \
    curl

FROM base AS builder
# Set working directory
WORKDIR /app

# Install global packages
RUN yarn global add turbo

# Copy all source files
COPY . .

# Prune the monorepo for just the api workspace
RUN turbo prune api --docker

FROM base AS installer
WORKDIR /app

# Copy pruned lockfile and package.json files
COPY --from=builder /app/out/json/ .

# Install dependencies
RUN yarn install

# Copy pruned source code
COPY --from=builder /app/out/full/ .

# Build the project and admin panel
RUN yarn turbo build
# Build the admin panel for production
WORKDIR /app/apps/backend
RUN yarn build

FROM base AS runner
WORKDIR /app

# Create non-root user (Alpine style)
RUN addgroup --system --gid 1001 medusa && \
    adduser --system --uid 1001 medusa

# Copy built application
COPY --from=installer /app .

# Create necessary directories and set ownership
RUN mkdir -p /app/apps/backend/static && \
    chown -R medusa:medusa /app/apps/backend

# Switch to non-root user
USER medusa

# Set working directory to backend app
WORKDIR /app/apps/backend

# Environment variables
ENV NODE_ENV=production
ENV PORT=9000

# Expose port
EXPOSE 9000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:9000/health || exit 1

# Start the application
CMD ["yarn", "start"]

