# Rigi-X Car Rental Website

A premium car rental website for Rigi-X, built with Next.js 16, TypeScript, Tailwind CSS, and Framer Motion.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Forms**: React Hook Form + Zod
- **Testing**: Vitest

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

Note: Tests require resolving a peer dependency conflict. Run with:
```bash
npm test -- --legacy-peer-deps
```

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
    rating.tsx
    safe-image.tsx
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
  site-config.ts         # Site-wide configuration
  images.ts              # Centralized Unsplash image URLs
  pricing.ts             # Price calculation logic
  pricing.test.ts        # Unit tests for pricing
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
- WhatsApp integration for inquiries
- Dynamic pricing calculation
- Lightbox gallery for car images
- FAQ search and filtering
- Contact form with validation

### Technical
- Static generation for all pages
- Server components by default
- Type-safe with TypeScript strict mode
- SEO optimized (metadata, sitemap, robots.txt)
- JSON-LD structured data ready
- No runtime server dependencies
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

### Pages (14 total)
- **Home** (`/`) - Hero with booking search, trust strip, category browse, featured cars, how it works, services preview, stats, why choose us, promo banner, testimonials, FAQ teaser, and CTA
- **Cars** (`/cars`) - Fleet listing with filters (category, seats, transmission, fuel, price, service), sorting, grid/list toggle, URL-driven state
- **Car Detail** (`/cars/[slug]`) - Gallery with lightbox, specs, features, rental terms, sticky booking card, similar cars
- **Services** (`/services`) - Service overview with cards
- **Service Detail** (`/services/[slug]`) - What's included, who it's for, how it works, pricing, related cars
- **Book** (`/book`) - 4-step wizard (trip → car → extras & details → review) with localStorage persistence and WhatsApp/mailto handoff
- **About** (`/about`) - Story, stats, values, team, CTA
- **Rental Requirements** (`/rental-requirements`) - Document, age, payment, deposit, fuel, mileage, insurance, cross-region, late returns, cancellations
- **Membership** (`/membership`) - 3-tier comparison (Silver, Gold, Platinum) with placeholder pricing
- **FAQs** (`/faqs`) - Search, category tabs, accordion with 15 questions
- **Contact** (`/contact`) - Contact cards, form with validation, Google Maps embed
- **Privacy Policy** (`/privacy-policy`) - Placeholder legal content
- **Terms** (`/terms`) - Placeholder legal content
- **404** (`not-found.tsx`) - Friendly error page

### Components (30+)
- **UI**: Button, Container, Section, SectionHeading, Accent, Badge, Rating, SafeImage
- **Layout**: Header (sticky, mobile drawer), Footer, Logo, WhatsAppButton (floating, scroll-to-top)
- **Cars**: CarCard, CarFilters, SpecStrip, Gallery (with lightbox)
- **Booking**: BookingCard (sticky, price calculation)
- **Forms**: FAQAccordion (accessible)
- **Sections**: ServiceCard

### Data Files
- `types/index.ts` - TypeScript interfaces
- `data/cars.ts` - 12 vehicles with realistic specs
- `data/services.ts` - 6 services
- `data/faqs.ts` - 15 FAQs across 6 categories
- `data/testimonials.ts` - 6 placeholder reviews
- `lib/site-config.ts` - Site-wide configuration
- `lib/images.ts` - 30+ Unsplash image URLs
- `lib/pricing.ts` - Price calculation logic with tests

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
- No backend: all data local, forms show success with WhatsApp/mailto

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
   - Verify Unsplash URLs are still valid
   - Consider using custom photos for branding
