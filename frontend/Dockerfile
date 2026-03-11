FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json ./
RUN npm install

FROM deps AS builder
WORKDIR /app

COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app /app
RUN npm prune --omit=dev

EXPOSE 3001
CMD ["npm", "run", "start"]
