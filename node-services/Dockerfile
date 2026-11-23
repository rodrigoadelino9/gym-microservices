FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --chown=node:node server.js ./
COPY --chown=node:node user-service ./user-service
COPY --chown=node:node payment-service ./payment-service
USER node
CMD ["npm", "run", "start:user"]
