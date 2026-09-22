FROM oven/bun:1.4.0 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY tsconfig.json ./
COPY src ./src
COPY public ./public
RUN bun run build

FROM oven/bun:1.4.0
WORKDIR /app
COPY --from=build --chown=bun:bun /app/dist/server.js ./server.js
USER bun
ENV PORT=3000
EXPOSE 3000
CMD ["bun", "server.js"]
