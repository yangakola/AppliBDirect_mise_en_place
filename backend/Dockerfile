# ─── Build stage ────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS build
WORKDIR /app

# better-sqlite3 est un module natif : il a besoin d'outils de compilation
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ─── Runtime stage ──────────────────────────────────────────────────────────
FROM node:20-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist

ENV NODE_ENV=production
ENV DATABASE_FILE=/data/data.db
VOLUME ["/data"]

EXPOSE 4000
CMD ["sh", "-c", "node dist/seed.js && node dist/server.js"]
