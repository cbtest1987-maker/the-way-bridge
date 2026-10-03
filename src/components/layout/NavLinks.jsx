import React from "react";
import { Link } from "react-router-dom";

export default function NavLinks({ user, currentPath, mobile = false }) {
  const links = [];
  const roles = user?.service_roles || [];
  if (user) links.push({ to: "/journey", label: "My Journey" });
  if (roles.includes("prayer_warrior") || user?.app_role === "prayer_warrior" || user?.app_role === "prayer_team") links.push({ to: "/prayer-team", label: "Prayer Queue" });
  if (roles.includes("care_volunteer") || user?.app_role === "care_volunteer" || user?.app_role === "volunteer") links.push({ to: "/volunteer", label: "Volunteer Queue" });
  if (user?.app_role === "church_admin") links.push({ to: "/church-dashboard", label: "Church Dashboard" });
  if (user?.care_safety_reviewer || user?.role === "admin") links.push({ to: "/care-safety-review", label: "Care & Safety" });
  if (user?.role === "admin") links.push({ to: "/admin/verification", label: "Verify Churches" });
  if (user?.role === "admin") links.push({ to: "/judge", label: "Agent Audit" });
  if (user) links.push({ to: "/get-involved", label: "Get Involved" });

  return (
    <nav className={mobile ? "flex flex-col gap-4 text-sm" : "hidden md:flex items-center gap-6 text-sm"}>
      {links.map((l) => (
        <Link
          key={l.to}
          to={l.to}
          className={`transition-colors ${currentPath === l.to ? "text-[#2B2620] font-medium" : "text-[#8A8375] hover:text-[#2B2620]"}`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}