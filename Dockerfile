# npmパッケージのインストール
FROM node:alpine AS npm-installer
WORKDIR /npm-installer
COPY package*.json .
RUN npm install --omit=dev

# typescriptのコンパイル
FROM node:alpine AS ts-builder
WORKDIR /ts-builder
COPY app.ts tsconfig.json package*.json ./
RUN npm install
RUN npm run build

FROM alpine:latest
RUN apk add --no-cache nodejs
WORKDIR /app
COPY --from=npm-installer /npm-installer/node_modules ./node_modules
COPY --from=ts-builder /ts-builder/app.js .
COPY .env .
CMD [ "node", "app.js" ]
