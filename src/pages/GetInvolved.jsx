import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { HandHeart, Car, Church, ShieldCheck, LifeBuoy, ShieldAlert } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import RoleCard from "@/components/shared/RoleCard";

const VOLUNTEER_CAPS = ["transportation", "food", "resources", "building", "church_planting", "fundraising", "disaster"];

export default function GetInvolved() {
  const { user, checkUserAuth } = useAuth();
  const [churches, setChurches] = useState([]);
  const [selected, setSelected] = useState(user?.church_id || "");
  const [selectedRole, setSelectedRole] = useState(null);
  const [caps, setCaps] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.Church.filter({ verification_status: "verified" }).then(setChurches);
  }, []);

  const roles = user?.service_roles || [];
  const bgStatus = user?.background_check_status || "none";
  const approved = user?.church_approved || false;
  const isReviewer = user?.care_safety_reviewer || false;

  const canServePrayer = approved;
  const canServeCare = approved && bgStatus === "cleared";
  const canServeCoordinator = approved;

  const join = async () => {
    if (!user) {
      window.location.href = `/login?returnTo=${encodeURIComponent("/get-involved")}`;
      return;
    }
    if (!selected || !selectedRole) return;
    setSaving(true);
    const update = {
      church_id: selected,
      service_roles: [selectedRole],
      church_approved: false,
      background_check_status: selectedRole === "care_volunteer" ? "pending" : "none",
      volunteer_capabilities: selectedRole === "care_volunteer" ? caps : [],
    };
    await base44.auth.updateMe(update);
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

      {isLoggedIn && hasChurch && (
        <div className="bg-[#EAF2EE] border border-[#BFD9CD] rounded-2xl p-4 mb-5 text-sm text-[#2B2620]">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-[#3D6E64]" />
            <p className="font-medium">Your service status</p>
          </div>
          <div className="space-y-1.5 text-xs text-[#5B5648]">
            <p>Church: <span className="font-medium text-[#2B2620]">{churches.find(c => c.id === user.church_id)?.name || "Your church"}</span></p>
            <p>Roles: <span className="font-medium text-[#2B2620]">{roles.length > 0 ? roles.map(r => r.replace("_", " ")).join(", ") : "None yet"}</span></p>
            <p>Church approval: <StatusBadge status={approved ? "verified" : "pending"} /></p>
            {roles.includes("care_volunteer") && (
              <p>Background check: <StatusBadge status={bgStatus === "cleared" ? "verified" : bgStatus === "failed" ? "rejected" : "pending"} /></p>
            )}
            {isReviewer && <p className="text-[#3D6E64] font-medium">✓ Care & Safety Reviewer</p>}
          </div>
          {canServePrayer && roles.includes("prayer_warrior") && (
            <Link to="/prayer-team" className="block mt-2 text-xs text-[#3D6E64] underline">Go to Prayer Queue →</Link>
          )}
          {canServeCare && roles.includes("care_volunteer") && (
            <Link to="/volunteer" className="block mt-2 text-xs text-[#3D6E64] underline">Go to Volunteer Queue →</Link>
          )}
        </div>
      )}

      {!hasChurch && isLoggedIn && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 text-sm text-[#5B5648]">
          <p className="font-medium text-[#2B2620] mb-1">You must belong to a registered church to serve.</p>
          <p className="text-xs">If your church isn't listed below, please ask your church leader to <Link to="/register-church" className="underline font-medium">register your church</Link> first. Once verified, you can join their team.</p>
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

        <p className="text-xs font-medium text-[#8A8375]">Choose how you'd like to serve</p>

        {/* Prayer Warrior */}
        <RoleCard
          icon={HandHeart}
          title="Prayer Warrior"
          desc="Receive prayer requests and commit to pray."
          requirements={["Church admin approval"]}
          selected={selectedRole === "prayer_warrior"}
          onClick={() => setSelectedRole("prayer_warrior")}
        />

        {/* Care Volunteer */}
        <RoleCard
          icon={Car}
          title="Care Volunteer"
          desc="Provide practical support (rides, meals, resources)."
          requirements={["Church admin approval", "Background check cleared"]}
          selected={selectedRole === "care_volunteer"}
          onClick={() => setSelectedRole("care_volunteer")}
        />

        {/* Church Connect Coordinator */}
        <RoleCard
          icon={LifeBuoy}
          title="Church Connect Coordinator"
          desc="Verified church leader with heightened privilege to coordinate care."
          requirements={["Church admin approval", "Verified church leader"]}
          selected={selectedRole === "church_connect_coordinator"}
          onClick={() => setSelectedRole("church_connect_coordinator")}
        />

        {/* Care & Safety Reviewer */}
        <div className="border border-[#EFE8DA] rounded-2xl p-4 bg-[#FBF8F3]">
          <div className="flex items-center gap-3 mb-2">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-[#2B2620]">Care & Safety Reviewer</p>
              <p className="text-xs text-[#8A8375]">Review sensitive requests. Assigned by your church admin.</p>
            </div>
          </div>
          <p className="text-xs text-[#5B5648]">This permission is granted by your church admin after you join a team — ask them to assign it from the Church Dashboard.</p>
        </div>

        {/* Capabilities for care volunteer */}
        {selectedRole === "care_volunteer" && (
          <div className="border border-[#EFE8DA] rounded-2xl p-4">
            <p className="text-xs font-medium text-[#2B2620] mb-2">What can you help with?</p>
            <div className="flex flex-wrap gap-2">
              {VOLUNTEER_CAPS.map((cap) => (
                <button
                  key={cap}
                  type="button"
                  onClick={() => setCaps(prev => prev.includes(cap) ? prev.filter(c => c !== cap) : [...prev, cap])}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${caps.includes(cap) ? "bg-[#3D6E64] text-white border-[#3D6E64]" : "bg-white text-[#8A8375] border-[#EFE8DA]"}`}
                >
                  {cap.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>
        )}

        <Button
          onClick={join}
          disabled={!selected || !selectedRole || saving}
          className="w-full rounded-full bg-[#3D6E64] hover:bg-[#2F5850] text-white"
        >
          {saving ? "Joining..." : "Request to Join"}
        </Button>

        <div className="border-t border-[#F3EEE1] pt-4">
          <Link to="/register-church">
            <Button variant="outline" className="w-full rounded-full">
              <Church className="w-4 h-4 mr-2" /> Register a New Church Instead
            </Button>
          </Link>
        </div>
      </div>

      {isLoggedIn && roles.length > 0 && !approved && (
        <p className="text-xs text-center text-[#8A8375] mt-4">
          Your request has been submitted. Your church admin will review and approve you before you can start serving.
        </p>
      )}
    </div>
  );
}