# Oasis_Go_Web

Frontend React + TypeScript + Vite cho Oasis Go.

## Chay local

```bash
npm install
npm run dev
```

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

Ban co the tham khao file mau: `.env.production.example`

## Luu y

- Khong commit file `.env.production` chua secret.
- Sau khi cap nhat env tren Netlify, can trigger deploy lai de app nhan gia tri moi.
