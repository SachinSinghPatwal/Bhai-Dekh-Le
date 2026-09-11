FROM node:24-bookworm

WORKDIR /app

COPY package*.json ./

RUN npm ci

RUN apt-get update \
    && apt-get install -y xauth xvfb \
    && rm -rf /var/lib/apt/lists/*

RUN npx playwright install --with-deps chromium

COPY . .

RUN npm run build

CMD ["sh", "-c", "echo 'CONTAINER STARTED'; xvfb-run -a --server-args='-screen 0 1920x1080x24' node dist/index.js"]