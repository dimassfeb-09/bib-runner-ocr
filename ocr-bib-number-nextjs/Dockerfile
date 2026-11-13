# Stage 1: Build
FROM oven/bun:1.4.0-alpine AS builder
WORKDIR /app

# Install Node.js so Next.js build workers can run successfully
RUN apk add --no-cache nodejs npm

# Disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED=1

# Copy package dependencies configuration
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy codebase
COPY . .

# NEXT_PUBLIC_* variables must be available at build time because Next.js
# statically inlines them into the JS bundle during `bun run build`.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_MIDTRANS_CLIENT_KEY
ARG NEXT_PUBLIC_MIDTRANS_SNAP_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=$NEXT_PUBLIC_MIDTRANS_CLIENT_KEY
ENV NEXT_PUBLIC_MIDTRANS_SNAP_URL=$NEXT_PUBLIC_MIDTRANS_SNAP_URL

# Build production bundle
RUN bun run build

# Stage 2: Runner
FROM oven/bun:1.4.0-alpine AS runner
WORKDIR /app

# Install Node.js runtime for worker threads compatibility
# Install fonts for sharp/librsvg SVG text rendering (Arial substitute)
RUN apk add --no-cache nodejs fontconfig font-liberation

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy built assets and required files
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
COPY --from=builder /app/schema.sql ./schema.sql
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src ./src

EXPOSE 3000

CMD ["bun", "run", "start"]