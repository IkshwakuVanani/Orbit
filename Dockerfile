FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev
ENV HOST=0.0.0.0 NODE_ENV=production
EXPOSE 4000
CMD ["npm","start"]
