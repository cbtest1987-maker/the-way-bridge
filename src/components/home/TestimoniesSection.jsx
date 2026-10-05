import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";

export default function TestimoniesSection() {
  const [testimonies, setTestimonies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [api, setApi] = useState(null);

  const load = useCallback(() => {
    base44.entities.Testimony.filter({ is_published: true }, { sort: "-created_date", limit: 20 })
      .then((res) => {
        const items = res.items || res;
        setTestimonies(Array.isArray(items) ? items : []);
      })
      .catch(() => setTestimonies([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const unsubscribe = base44.entities.Testimony.subscribe((event) => {
      if (event.type === "create") {
        load();
      }
    });
    return unsubscribe;
  }, [load]);

  // Auto-scroll
  useEffect(() => {
    if (!api || testimonies.length <= 1) return;
    const interval = setInterval(() => {
      if (api.canScrollNext()) {
        api.scrollNext();
      } else {
        api.scrollTo(0);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [api, testimonies.length]);

  if (loading || testimonies.length === 0) return null;

  return (
    <section className="max-w-3xl mx-auto px-6 py-12">
      <div className="flex items-center justify-center gap-2 mb-1">
        <Sparkles className="w-5 h-5 text-[#3D6E64]" />
        <h2 className="font-serif text-xl text-[#2B2620] text-center">Testimonies of Hope</h2>
      </div>
      <p className="text-sm text-[#8A8375] text-center mb-6">Stories of prayers answered in our community</p>
      <Carousel opts={{ loop: true }} setApi={setApi} className="w-full">
        <CarouselContent>
          {testimonies.map((t) => (
            <CarouselItem key={t.id} className="basis-full">
              <div className="bg-white rounded-2xl border border-[#EFE8DA] p-6">
                <p className="text-sm text-[#2B2620] leading-relaxed italic mb-3">"{t.content}"</p>
                <p className="text-xs text-[#8A8375]">— {t.is_anonymous ? "A community member" : "Shared with gratitude"}</p>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  );
}