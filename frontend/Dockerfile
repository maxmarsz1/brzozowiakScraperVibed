# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Production (Vite/Nginx)
FROM nginx:stable-alpine AS production-vite

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

# Stage 3: Development
FROM node:20-alpine AS development

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Stage 4: For Django (just the build output)
FROM alpine:latest AS production-django
WORKDIR /app
COPY --from=build /app/dist /app/dist
CMD ["cp", "-r", "/app/dist/.", "/shared/dist/"]
