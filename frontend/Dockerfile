# --- BUILD STAGE ---
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

ARG VITE_API_BASE=
ENV VITE_API_BASE=$VITE_API_BASE

COPY package*.json ./
COPY .npmrc ./

RUN npm ci

COPY . .

RUN npm run build

# --- RUN STAGE ---
# Use unprivileged Nginx image to satisfy strict non-root security boundaries
FROM nginxinc/nginx-unprivileged:1.25-alpine AS runner

# Copy production build files from builder stage
COPY --from=builder /usr/src/app/dist /usr/share/nginx/html

# Custom nginx configuration to redirect all traffic to index.html for React SPA router support
COPY --from=builder /usr/src/app/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
