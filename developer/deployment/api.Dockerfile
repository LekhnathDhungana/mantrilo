# Mantrilo public API (api.mantrilo.com). Build with the repository root as context:
# docker build -f developer/deployment/api.Dockerfile -t mantrilo-api .
FROM node:22-alpine
ENV NODE_ENV=production PORT=8080
WORKDIR /app/developer
COPY developer/package*.json ./
RUN npm ci --omit=dev
COPY developer/api ./api
COPY developer/server ./server
COPY shared/ /app/shared/
USER node
EXPOSE 8080
CMD ["node", "api/index.mjs"]
