// NOTE: Edit these values to update site-wide configuration

export const siteConfig = {
  name: 'Rigi-X',
  tagline: 'Premium car rentals at everyday prices',
  description: 'Self-drive or chauffeur-driven car rentals in Accra, Ghana. Transparent pricing, no hidden fees, delivered across Accra.',
  url: 'https://rigi-x.com', // Update with actual domain
  
  // Contact
  phone: '+233 53 884 8346',
  phoneFormatted: '+233538848346',
  phoneAdmin: '+233 53 884 8346',
  phoneSupport: '+233 54 417 8699',
  emailAdmin: 'admin@rigi-x.com',
  emailSupport: 'support@rigi-x.com',
  emailCareers: 'careers@rigi-x.com',
  
  // Address
  address: 'C 107/14 Dzorwulu Crescent, Accra, Ghana',
  digitalAddress: 'GA-122-1897',
  
  // WhatsApp
  whatsappNumber: '233538848346',
  whatsappMessage: 'Hi Rigi-X, I would like to inquire about a car rental.',
  
  // Social links (placeholder URLs - update with real ones)
  social: {
    instagram: '#',
    facebook: '#',
    x: '#',
    tiktok: '#',
  },
  
  // Stats
  stats: {
    rentalsServed: 20000,
    regionsCovered: 16,
    cars: 50,
    yearsExperience: 10,
  },
  
  // Promo
  promoCode: 'ONLINE15',
  promoDiscount: 15, // percentage
  
  // Opening hours (NOTE: placeholder - confirm with client)
  openingHours: 'Mon-Sun 7am-9pm',
  
  // Google Maps
  mapQuery: 'C 107/14 Dzorwulu Crescent, Accra',
  
  // Video (NOTE: placeholder - add video URL when available)
  videoUrl: '',
} as const;

export type SiteConfig = typeof siteConfig;
