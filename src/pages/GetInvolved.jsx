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

  if (user?.app_role === "prayer_team" || user?.app_role === "volunteer") {
    return (
      <div className="max-w-lg mx-auto px-6 py-16 text-center">
        <p className="text-[#2B2620] font-medium mb-2">You're already serving as a {user.app_role.replace("_", " ")}.</p>
        {user.app_role === "volunteer" && user.volunteer_status === "pending" && (
          <p className="text-sm text-[#8A8375]">Your church admin still needs to approve you before you see support invitations.</p>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-10">
      <h1 className="font-serif text-2xl text-[#2B2620] mb-1">Get Involved</h1>
      <p className="text-sm text-[#8A8375] mb-6">Choose a verified church and how you'd like to serve.</p>

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