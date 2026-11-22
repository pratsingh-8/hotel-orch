# debian-slim (not alpine): Temporal's native core needs glibc
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev
COPY src ./src
EXPOSE 3000
# Default: API. The worker service overrides this command in docker-compose.
CMD ["node", "src/server.js"]
