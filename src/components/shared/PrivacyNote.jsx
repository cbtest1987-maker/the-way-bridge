import React from "react";
import { ShieldCheck } from "lucide-react";

export default function PrivacyNote({ children }) {
  return (
    <div className="flex items-start gap-2 text-xs text-[#8A8375] bg-[#F3EEE1] rounded-xl px-3 py-2.5">
      <ShieldCheck className="w-4 h-4 text-[#3D6E64] shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}