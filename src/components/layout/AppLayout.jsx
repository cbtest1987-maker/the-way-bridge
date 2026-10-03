import React from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import Logo from "@/components/shared/Logo";
import NavLinks from "./NavLinks";
import UserMenu from "./UserMenu";

export default function AppLayout() {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF8F3]">
      <header className="sticky top-0 z-40 bg-[#FBF8F3]/90 backdrop-blur-md border-b border-[#E7DFD1]">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <Logo variant="icon" className="h-10 w-10" showText={false} />
            <span className="font-serif text-[17px] tracking-tight text-[#2B2620]">The Way Bridge <span className="text-[#007bff]">AI</span></span>
          </Link>
          <NavLinks user={user} currentPath={location.pathname} />
          <UserMenu user={user} />
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-[#E7DFD1] py-6 text-center text-xs text-[#9B9384]">
        <p className="mb-1">The Way Bridge AI · Prayer • Care • Connection • Community</p>
        <p className="text-[#B3AB9B]">"For nothing will be impossible with God." — Luke 1:37</p>
      </footer>
    </div>
  );
}