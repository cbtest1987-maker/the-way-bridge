import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function BackButton({ to, label = "Back" }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => (to ? navigate(to) : navigate(-1))}
      className="inline-flex items-center gap-1.5 text-sm text-[#8A8375] hover:text-[#2B2620] transition-colors mb-4"
    >
      <ArrowLeft className="w-4 h-4" />
      {label}
    </button>
  );
}