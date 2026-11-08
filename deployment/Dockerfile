FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG EXPO_PUBLIC_CONTACT_EMAIL
ENV EXPO_PUBLIC_CONTACT_EMAIL=$EXPO_PUBLIC_CONTACT_EMAIL
ARG EXPO_PUBLIC_SITE_URL
ARG EXPO_PUBLIC_INDEXING_ENABLED=false
ENV EXPO_PUBLIC_SITE_URL=$EXPO_PUBLIC_SITE_URL
ENV EXPO_PUBLIC_INDEXING_ENABLED=$EXPO_PUBLIC_INDEXING_ENABLED
RUN npm run build
FROM nginxinc/nginx-unprivileged:stable-alpine
COPY deployment/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
COPY --from=build /app/dist/nginx-seo.conf /etc/nginx/mantrilo-seo.conf
RUN rm /usr/share/nginx/html/nginx-seo.conf
EXPOSE 8080
