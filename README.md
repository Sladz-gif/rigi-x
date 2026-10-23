# Rigi-X Car Rental Website

A premium car rental website for Rigi-X, built with Next.js 16, TypeScript, Tailwind CSS, and Framer Motion — plus a guest checkout flow and a hidden staff admin at `/rigi-admin`.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Forms**: React Hook Form + Zod
- **Testing**: Vitest
- **Data layer**: browser mock API (`lib/mock`) — no server or payment provider required

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint over the whole repo |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest (unit + integration) |

### Build for Production

```bash
npm run build
npm start
```

## Deployment

### Vercel (Recommended)

This project is optimized for Vercel deployment:

1. **Deploy via Vercel Dashboard:**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import from GitHub (Sladz-gif/rigi-x)
   - Vercel will auto-detect Next.js settings

2. **Deploy via CLI:**
```bash
npm install -g vercel
vercel login
vercel
```

3. **Environment Variables:**
   - Add `NEXT_PUBLIC_SITE_URL` in Vercel Dashboard
   - Optional: Add social media URLs, Google Analytics ID

4. **Custom Domain:**
   - Add your domain in Project Settings > Domains
   - Follow Vercel's DNS configuration instructions

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

### Run Tests

```bash
npm test
```

Unit tests cover pricing and the role/permission map; integration tests cover the full
checkout lifecycle (initialise → confirm → guest lookup) against the mock API.

## Checkout (demo mode)

Guest checkout runs entirely in the browser — there is **no Paystack account, no API key
and no server**. The mock API in `lib/mock/api.ts` mirrors the shape of the intended
endpoints so the real ones can be dropped in later without touching the UI:

| Mock function | Stands in for |
| --- | --- |
| `initializeCheckout()` | `POST /api/checkout/initialize` |
| `confirmCheckoutPayment()` | `GET /api/checkout/verify` + the `charge.success` webhook |
| `abandonCheckout()` | customer closing the payment popup |
| `lookupBooking()` | guest booking lookup by reference + email/phone |
| `validatePromo()` | promo code validation |

Flow:

1. Entry points — **Rent this car** (car page, mobile bar) and **Proceed to Checkout**
   (booking card) link to `/checkout?car=…&startDate=…&endDate=…&serviceType=…`.
2. `/checkout` — 3 steps (Details → Review → Payment) with a sticky order summary on
   desktop and a compact summary bar on mobile. A DEMO MODE banner is always shown.
3. Payment opens a simulated Paystack popup (card / mobile money / bank transfer) that
   can be completed or cancelled.
4. Success → `/checkout/success?ref=…` (add to calendar, download receipt, WhatsApp).
   Failure/cancel → `/checkout/failed?ref=…` with a retry link.
5. `/booking/lookup` — guests recover a booking with the reference **and** the email or
   phone used at checkout; a mismatch returns nothing so references can't be enumerated.

Every confirmation writes a real-looking trail into the mock database: booking →
confirmed, payment → success, a held deposit, a paid receipt invoice, an email outbox
row, an audit log entry, and the customer's spend updated.

## Hidden admin (`/rigi-admin`)

An unlisted, `noindex` staff area. The path comes from `siteConfig.adminBasePath` and is
excluded from `robots.txt` and the sitemap.

- **Sign-in** at `/rigi-admin/login`. Demo accounts are in `lib/mock/auth.ts`
  (the seeded super admin password is `1234` and forces a change on first login).
  Five failed attempts lock the account for 15 minutes.
- **Roles & permissions** — 8 roles (`super_admin`, `admin`, `manager`, `hr`, `finance`,
  `sales`, `support`, `fleet`) mapped to modules and capabilities in `lib/permissions.ts`.
  A role only sees the sidebar items it can open.
- **Layout** — fixed full-height sidebar (260px desktop → 72px tablet rail → mobile
  drawer), top bar with breadcrumbs, `Ctrl/Cmd+K` search palette, notifications and the
  account menu.
- **Modules** — Dashboard, Sales, Customers, Customer Service, Fleet, Maintenance,
  Inventory, Finance, HR, Marketing, Settings.

## Project Structure

```
app/
  layout.tsx              # Root layout with fonts and metadata
  page.tsx               # Home page
  not-found.tsx          # 404 page
  sitemap.ts             # SEO sitemap
  robots.ts              # SEO robots.txt
  cars/
    page.tsx             # Fleet listing with filters
    [slug]/page.tsx      # Individual car detail pages
  services/
    page.tsx             # Services overview
    [slug]/page.tsx      # Individual service pages
  book/page.tsx          # Multi-step booking wizard
  checkout/
    page.tsx             # 3-step guest checkout (Details → Review → Payment)
    success/page.tsx     # Booking confirmed + receipt
    failed/page.tsx      # Payment failed / cancelled + retry
  booking/lookup/page.tsx  # Guest booking lookup (reference + email/phone)
  rigi-admin/            # Hidden staff admin (noindex)
    layout.tsx           # Admin shell (sidebar + top bar)
    login/page.tsx       # Staff sign-in
    page.tsx             # Dashboard
    sales|hr|finance|... page.tsx  # 10 further modules
  about/page.tsx         # About page
  rental-requirements/page.tsx  # Rental requirements
  membership/page.tsx    # Membership tiers
  faqs/page.tsx          # FAQ page with search
  contact/page.tsx       # Contact page with form
  privacy-policy/page.tsx
  terms/page.tsx

components/
  ui/                    # Reusable UI components
    button.tsx
    accent.tsx
    container.tsx
    section.tsx
    section-heading.tsx
    badge.tsx
    modal.tsx
    toast.tsx
    rating.tsx
    safe-image.tsx
  admin/                 # Admin kit
    shell.tsx            # Sidebar, top bar, command palette
    ui.tsx               # DataTable, StatCard, form controls
    charts.tsx           # Recharts wrappers (lazy loaded)
    session.tsx          # Admin session guard
  layout/                # Layout components
    header.tsx
    footer.tsx
    logo.tsx
    whatsapp-button.tsx
  cars/                  # Car-specific components
    car-card.tsx
    car-filters.tsx
    spec-strip.tsx
    gallery.tsx
  booking/               # Booking components
    booking-card.tsx
  sections/              # Page section components
    service-card.tsx
  forms/                 # Form components
    faq-accordion.tsx

data/
  cars.ts                # Car fleet data
  services.ts            # Services data
  faqs.ts                # FAQ data
  testimonials.ts        # Customer testimonials

lib/
  mock/                  # Simulated backend (no network)
    store.ts             # In-browser DB, persisted to localStorage
    seed.ts              # Deterministic seed data
    api.ts               # Checkout / booking / search "endpoints"
    auth.ts              # Mock staff sessions
    types.ts             # Mock record types
  site-config.ts         # Site-wide configuration
  images.ts              # Centralized Unsplash image URLs
  pricing.ts             # Price + checkout total calculation
  permissions.ts         # Roles, module access, capabilities
  admin-nav.ts           # Admin sidebar definition
  csv.ts                 # CSV export helpers
  utils.ts               # Utility functions

types/
  index.ts               # TypeScript type definitions
```

## Editing Data

### Car Fleet

Edit `data/cars.ts` to add, remove, or modify vehicles in the fleet. Each car requires:
- Basic info (name, brand, year, category)
- Specs (seats, doors, transmission, fuel, luggage)
- Pricing (pricePerDay, deposit)
- Features list
- Image keys (must exist in `lib/images.ts`)

### Images

All images are centralized in `lib/images.ts`. To add or change images:
1. Find a suitable Unsplash photo
2. Verify the URL returns HTTP 200
3. Add an entry to the images object with a unique key
4. Reference the key in car data or components

### Site Configuration

Edit `lib/site-config.ts` to update:
- Contact information (phone, email, address)
- Social media links
- WhatsApp number and message
- Opening hours
- Stats and promo codes
- Google Maps query

### Services

Edit `data/services.ts` to modify service offerings and descriptions.

### FAQs

Edit `data/faqs.ts` to update frequently asked questions.

### Testimonials

Edit `data/testimonials.ts` to add customer reviews. Replace placeholder entries with real reviews before launch.

## Placeholders to Replace

Before going live, review and replace the following placeholders:

### Configuration (lib/site-config.ts)
- [ ] Update `url` with actual domain
- [ ] Update social media links (`instagram`, `facebook`, `x`, `tiktok`)
- [ ] Confirm `openingHours` (currently placeholder: "Mon-Sun 7am-9pm")
- [ ] Add `videoUrl` when available
- [ ] Confirm `mapQuery` address accuracy

### Car Data (data/cars.ts)
- [ ] Confirm all car specifications are accurate
- [ ] Verify all pricing is correct
- [ ] Confirm fuel types match actual vehicles
- [ ] Verify topSpeedKmh for luxury cars is realistic
- [ ] Replace placeholder cars (currently marked as such in comments)

### Services (data/services.ts)
- [ ] Confirm all service descriptions are accurate
- [ ] Verify pricing hints are correct
- [ ] Update "What's included" lists if needed

### Testimonials (data/testimonials.ts)
- [ ] Replace all placeholder testimonials with real customer reviews
- [ ] Verify names and locations are accurate

### Membership (app/membership/page.tsx)
- [ ] Replace all "NOTE: placeholder" pricing with actual membership prices (lines 16, 28, 41)
- [ ] Confirm all benefits are accurate
- [ ] Update tier names if needed

### Rental Requirements (app/rental-requirements/page.tsx)
- [ ] Confirm age requirements (line 26: NOTE)
- [ ] Confirm insurance details (line 72: NOTE)

### Contact (app/contact/page.tsx)
- [ ] Confirm opening hours (line 174: NOTE placeholder)
- [ ] Verify all phone numbers and emails
- [ ] Confirm address and digital address

### Legal Pages
- [ ] Review and replace privacy policy with legal counsel
- [ ] Review and replace terms of service with legal counsel
- [ ] Update "Last updated" dates

### Images (lib/images.ts)
- [ ] Add photographer credits where known
- [ ] Verify all Unsplash URLs are still valid
- [ ] Consider using custom photos for better branding

## Features

### User-Facing
- Responsive design (mobile-first, 360px to 1920px)
- Accessible (WCAG AA compliant)
- Fast loading (Lighthouse 90+ target)
- Searchable and filterable car fleet
- Multi-step booking wizard with localStorage persistence
- 3-step guest checkout with sticky order summary and simulated Paystack payment
- Guest booking lookup by reference + email/phone
- Calendar (.ics) and receipt downloads on the confirmation page
- WhatsApp integration for inquiries
- Dynamic pricing calculation (extras, promo codes, VAT, delivery)
- Lightbox gallery for car images
- FAQ search and filtering
- Contact form with validation

### Staff admin (`/rigi-admin`)
- Unlisted, `noindex`, excluded from robots.txt and the sitemap
- Separate staff login with lockout and forced first-login password change
- 8 roles gating 11 modules and 5 capabilities
- Dashboard, Sales, Customers, Customer Service, Fleet, Maintenance, Inventory,
  Finance, HR, Marketing and Settings
- Command palette (`Ctrl/Cmd+K`), notifications, CSV export, audit log
- Fully responsive: 260px sidebar → 72px rail → mobile drawer

### Technical
- Static generation for all pages (`generateStaticParams` for dynamic routes)
- Server components by default, client components only where needed
- Type-safe with TypeScript strict mode
- SEO optimized (metadata, sitemap, robots.txt)
- No runtime server, API keys or payment-provider dependencies — the mock layer in
  `lib/mock` stands in for the future backend
- Unit + integration tests with Vitest
- Image optimization with next/image

## Performance Targets

- Lighthouse Performance: ≥90
- Lighthouse Accessibility: ≥90
- Lighthouse Best Practices: ≥90
- Lighthouse SEO: ≥90

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

Copyright © {new Date().getFullYear()} Rigi-X. All rights reserved.

---

## Summary of What Was Built

This is a complete, production-quality frontend website for Rigi-X car rental company. The project includes:

### Pages (21 public + 12 admin)
- **Home** (`/`) - Hero with booking search, trust strip, category browse, featured cars, how it works, services preview, stats, why choose us, promo banner, testimonials, FAQ teaser, and CTA
- **Cars** (`/cars`) - Fleet listing with filters (category, seats, transmission, fuel, price, service), sorting, grid/list toggle, URL-driven state
- **Car Detail** (`/cars/[slug]`) - Gallery with lightbox, specs, features, rental terms, sticky booking card, mobile "Rent this car" bar, similar cars
- **Services** (`/services`) - Service overview with cards
- **Service Detail** (`/services/[slug]`) - What's included, who it's for, how it works, pricing, related cars
- **Book** (`/book`) - 4-step wizard (trip → car → extras & details → review) with localStorage persistence and WhatsApp/mailto handoff
- **Checkout** (`/checkout`) - 3-step guest checkout (Details → Review → Payment) with sticky/mobile summaries and a simulated Paystack popup
- **Checkout Success** (`/checkout/success`) - Confirmation with `.ics` calendar and `.txt` receipt downloads
- **Checkout Failed** (`/checkout/failed`) - Cancellation/failure page with retry link
- **Booking Lookup** (`/booking/lookup`) - Guest booking recovery by reference + email/phone
- **About**, **Rental Requirements**, **Membership**, **FAQs**, **Contact**, **Privacy Policy**, **Terms**, **404**
- **Admin** (`/rigi-admin`) - Login plus 11 role-gated modules (see the Hidden admin section)

### Data Files
- `types/index.ts` - TypeScript interfaces
- `data/cars.ts` - 12 vehicles with realistic specs
- `data/services.ts` - 6 services
- `data/faqs.ts` - 15 FAQs across 6 categories
- `data/testimonials.ts` - 6 placeholder reviews
- `lib/mock/seed.ts` - Deterministic seed for the whole mock database
- `lib/site-config.ts` - Site-wide configuration
- `lib/images.ts` - 30+ Unsplash image URLs
- `lib/pricing.ts` - Price and checkout total logic (unit tested)
- `lib/permissions.ts` - Roles, module access, capabilities (unit tested)
- `lib/mock/api.ts` - Checkout/booking/search endpoints (integration tested)

### Technical Features
- Next.js 16.4.2 with App Router
- TypeScript strict mode
- Tailwind CSS 4 with custom theme tokens
- Server components by default, client components where needed
- Static generation with `generateStaticParams` for dynamic routes
- SEO: metadata, sitemap, robots.txt
- Accessible: skip links, ARIA labels, keyboard navigation, focus rings
- Responsive: mobile-first (360px to 1920px)
- Performance: next/image optimization, lazy loading, component caching
- No backend: the mock API in `lib/mock` simulates the server, Paystack and email

### All Placeholders to Replace

1. **lib/site-config.ts**
   - `url` - Update with actual domain
   - Social media links (`instagram`, `facebook`, `x`, `tiktok`)
   - `openingHours` - Currently "Mon-Sun 7am-9pm" (placeholder)
   - `videoUrl` - Add when available
   - `mapQuery` - Confirm address accuracy

2. **data/cars.ts**
   - All car specifications and prices (marked with NOTE at top)
   - Replace placeholder cars with actual fleet data

3. **data/testimonials.ts**
   - All 6 testimonials are placeholders (marked with NOTE at top)
   - Replace with real customer reviews

4. **app/membership/page.tsx**
   - Membership tier prices (lines 16, 28, 41: "NOTE: placeholder")
   - Confirm benefits are accurate

5. **app/rental-requirements/page.tsx**
   - Age requirements (line 26: NOTE)
   - Insurance details (line 72: NOTE)

6. **app/contact/page.tsx**
   - Opening hours (line 174: NOTE placeholder)

7. **app/privacy-policy/page.tsx**
   - All content - review with legal counsel (line 24: NOTE)

8. **app/terms/page.tsx**
   - All content - review with legal counsel (line 24: NOTE)

9. **lib/images.ts**
   - Add photographer credits where known
   - Verify all Unsplash URLs are still valid
   - Consider using custom photos for branding

## Going live: replacing the demo layer

Everything the site needs to look and behave "connected" is faked in the browser. To
switch to a real backend and Paystack:

1. **Staff accounts** - `lib/mock/auth.ts` ships demo logins (super admin password `1234`).
   Replace with real hashed credentials before the admin is reachable in production.
2. **Admin URL** - change `siteConfig.adminBasePath` to move the unlisted admin path.
3. **Checkout endpoints** - swap the bodies of `initializeCheckout`,
   `confirmCheckoutPayment`, `abandonCheckout`, `lookupBooking` and `validatePromo` in
   `lib/mock/api.ts` for `fetch('/api/...')` calls; the component code does not change.
4. **Storage** - `lib/mock/store.ts` persists to `localStorage`; replace with the real
   database calls. `prisma/schema.prisma` and `prisma/seed.ts` sketch the intended shape.
