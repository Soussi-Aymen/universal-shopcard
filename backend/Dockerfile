# --- BUILD STAGE ---
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# --- RUN STAGE ---
FROM node:18-alpine AS runner

ENV NODE_ENV=production

WORKDIR /app

# Secure container by running as non-root user 'node'
RUN chown -R node:node /app

USER node

COPY package*.json ./

RUN npm ci --only=production

COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 5000

CMD ["node", "dist/index.js"]
