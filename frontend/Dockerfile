FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
# Valores padrão para o docker compose local; no Render vêm das variáveis de ambiente
ENV USER_URL=http://127.0.0.1:8003 \
    PAYMENT_URL=http://127.0.0.1:8004 \
    PORT=80 \
    ENROLLMENT_URL=http://enrollment-service:8000 \
    ATTENDANCE_URL=http://attendance-service:8000
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
