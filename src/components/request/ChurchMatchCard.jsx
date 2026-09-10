import React from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Check } from "lucide-react";

export default function ChurchMatchCard({ church, percent, selected, onSelect }) {
  return (
    <div className={`border rounded-2xl p-4 transition-all ${selected ? "border-[#3D6E64] bg-[#EAF2EE]" : "border-[#EFE8DA] bg-white"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-[#2B2620]">{church.name}</p>
          <p className="text-xs text-[#8A8375] flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3" /> {church.location}
          </p>
        </div>
        <span className="text-xs font-semibold text-[#3D6E64] bg-[#EAF2EE] px-2 py-0.5 rounded-full shrink-0">
          {percent}% Match
        </span>
      </div>
      {church.ministries?.length > 0 && (
        <p className="text-xs text-[#8A8375] mt-2">{church.ministries.slice(0, 3).join(" · ")}</p>
      )}
      <Button
        onClick={onSelect}
        variant={selected ? "default" : "outline"}
        size="sm"
        className={`w-full mt-3 rounded-full ${selected ? "bg-[#3D6E64] hover:bg-[#2F5850]" : ""}`}
      >
        {selected ? <><Check className="w-4 h-4 mr-1" /> Selected</> : "Review & Connect"}
      </Button>
    </div>
  );
}