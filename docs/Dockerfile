# 1단계: 빌드 환경 (Node.js)
FROM node:24-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# OpenAPI docs를 사전 생성한 상태로 빌드
RUN npm run docusaurus gen-api-docs myApi
RUN npm run build

# 2단계: 실행 환경 (Nginx) - 아주 가볍고 빠름
FROM nginx:alpine
# 빌드된 정적 파일들을 Nginx의 서빙 폴더로 복사 (baseUrl: '/wiki/' 적용에 따라 /usr/share/nginx/html/wiki/ 가 자동 구성됨)
COPY --from=builder /app/build /usr/share/nginx/html/wiki
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
