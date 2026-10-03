import React from "react";

const STYLES = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  submitted: "bg-amber-50 text-amber-700 border-amber-200",
  safe: "bg-emerald-50 text-emerald-700 border-emerald-200",
  sensitive: "bg-amber-50 text-amber-700 border-amber-200",
  flagged: "bg-red-50 text-red-700 border-red-200",
  danger: "bg-red-100 text-red-800 border-red-300",
  matched: "bg-sky-50 text-sky-700 border-sky-200",
  connected: "bg-[#EAF2EE] text-[#3D6E64] border-[#BFD9CD]",
  answered: "bg-violet-50 text-violet-700 border-violet-200",
  closed: "bg-stone-100 text-stone-500 border-stone-200",
  offered: "bg-sky-50 text-sky-700 border-sky-200",
  requester_review: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  declined: "bg-stone-100 text-stone-500 border-stone-200",
  verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  none: "bg-stone-100 text-stone-500 border-stone-200",
  open: "bg-amber-50 text-amber-700 border-amber-200",
  resolved: "bg-stone-100 text-stone-500 border-stone-200",
  prayer_care: "bg-[#EAF2EE] text-[#3D6E64] border-[#BFD9CD]",
};

export default function StatusBadge({ status, label }) {
  const cls = STYLES[status] || "bg-stone-100 text-stone-500 border-stone-200";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label || status?.replace(/_/g, " ")}
    </span>
  );
}