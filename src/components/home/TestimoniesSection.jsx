import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles } from "lucide-react";

export default function TestimoniesSection() {
  const [testimonies, setTestimonies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Testimony.filter({ is_published: true }, { sort: "-created_date", limit: 6 })
      .then((res) => {
        const items = res.items || res;
        setTestimonies(Array.isArray(items) ? items : []);
      })
      .catch(() => setTestimonies([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading || testimonies.length === 0) return null;

  return (
    <section className="max-w-3xl mx-auto px-6 py-12">
      <div className="flex items-center justify-center gap-2 mb-1">
        <Sparkles className="w-5 h-5 text-[#3D6E64]" />
        <h2 className="font-serif text-xl text-[#2B2620] text-center">Testimonies of Hope</h2>
      </div>
      <p className="text-sm text-[#8A8375] text-center mb-6">Stories of prayers answered in our community</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {testimonies.map((t) => (
          <div key={t.id} className="bg-white rounded-2xl border border-[#EFE8DA] p-5">
            <p className="text-sm text-[#2B2620] leading-relaxed italic mb-3">"{t.content}"</p>
            <p className="text-xs text-[#8A8375]">— {t.is_anonymous ? "A community member" : "Shared with gratitude"}</p>
          </div>
        ))}
      </div>
    </section>
  );
}