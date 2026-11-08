# Build with repository root as context:
# docker build -f developer/deployment/Dockerfile -t mantrilo-developer .
FROM node:22-alpine AS build
WORKDIR /app/developer
COPY developer/package*.json ./
RUN npm ci
COPY developer/ ./
COPY shared/ /app/shared/
COPY assets/mantrilo-favicon.png /app/assets/mantrilo-favicon.png
RUN npm run build
FROM node:22-alpine
ENV NODE_ENV=production MANTRILO_MODE=firebase PORT=8080
WORKDIR /app/developer
COPY developer/package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/developer/dist ./dist
COPY developer/server ./server
COPY shared/ /app/shared/
USER node
EXPOSE 8080
CMD ["node", "server/index.mjs"]
