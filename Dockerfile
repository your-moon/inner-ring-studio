# Build with bun (matches bun.lock + the rest of the toolchain; faster installs).
# Alpine (musl) builder so native modules pulled into the Next standalone bundle
# stay ABI-compatible with the node:20-alpine runtime below.
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Install dependencies from the lockfile (reproducible).
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source and build the standalone output.
COPY . .
RUN bun run build

# Runtime: the Next standalone server, run on Node (proven for server.js).
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
CMD ["node", "server.js"]
