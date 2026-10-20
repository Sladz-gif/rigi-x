"use client";

import { useState } from "react";
import { FAQ } from "@/types";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FAQAccordionProps {
  faqs: FAQ[];
}

export function FAQAccordion({ faqs }: FAQAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {faqs.map((faq) => (
        <div key={faq.id} className="bg-white rounded-xl border border-line overflow-hidden">
          <button
            onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
            className="w-full px-6 py-4 text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-brand focus:ring-inset"
            aria-expanded={openId === faq.id}
          >
            <span className="font-medium text-ink pr-4">{faq.question}</span>
            <ChevronDown
              className={cn(
                "w-5 h-5 text-muted flex-shrink-0 transition-transform",
                openId === faq.id && "rotate-180"
              )}
            />
          </button>
          <div
            className={cn(
              "px-6 overflow-hidden transition-all duration-300",
              openId === faq.id ? "pb-4" : "max-h-0"
            )}
          >
            <p className="text-muted">{faq.answer}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
