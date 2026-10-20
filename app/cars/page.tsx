"use client";

import { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { CarCard } from "@/components/cars/car-card";
import { CarFilters } from "@/components/cars/car-filters";
import { cars } from "@/data/cars";
import { FilterState, SortOption, Category } from "@/types";
import { SlidersHorizontal, Grid, List, X } from "lucide-react";

function CarsPageContent() {
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState<SortOption>("recommended");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);

  // Initialize filters from URL params
  const [filters, setFilters] = useState<FilterState>(() => {
    const initial: FilterState = {};
    const category = searchParams.get("category") as Category | null;
    if (category) initial.category = category;
    return initial;
  });

  // Filter and sort cars
  const filteredCars = useMemo(() => {
    let result = [...cars];

    // Apply filters
    if (filters.category) {
      result = result.filter((car) => car.category === filters.category);
    }
    if (filters.seats) {
      result = result.filter((car) => car.seats >= filters.seats!);
    }
    if (filters.transmission) {
      result = result.filter((car) => car.transmission === filters.transmission);
    }
    if (filters.fuel) {
      result = result.filter((car) => car.fuel === filters.fuel);
    }
    if (filters.priceRange) {
      result = result.filter(
        (car) =>
          car.pricePerDay >= filters.priceRange![0] &&
          car.pricePerDay <= filters.priceRange![1]
      );
    }
    if (filters.service === "self-drive") {
      result = result.filter((car) => car.selfDriveAvailable);
    }
    if (filters.service === "chauffeur") {
      result = result.filter((car) => car.chauffeurAvailable);
    }
    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(
        (car) =>
          car.name.toLowerCase().includes(search) ||
          car.brand.toLowerCase().includes(search) ||
          car.category.includes(search)
      );
    }

    // Apply sorting
    switch (sort) {
      case "price-low-high":
        result.sort((a, b) => a.pricePerDay - b.pricePerDay);
        break;
      case "price-high-low":
        result.sort((a, b) => b.pricePerDay - a.pricePerDay);
        break;
      case "newest":
        result.sort((a, b) => b.year - a.year);
        break;
      default:
        // Recommended: popular first, then by rating
        result.sort((a, b) => {
          if (a.tag === "Popular" && b.tag !== "Popular") return -1;
          if (a.tag !== "Popular" && b.tag === "Popular") return 1;
          return (b.rating || 0) - (a.rating || 0);
        });
    }

    return result;
  }, [filters, sort]);

  const displayedCars = filteredCars.slice(0, visibleCount);
  const hasMore = filteredCars.length > visibleCount;
  const hasActiveFilters = Object.keys(filters).length > 0;

  const loadMore = () => {
    setVisibleCount((prev) => prev + 12);
  };

  return (
    <>
      <Header />
      <main id="main-content">
        <Section>
          <Container>
            {/* Breadcrumbs */}
            <nav className="mb-6 text-sm text-muted">
              <Link href="/" className="hover:text-brand">
                Home
              </Link>
              <span className="mx-2">/</span>
              <span className="text-ink">Cars</span>
            </nav>

            <div className="flex flex-col md:flex-row gap-8">
              {/* Filters Sidebar */}
              <aside className="hidden md:block w-64 flex-shrink-0">
                <CarFilters
                  filters={filters}
                  onFiltersChange={setFilters}
                />
              </aside>

              {/* Main Content */}
              <div className="flex-1">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h1 className="text-3xl font-bold text-ink mb-2">
                      Our Fleet
                    </h1>
                    <p className="text-muted">
                      {filteredCars.length} vehicle{filteredCars.length !== 1 ? "s" : ""} available
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Mobile Filter Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsFilterOpen(true)}
                      className="md:hidden"
                    >
                      <SlidersHorizontal className="w-4 h-4 mr-2" />
                      Filters
                      {hasActiveFilters && (
                        <span className="ml-2 bg-brand text-white text-xs px-2 py-0.5 rounded-full">
                          {Object.keys(filters).length}
                        </span>
                      )}
                    </Button>

                    {/* Sort */}
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value as SortOption)}
                      className="px-4 py-2 rounded-lg border border-line bg-white text-ink focus:outline-none focus:border-brand"
                    >
                      <option value="recommended">Recommended</option>
                      <option value="price-low-high">Price: Low to High</option>
                      <option value="price-high-low">Price: High to Low</option>
                      <option value="newest">Newest</option>
                    </select>

                    {/* View Toggle */}
                    <div className="flex border border-line rounded-lg overflow-hidden">
                      <button
                        onClick={() => setViewMode("grid")}
                        className={`p-2 ${
                          viewMode === "grid"
                            ? "bg-brand text-white"
                            : "bg-white text-ink hover:bg-mist"
                        }`}
                        aria-label="Grid view"
                      >
                        <Grid className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setViewMode("list")}
                        className={`p-2 ${
                          viewMode === "list"
                            ? "bg-brand text-white"
                            : "bg-white text-ink hover:bg-mist"
                        }`}
                        aria-label="List view"
                      >
                        <List className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Active Filters */}
                {hasActiveFilters && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {Object.entries(filters).map(([key, value]) => (
                      <button
                        key={key}
                        onClick={() =>
                          setFilters((prev) => {
                            const newFilters = { ...prev };
                            delete newFilters[key as keyof FilterState];
                            return newFilters;
                          })
                        }
                        className="flex items-center gap-1 px-3 py-1 bg-mist rounded-full text-sm text-ink hover:bg-line"
                      >
                        {key}: {String(value)}
                        <X className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Cars Grid */}
                {displayedCars.length > 0 ? (
                  <>
                    <div
                      className={`grid gap-6 ${
                        viewMode === "grid"
                          ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                          : "grid-cols-1"
                      }`}
                    >
                      {displayedCars.map((car) => (
                        <CarCard key={car.slug} car={car} />
                      ))}
                    </div>

                    {hasMore && (
                      <div className="text-center mt-8">
                        <Button onClick={loadMore} variant="outline">
                          Load more
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted mb-4">
                      No vehicles match your filters.
                    </p>
                    <Button onClick={() => setFilters({})}>Reset filters</Button>
                  </div>
                )}
              </div>
            </div>
          </Container>
        </Section>
      </main>
      <Footer />
      <WhatsAppButton />

      {/* Mobile Filter Drawer */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setIsFilterOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Filters</h2>
              <button
                onClick={() => setIsFilterOpen(false)}
                className="p-2 -mr-2 text-ink hover:text-brand"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <CarFilters
              filters={filters}
              onFiltersChange={setFilters}
              onClose={() => setIsFilterOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}

export default function CarsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CarsPageContent />
    </Suspense>
  );
}
