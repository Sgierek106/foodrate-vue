# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json vite.config.ts tsconfig.json postcss.config.js tailwind.config.js ./
RUN npm ci

COPY src/ ./src/
COPY index.html ./
RUN npm run build

# Production stage - serve with Nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
# Install the config as a template so the official nginx entrypoint can
# substitute ${BACKEND_URL} at container start. Only *defined* env vars are
# substituted, so nginx's own variables ($uri, $host, ...) are left untouched.
COPY nginx.conf /etc/nginx/templates/default.conf.template
# Where the backend lives. Override per environment if the service name differs.
ENV BACKEND_URL=http://backend:3001

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
