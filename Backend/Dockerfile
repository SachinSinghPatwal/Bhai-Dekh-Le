FROM node:24-bookworm

WORKDIR /app

COPY package*.json ./

RUN npm ci

RUN apt-get update && apt-get install -y xauth \
    && rm -rf /var/lib/apt/lists/*

RUN npx playwright install --with-deps chromium

COPY . .

RUN npm run build

CMD ["xvfb-run", "--server-args=-screen 0 1920x1080x24", "npm", "start"]