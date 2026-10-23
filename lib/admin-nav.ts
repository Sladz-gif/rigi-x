import type { AdminModule } from "./permissions";

export interface AdminNavItem {
  module: AdminModule;
  label: string;
  href: string;
  icon: string; // lucide-react icon name
}

/**
 * Exactly 11 top-level items, so the sidebar fits at 720px height and above.
 * Sub-pages are tabs inside each page, never nested sidebar items.
 */
export const ADMIN_NAV: AdminNavItem[] = [
  { module: "dashboard", label: "Dashboard", href: "/rigi-admin", icon: "LayoutDashboard" },
  { module: "sales", label: "Sales", href: "/rigi-admin/sales", icon: "TrendingUp" },
  { module: "customers", label: "Customers", href: "/rigi-admin/customers", icon: "Users" },
  { module: "support", label: "Customer Service", href: "/rigi-admin/support", icon: "Headphones" },
  { module: "fleet", label: "Fleet", href: "/rigi-admin/fleet", icon: "Car" },
  { module: "maintenance", label: "Maintenance", href: "/rigi-admin/maintenance", icon: "Wrench" },
  { module: "inventory", label: "Inventory", href: "/rigi-admin/inventory", icon: "Package" },
  { module: "finance", label: "Finance", href: "/rigi-admin/finance", icon: "Banknote" },
  { module: "hr", label: "HR", href: "/rigi-admin/hr", icon: "IdCard" },
  { module: "marketing", label: "Marketing", href: "/rigi-admin/marketing", icon: "Megaphone" },
  { module: "settings", label: "Settings", href: "/rigi-admin/settings", icon: "Settings" },
];
