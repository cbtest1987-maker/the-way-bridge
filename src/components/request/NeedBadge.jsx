import React from "react";
import { HandHeart, Car, UtensilsCrossed, Church, Package, Building2, Sprout, HandCoins, LifeBuoy, CheckCircle2, Clock, UserCheck } from "lucide-react";

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

const STATUS_ICONS = {
  open: Clock,
  accepted: UserCheck,
  completed: CheckCircle2,
  declined: CheckCircle2,
};

const STATUS_LABELS = {
  open: "Waiting for a volunteer",
  accepted: "A volunteer is helping",
  completed: "Completed",
  declined: "Declined",
};

const STATUS_COLORS = {
  open: "text-[#8A8375]",
  accepted: "text-[#3D6E64]",
  completed: "text-[#3D6E64]",
  declined: "text-[#8A8375]",
};

export default function NeedBadge({ type, details, status }) {
  const Icon = ICONS[type] || CheckCircle2;
  const StatusIcon = STATUS_ICONS[status] || Clock;
  const isSpinning = false;
  return (
    <div className="flex items-start gap-3 bg-[#F3EEE1] rounded-2xl p-4">
      <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-[#3D6E64]" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-[#2B2620]">{LABELS[type] || type}</p>
        {details && <p className="text-xs text-[#8A8375] mt-0.5">{details}</p>}
        {status && <p className={`text-xs mt-1 flex items-center gap-1 ${STATUS_COLORS[status] || "text-[#8A8375]"}`}>
          <StatusIcon className={`w-3 h-3 ${isSpinning ? "animate-spin" : ""}`} />
          {STATUS_LABELS[status] || status}
        </p>}
      </div>
    </div>
  );
}