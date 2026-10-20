export type Category = "economy" | "sedan" | "suv" | "luxury" | "van";

export interface Car {
  slug: string;
  name: string;
  brand: string;
  year: number;
  category: Category;
  seats: number;
  doors: number;
  transmission: "Automatic" | "Manual";
  fuel: "Petrol" | "Diesel" | "Hybrid" | "Electric";
  luggage: number; // bags
  topSpeedKmh?: number; // only shown on luxury cars
  pricePerDay: number; // GHS
  deposit: number; // GHS
  chauffeurAvailable: boolean;
  selfDriveAvailable: boolean;
  minDays: number; // 2 for self-drive
  images: string[]; // keys from lib/images.ts
  features: string[];
  description: string;
  tag?: "Popular" | "New";
  rating?: number;
}

export interface Service {
  slug: string;
  name: string;
  description: string;
  icon: string; // lucide-react icon name
  image: string; // key from lib/images.ts
  included: string[];
  for: string[];
  howItWorks: string[];
  pricing?: string;
  relatedCategories?: Category[];
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: "Booking" | "Requirements" | "Payments" | "Insurance" | "Fuel" | "Cancellations";
}

export interface Testimonial {
  id: string;
  name: string;
  location?: string;
  text: string;
  rating: number;
}

export interface BookingFormData {
  // Step 1: Trip
  location: string;
  pickupDate: string;
  returnDate: string;
  serviceType: "self-drive" | "chauffeur";
  
  // Step 2: Car
  carSlug?: string;
  
  // Step 3: Extras & Details
  extras: {
    childSeat: boolean;
    gps: boolean;
    additionalDriver: boolean;
    chauffeur: boolean;
    fullInsurance: boolean;
  };
  driverDetails: {
    fullName: string;
    phone: string;
    email: string;
    idType: string;
    licenseNumber: string;
    ageConfirmed: boolean;
  };
  
  // Step 4: Review
  termsAccepted: boolean;
  paymentPreference: "mobile-money" | "card" | "bank-transfer";
}

export interface FilterState {
  category?: Category;
  seats?: number;
  transmission?: "Automatic" | "Manual";
  fuel?: "Petrol" | "Diesel" | "Hybrid" | "Electric";
  priceRange?: [number, number];
  service?: "self-drive" | "chauffeur";
  search?: string;
}

export type SortOption = "recommended" | "price-low-high" | "price-high-low" | "newest";
