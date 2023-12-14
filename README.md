# 台南市登革熱防疫現場數位工具 - 後端

## 系統環境

- Nodejs ^18
- MongoDB ^4.4

## 安裝準備

1. Install Nodejs ^18
2. Install MongoDB ^4.4
3. Clone repository
4. Create folder "uploads" and "logs"

### 資料庫

1. Create DB 「dengue」

### 相依套件

```bash
yarn install
```

### 編輯 .env

1. rename .env.sample to .env
2. Filled .env

```
// 後端使用 Port
PORT=

// 加密 Salt
SALT=

// 允許前端 Domain CORS
CORSORIGIN=

// MONGODB 位置
MONGODB=

// 儲存檔案的 URL path
FILEBASE=

```

## 運行開發模式

```bash
node app.js
or nodemon app.js
```

## 運行正式環境

建議使用 PM2 運行

```bash
pm2 start app.js
pm2 startup
pm2 save
```
