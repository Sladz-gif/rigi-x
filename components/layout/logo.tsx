import Link from "next/link";

interface LogoProps {
  isScrolled?: boolean;
  pathname?: string;
}

export function Logo({ isScrolled = false, pathname = "" }: LogoProps) {
  const isTransparent = pathname === "/" && !isScrolled;

  return (
    <Link href="/" className="flex items-center gap-2 group">
      <div className="relative">
        <span className={`text-2xl font-bold tracking-tight ${isTransparent ? "text-white" : "text-ink"}`}>
          RIGI-X
        </span>
        <svg
          className="absolute -top-3 left-0 w-full h-3 text-brand"
          viewBox="0 0 100 20"
          fill="none"
        >
          <path
            d="M0 10 Q25 5, 50 10 T100 10"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </Link>
  );
}
