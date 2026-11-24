FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npm run db:generate && npm run build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production HOST=0.0.0.0 PORT=5000 CAMPUS_DB=/app/data/campus.sqlite
COPY --from=build --chown=node:node /app /app
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 5000
CMD ["npm","start"]

