# RemoveBG Pro

> AI-powered background removal — 3 seconds, no signup required.

[![Live](https://img.shields.io/badge/Live-demo-green?style=flat-square)](https://image-background-remover.zhuwd.com)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)
[![Twitter](https://img.shields.io/badge/Twitter-@simidas_dev-blue?style=flat-square&logo=twitter)](https://twitter.com/simidas_dev)

**RemoveBG Pro** is a fast, free AI background remover built for e-commerce sellers, photographers, and developers who need to process product photos at scale.

- ⚡ **3-second processing** — AI removes backgrounds in 3 seconds
- 🆓 **Free tier** — 5 credits/month, no signup required
- 📦 **Batch-friendly** — Clean API for programmatic use
- 🔒 **Privacy-first** — Files deleted immediately after processing

![Hero](public/og-image.png)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Drag & Drop** | Upload by dragging or clicking, no account needed |
| **Real-time Preview** | Side-by-side comparison of original vs result |
| **Multiple Formats** | Supports JPG, PNG up to 10MB |
| **Mobile Ready** | Fully responsive, works on any device |
| **HD Download** | Export transparent PNG at full resolution |
| **API Access** | REST API for programmatic integration (Pro) |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router) |
| Styling | Tailwind CSS |
| AI Backend | Clipdrop API |
| Database | Cloudflare D1 (credits & sessions) |
| Storage | Cloudflare R2 (file processing) |
| Deployment | Cloudflare Pages + Workers |
| Auth | Google OAuth + PayPal Subscription |

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/Simidas/image-background-remover.git
cd image-background-remover
npm install
```

### 2. Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
# Clipdrop API (https://clipdrop.co/apis)
CLIPDROP_API_KEY=your_clipdrop_api_key

# Cloudflare (for D1 + R2)
CF_ACCOUNT_ID=your_cloudflare_account_id
CF_D1_DATABASE_ID=your_d1_database_id
CF_R2_BUCKET=your_r2_bucket_name
```

### 3. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📖 Use Cases

### E-commerce Sellers
Remove backgrounds from product photos for Shopify, Amazon, WooCommerce listings — in 3 seconds per image.

### Photographers
Clean up headshots and portraits with precise edge detection.

### Developers
Integrate via API for batch processing in your own workflow.

---

## 🌍 SEO Content

Looking for background removal guides? Read our blog:

- [Best Free Background Remover Tools (2026) — Top 10 Compared](https://image-background-remover.zhuwd.com/blog/best-free-background-remover-tools-2026)
- [How to Remove Background from Product Photos in 2026](https://image-background-remover.zhuwd.com/blog/product-photo-guide)
- [Background Remover for Shopify: Complete Workflow Guide](https://image-background-remover.zhuwd.com/blog/background-remover-for-shopify)
- [Transparent Background PNG: When and How to Use It](https://image-background-remover.zhuwd.com/blog/transparent-background-png)

---

## 🧩 API (Pro)

Coming soon — programmatic access for batch processing.

---

## 📄 License

MIT © 2026 [Simidas](https://twitter.com/simidas_dev)

---

*If you find this useful, please consider giving it a ⭐*
