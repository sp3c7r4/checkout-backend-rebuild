FROM node:24-alpine

WORKDIR /app

# chromium is not needed for the API/bot paths; receipts can add it later
ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY package.json package-lock.json .npmrc ./
RUN npm ci --no-audit --no-fund

COPY . .

EXPOSE 3000
CMD ["npm", "start"]
