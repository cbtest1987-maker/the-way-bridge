import React from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Heart } from "lucide-react";
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
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3D6E64] to-[#8FAE9E] flex items-center justify-center">
              <Heart className="w-4 h-4 text-white" strokeWidth={2.2} />
            </div>
            <span className="font-serif text-[17px] tracking-tight text-[#2B2620]">theWay Bridge</span>
          </Link>
          <NavLinks user={user} currentPath={location.pathname} />
          <UserMenu user={user} />
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-[#E7DFD1] py-6 text-center text-xs text-[#9B9384]">
        theWay Bridge AI · Prayer changes things.
      </footer>
    </div>
  );
}