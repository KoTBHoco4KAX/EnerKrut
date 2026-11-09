FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
RUN npm i -g pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile
COPY . .

# Vite подставляет эти значения на этапе сборки.
ARG VITE_API_BASE_URL=/api
ARG VITE_ALLOW_DEV_AUTH=false
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_ALLOW_DEV_AUTH=$VITE_ALLOW_DEV_AUTH

RUN cd apps/web && pnpm run build

FROM nginx:alpine
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80