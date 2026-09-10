import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import { LogOut } from "lucide-react";

export default function UserMenu({ user }) {
  const { logout } = useAuth();
  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link to="/login">
          <Button variant="ghost" size="sm" className="text-[#2B2620]">Log in</Button>
        </Link>
        <Link to="/register">
          <Button size="sm" className="bg-[#3D6E64] hover:bg-[#2F5850] text-white rounded-full px-4">Sign up</Button>
        </Link>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <span className="hidden sm:inline text-sm text-[#8A8375]">{user.full_name?.split(" ")[0]}</span>
      <button
        onClick={() => logout()}
        className="w-8 h-8 rounded-full flex items-center justify-center text-[#8A8375] hover:text-[#2B2620] hover:bg-[#EFE8DA] transition-colors"
        title="Log out"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
}