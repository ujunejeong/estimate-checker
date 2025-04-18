# 1. Node.js 기반 이미지 (Puppeteer 실행 가능)
FROM node:20-slim

# 2. Puppeteer가 필요한 의존 패키지 설치
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgbm1 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    wget \
    --no-install-recommends \
 && rm -rf /var/lib/apt/lists/*

# 3. 작업 디렉토리 설정
WORKDIR /app

# 4. 의존성 설치
COPY package*.json ./
RUN npm install

# 5. 앱 소스 복사
COPY . .

# 6. 환경 변수
ENV PORT=3000
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# 7. 서버 실행
CMD ["npm", "start"]
