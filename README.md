# Oasis_Go_Web

Frontend React + TypeScript + Vite cho Oasis Go.

## Chay local

```bash
npm install
npm run dev
```

## Firebase Web Push config (an toan khi day len GitHub)

Project nay khong luu Firebase key that trong source control.

- Commit template files:
  - `src/config/firebase.template.ts`
  - `public/firebase-messaging-sw.template.js`
- Runtime files duoc generate tu env:
  - `src/config/firebase.ts`
  - `public/firebase-messaging-sw.js`

Lenh generate:

```bash
npm run generate:firebase-config
```

Build production se tu dong chay che do strict:

```bash
npm run build
```

Neu thieu env Firebase, build se fail som de tranh deploy sai cau hinh.

## Build production

```bash
npm run build
```

## Deploy len Netlify

Project da duoc them file `netlify.toml` de Netlify tu nhan:

- Build command: `npm run build`
- Publish directory: `dist`
- SPA redirect: tat ca route (`/*`) se tro ve `index.html`

### Bien moi truong production

Tao bien tren Netlify Site settings > Environment variables:

- `VITE_API_BASE_URL` = domain API production (vi du: `https://api.your-domain.com/api`)
- `VITE_SOCKET_URL` = domain socket production (vi du: `https://api.your-domain.com`)
- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN` (vi du: `oasisgo-auth-dev.firebaseapp.com`)
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET` (vi du: `oasisgo-auth-dev.firebasestorage.app`)
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`
- `FIREBASE_WEB_PUSH_VAPID_KEY`

Netlify se dung cac bien tren de generate file Firebase runtime truoc khi build.

Ban co the tham khao file mau: `.env.production.example`

## Luu y

- Khong commit file `.env.production` chua secret.
- Sau khi cap nhat env tren Netlify, can trigger deploy lai de app nhan gia tri moi.
