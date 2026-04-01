# HK Lopes Store

New MVP version of the original `hklopesstore`, rebuilt as a simple Next.js app with Supabase as the database layer.

The original static project remains untouched in:

- `E:\Heberth\Negócios\Codex\hklopesstore`

This new version lives in:

- `E:\Heberth\Negócios\Codex\hk-lopes-store-web`

## What changed

- Replaced `localStorage` with Supabase tables
- Kept the UX lean and mobile-friendly
- Split the app into `/`, `/login`, and `/admin`
- Added simple Supabase Auth protection for `/admin`
- Aligned all product, variant, sale, and profit logic to the live schema
- Kept WhatsApp purchase flow simple
- Prepared the app for Vercel deployment

## Stack

- Next.js
- Supabase REST API
- Supabase Auth
- Vercel-ready server routes

## Folder structure

```text
src/
  app/
    admin/
    api/
      admin/
        sales/
        store/
      auth/
        login/
        logout/
      products/
      sales/
    login/
    globals.css
    layout.tsx
    page.tsx
  components/
    admin-dashboard.tsx
    login-form.tsx
    public-catalog.tsx
    store-app.tsx
  lib/
    auth.ts
    format.ts
    parse.ts
    store-data.ts
    supabase.ts
  types/
    store.ts
supabase/
  schema.sql
  seed.sql
```

## Routes

- `/` public catalog
- `/login` admin login
- `/admin` protected admin area

## Setup

1. Copy `.env.example` to `.env.local`.
2. Create a Supabase project.
3. Run `supabase/schema.sql` in the Supabase SQL editor.
4. Optionally run `supabase/seed.sql` for starter data.
5. Fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_WHATSAPP_NUMBER`
6. Install dependencies:
   - `npm install`
7. Start locally:
   - `npm run dev`

## Live schema used by the app

- `products(id, name, category, description, cost_price, sale_price, image_url, active, created_at)`
- `product_variants(id, product_id, name, stock, extra_price, created_at)`
- `customers(id, name, phone, created_at)`
- `sales(id, customer_id, customer_name, customer_phone, payment_method, total_amount, created_at, total_profit)`
- `sale_items(id, sale_id, product_id, variant_id, quantity, unit_price, cost_price_snapshot)`

## Pricing rules

- Public and admin sale price use `products.sale_price`
- Variant adjustment uses `product_variants.extra_price`
- Final variant price is `products.sale_price + product_variants.extra_price`
- Profit uses `sales.total_profit`

## Notes

- The app uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for the public catalog and Supabase Auth flow.
- No service role key is required for the app to start.
- For MVP speed, editing a product replaces its variant list in one go.
- The admin form accepts variant lines in this format:

```text
P | 0 | 8
M | 0 | 5
G | 5 | 3
```
