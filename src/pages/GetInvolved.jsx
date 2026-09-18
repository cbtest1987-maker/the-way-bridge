import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { HandHeart, Car, Church } from "lucide-react";

export default function GetInvolved() {
  const { user, checkUserAuth } = useAuth();
  const [churches, setChurches] = useState([]);
  const [selected, setSelected] = useState(user?.church_id || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.Church.filter({ verification_status: "verified" }).then(setChurches);
  }, []);

  const join = async (role) => {
    if (!isLoggedIn) {
      window.location.href = `/login?returnTo=${encodeURIComponent("/get-involved")}`;
      return;
    }
    if (!selected) return;
    setSaving(true);
    await base44.auth.updateMe({
      app_role: role,
      church_id: selected,
      volunteer_status: role === "volunteer" ? "pending" : "none",
    });
    await checkUserAuth();
    setSaving(false);
  };

  const hasChurch = !!user?.church_id;
  const isLoggedIn = !!user;

  return (
    <div className="max-w-lg mx-auto px-6 py-10">
      <h1 className="font-serif text-2xl text-[#2B2620] mb-1">Get Involved</h1>
      <p className="text-sm text-[#8A8375] mb-6">Choose a verified church and how you'd like to serve.</p>

      {!isLoggedIn && (
        <div className="bg-[#EAF2EE] border border-[#BFD9CD] rounded-2xl p-4 mb-5 text-sm text-[#2B2620]">
          <p className="font-medium mb-1">New here? Pick a role below to get started.</p>
          <p className="text-xs text-[#5B5648]">You'll need to create a free account to join — it only takes a moment.</p>
        </div>
      )}

      {hasChurch && (
        <div className="bg-[#EAF2EE] border border-[#BFD9CD] rounded-2xl p-4 mb-5 text-sm text-[#2B2620]">
          <p className="font-medium">You're serving as a {user.app_role.replace("_", " ")}.</p>
          {user.app_role === "volunteer" && user.volunteer_status === "pending" && (
            <p className="text-xs text-[#5B5648] mt-1">Your church admin still needs to approve you before you see support invitations.</p>
          )}
          {user.app_role === "prayer_team" && (
            <p className="text-xs text-[#5B5648] mt-1"><Link to="/prayer-team" className="underline">Go to the Prayer Queue →</Link></p>
          )}
        </div>
      )}

      {!hasChurch && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 text-sm text-[#5B5648]">
          <p className="font-medium text-[#2B2620] mb-1">Prayer warriors must belong to a registered church.</p>
          <p className="text-xs">If your church isn't listed below, please ask your church leader to <Link to="/register-church" className="underline font-medium">register your church</Link> first. Once verified, you can join their prayer team.</p>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-[#EFE8DA] p-6 space-y-5">
        <div>
          <label className="text-xs font-medium text-[#8A8375] mb-1 block">Choose a church</label>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full border border-[#EFE8DA] rounded-xl px-3 py-2 text-sm"
          >
            <option value="">Select a verified church...</option>
            {churches.map((c) => (
              <option key={c.id} value={c.id}>{c.name} — {c.location}</option>
            ))}
          </select>
        </div>

        <button onClick={() => join("prayer_team")} disabled={!selected || saving} className="w-full flex items-center gap-3 border border-[#EFE8DA] rounded-2xl p-4 hover:border-[#8FAE9E] transition-colors text-left disabled:opacity-50">
          <HandHeart className="w-5 h-5 text-[#3D6E64]" />
          <div>
            <p className="text-sm font-medium text-[#2B2620]">Join the Prayer Team</p>
            <p className="text-xs text-[#8A8375]">Receive prayer requests and commit to pray.</p>
          </div>
        </button>

        <button onClick={() => join("volunteer")} disabled={!selected || saving} className="w-full flex items-center gap-3 border border-[#EFE8DA] rounded-2xl p-4 hover:border-[#8FAE9E] transition-colors text-left disabled:opacity-50">
          <Car className="w-5 h-5 text-[#3D6E64]" />
          <div>
            <p className="text-sm font-medium text-[#2B2620]">Become a Practical-Support Volunteer</p>
            <p className="text-xs text-[#8A8375]">Requires approval from your church admin.</p>
          </div>
        </button>

        <div className="border-t border-[#F3EEE1] pt-4">
          <Link to="/register-church">
            <Button variant="outline" className="w-full rounded-full">
              <Church className="w-4 h-4 mr-2" /> Register a New Church Instead
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}