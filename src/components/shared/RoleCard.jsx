import React from "react";

export default function RoleCard({ icon: Icon, title, desc, requirements, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 border rounded-2xl p-4 transition-colors text-left ${selected ? "border-[#3D6E64] bg-[#EAF2EE]" : "border-[#EFE8DA] hover:border-[#8FAE9E]"}`}
    >
      <div className="w-10 h-10 rounded-full bg-[#e8ede9] flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-[#394e4a]" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-[#2B2620]">{title}</p>
        <p className="text-xs text-[#8A8375] mb-1">{desc}</p>
        <div className="flex flex-wrap gap-1">
          {requirements.map((r, i) => (
            <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-[#FBF8F3] text-[#8A8375]">{r}</span>
          ))}
        </div>
      </div>
    </button>
  );
}