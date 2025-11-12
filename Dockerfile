# 1) Build 
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

# 2) Caddy como servidor estático
FROM caddy:2-alpine
WORKDIR /srv
COPY --from=build /app/dist /usr/share/caddy
COPY Caddyfile /etc/caddy/Caddyfile
