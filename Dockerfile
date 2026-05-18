# ── Stage 1: Build frontend ───────────────────────────────────────────────────
FROM node:22-slim AS frontend

WORKDIR /app

# All 4 workspace manifests needed for correct npm workspace lockfile resolution
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/client/package.json ./apps/client/
COPY apps/server/package.json ./apps/server/

# Override NODE_ENV so npm installs devDependencies (Coolify passes NODE_ENV=production
# as a build ARG which would otherwise skip vite, @vitejs/plugin-react, etc.)
ENV NODE_ENV=development
RUN npm ci

COPY packages/shared ./packages/shared
COPY apps/client ./apps/client

RUN npm run build -w apps/client

# ── Stage 2: Server runtime (Playwright + Chromium) ───────────────────────────
FROM mcr.microsoft.com/playwright:v1.60.0-jammy

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/client/package.json ./apps/client/
COPY apps/server/package.json ./apps/server/

# tsx is in regular dependencies so it installs even with NODE_ENV=production
RUN npm ci --omit=dev

# ffmpeg for audio conversion (webm/m4a → mp3) + yt-dlp standalone binary
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -o /usr/local/bin/yt-dlp && chmod +x /usr/local/bin/yt-dlp


COPY packages/shared ./packages/shared
COPY apps/server ./apps/server

# Copy built frontend from Stage 1
COPY --from=frontend /app/apps/client/dist ./apps/client/dist

ENV NODE_ENV=production
ENV PORT=4500
ENV DOWNLOADS_DIR=/tmp/downloads

EXPOSE 4500

CMD ["npx", "tsx", "apps/server/src/index.ts"]
