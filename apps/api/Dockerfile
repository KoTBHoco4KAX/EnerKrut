FROM node:20-alpine AS builder
# Устанавливаем openssl для Prisma
RUN apk add --no-cache openssl
WORKDIR /app
RUN npm i -g pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile
COPY . .
RUN cd apps/api && npx prisma generate

FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
RUN npm i -g pnpm
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/data ./data
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
WORKDIR /app/apps/api
# Запускаем напрямую через tsx, так как папки dist нет
CMD ["pnpm", "run", "dev"]