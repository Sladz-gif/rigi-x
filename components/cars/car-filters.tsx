"use client";

import { FilterState, Category } from "@/types";
import { Button } from "@/components/ui/button";

interface CarFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onClose?: () => void;
}

export function CarFilters({ filters, onFiltersChange, onClose }: CarFiltersProps) {
  const categories: Category[] = ["economy", "sedan", "suv", "luxury", "van"];
  const transmissions = ["Automatic", "Manual"] as const;
  const fuels = ["Petrol", "Diesel", "Hybrid", "Electric"] as const;

  const updateFilter = (key: keyof FilterState, value: FilterState[keyof FilterState]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearAll = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-ink">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="text-sm text-brand hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Category */}
      <div>
        <h4 className="font-medium text-ink mb-3">Category</h4>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() =>
                updateFilter(
                  "category",
                  filters.category === cat ? undefined : cat
                )
              }
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filters.category === cat
                  ? "bg-brand text-white"
                  : "bg-mist text-ink hover:bg-line"
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Seats */}
      <div>
        <h4 className="font-medium text-ink mb-3">Seats</h4>
        <div className="flex flex-wrap gap-2">
          {[2, 4, 5, 7].map((seats) => (
            <button
              key={seats}
              onClick={() =>
                updateFilter("seats", filters.seats === seats ? undefined : seats)
              }
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filters.seats === seats
                  ? "bg-brand text-white"
                  : "bg-mist text-ink hover:bg-line"
              }`}
            >
              {seats}+ seats
            </button>
          ))}
        </div>
      </div>

      {/* Transmission */}
      <div>
        <h4 className="font-medium text-ink mb-3">Transmission</h4>
        <div className="flex flex-wrap gap-2">
          {transmissions.map((trans) => (
            <button
              key={trans}
              onClick={() =>
                updateFilter(
                  "transmission",
                  filters.transmission === trans ? undefined : trans
                )
              }
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filters.transmission === trans
                  ? "bg-brand text-white"
                  : "bg-mist text-ink hover:bg-line"
              }`}
            >
              {trans}
            </button>
          ))}
        </div>
      </div>

      {/* Fuel */}
      <div>
        <h4 className="font-medium text-ink mb-3">Fuel Type</h4>
        <div className="flex flex-wrap gap-2">
          {fuels.map((fuel) => (
            <button
              key={fuel}
              onClick={() =>
                updateFilter("fuel", filters.fuel === fuel ? undefined : fuel)
              }
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filters.fuel === fuel
                  ? "bg-brand text-white"
                  : "bg-mist text-ink hover:bg-line"
              }`}
            >
              {fuel}
            </button>
          ))}
        </div>
      </div>

      {/* Service Type */}
      <div>
        <h4 className="font-medium text-ink mb-3">Service Type</h4>
        <div className="flex flex-wrap gap-2">
          {["self-drive", "chauffeur"].map((service) => (
            <button
              key={service}
              onClick={() =>
                updateFilter(
                  "service",
                  filters.service === service ? undefined : service
                )
              }
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filters.service === service
                  ? "bg-brand text-white"
                  : "bg-mist text-ink hover:bg-line"
              }`}
            >
              {service === "self-drive" ? "Self-drive" : "Chauffeur"}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h4 className="font-medium text-ink mb-3">Price per day (₵)</h4>
        <div className="space-y-2">
          <input
            type="range"
            min="0"
            max="10000"
            step="100"
            value={filters.priceRange?.[1] || 10000}
            onChange={(e) =>
              updateFilter("priceRange", [0, parseInt(e.target.value)])
            }
            className="w-full"
          />
          <div className="flex justify-between text-sm text-muted">
            <span>₵0</span>
            <span>₵{(filters.priceRange?.[1] || 10000).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {onClose && (
        <Button onClick={onClose} className="w-full md:hidden">
          Apply Filters
        </Button>
      )}
    </div>
  );
}
