# Image Background Remover 🖼️✂️

> 一键去除图片背景，无需注册，3 秒完成

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS
- **API**: Clipdrop API
- **Deployment**: Cloudflare Pages

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure API Key

Copy `.env.local.example` to `.env.local` and add your Clipdrop API key:

```bash
cp .env.local.example .env.local
```

Get your free API key at: https://clipdrop.co/

```env
CLIPDROP_API_KEY=your_api_key_here
```

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Features

- ✅ 拖拽/点击上传图片
- ✅ 支持 JPG/PNG，最大 10MB
- ✅ 一键移除背景
- ✅ 实时预览对比（原图/结果）
- ✅ 一键下载 PNG
- ✅ 移动端适配
- ✅ 无需注册

## Deploy to Cloudflare Pages

1. Push to GitHub
2. Connect repo to [Cloudflare Pages](https://pages.cloudflare.com/)
3. Set build command: `npm run build`
4. Set output directory: `.next`
5. Add environment variable: `CLIPDROP_API_KEY`

## License

MIT
