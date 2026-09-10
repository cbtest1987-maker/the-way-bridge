import React from "react";
import { HandHeart, Car, UtensilsCrossed, Church, Package, Building2, Sprout, HandCoins, LifeBuoy, CheckCircle2 } from "lucide-react";

const ICONS = {
  prayer: HandHeart,
  transportation: Car,
  food: UtensilsCrossed,
  church_connection: Church,
  resources: Package,
  building: Building2,
  church_planting: Sprout,
  fundraising: HandCoins,
  disaster: LifeBuoy,
};

const LABELS = {
  prayer: "Prayer",
  transportation: "Transportation",
  food: "Food & Community Support",
  church_connection: "Church Connection",
  resources: "Resources",
  building: "Building Need",
  church_planting: "Church Planting",
  fundraising: "Fundraising / Partnership",
  disaster: "Disaster Response",
};

export default function NeedBadge({ type, details }) {
  const Icon = ICONS[type] || CheckCircle2;
  return (
    <div className="flex items-start gap-3 bg-[#F3EEE1] rounded-2xl p-4">
      <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-[#3D6E64]" />
      </div>
      <div>
        <p className="text-sm font-medium text-[#2B2620]">{LABELS[type] || type}</p>
        {details && <p className="text-xs text-[#8A8375] mt-0.5">{details}</p>}
      </div>
      <CheckCircle2 className="w-4 h-4 text-[#3D6E64] ml-auto shrink-0 mt-1" />
    </div>
  );
}