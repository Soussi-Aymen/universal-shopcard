# --- BUILD STAGE ---
FROM node:20-alpine AS builder

RUN corepack enable

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml .npmrc ./

RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY src/ ./src/

RUN pnpm run build

# --- RUN STAGE ---
FROM node:20-alpine AS runner

ENV NODE_ENV=production

RUN corepack enable

WORKDIR /app

# Secure container by running as non-root user 'node'
RUN chown -R node:node /app

USER node

COPY package.json pnpm-lock.yaml .npmrc ./

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 5000

CMD ["node", "dist/index.js"]
