FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install -g npm@latest && npm ci --no-audit --progress=false
COPY . .
ENV NITRO_PRESET=node-server
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.output ./.output
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]