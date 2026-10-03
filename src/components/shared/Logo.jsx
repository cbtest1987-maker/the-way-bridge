import React from "react";
import { Image } from "@/components/ui/image";

const LOGO_URL = "https://media.base44.com/images/public/6aa22be9a709fe9e7a17a711/3fee3f97b_9DAE92CD-06D4-42BD-93CE-B4A0F8343963.png";

export default function Logo({ className = "", showText = true, variant = "full" }) {
  if (variant === "icon") {
    return (
      <Image
        src={LOGO_URL}
        alt="The Way Bridge AI"
        fittingType="fit"
        className={`object-contain ${className}`}
      />
    );
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <Image
        src={LOGO_URL}
        alt="The Way Bridge AI"
        fittingType="fit"
        className="object-contain w-full h-auto"
      />
      {showText && (
        <p className="text-xs text-[#9B9384] mt-2 tracking-wide">When We Pray, Things Change.</p>
      )}
    </div>
  );
}