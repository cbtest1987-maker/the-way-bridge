import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import StatusBadge from "@/components/shared/StatusBadge";
import MemberRow from "@/components/church/MemberRow";
import { HandHeart, HeartHandshake, Users } from "lucide-react";

export default function ChurchDashboard() {
  const { user } = useAuth();
  const [church, setChurch] = useState(null);
  const [prayerNeeds, setPrayerNeeds] = useState([]);
  const [careNeeds, setCareNeeds] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.church_id) return;
    setLoading(true);
    const c = await base44.entities.Church.get(user.church_id);
    setChurch(c);
    const allNeeds = await base44.entities.Need.filter({ church_id: user.church_id }, "-created_date");
    setPrayerNeeds(allNeeds.filter((n) => n.type === "prayer"));
    setCareNeeds(allNeeds.filter((n) => n.type !== "prayer"));
    const res = await base44.functions.invoke("churchTeam", { action: "listMembers", church_id: user.church_id });
    setMembers(res.data.members || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const reviewVolunteer = async (target_user_id, approve) => {
    await base44.functions.invoke("churchTeam", {
      action: approve ? "approveVolunteer" : "rejectVolunteer",
      church_id: user.church_id,
      target_user_id,
    });
    load();
  };

  if (!user?.church_id) {
    return <div className="max-w-lg mx-auto px-6 py-16 text-center text-[#8A8375]">You're not an administrator of a church yet.</div>;
  }
  if (loading || !church) return <div className="max-w-3xl mx-auto px-6 py-16 text-sm text-[#8A8375]">Loading dashboard...</div>;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-serif text-2xl text-[#2B2620]">{church.name}</h1>
        <StatusBadge status={church.verification_status} />
      </div>
      <p className="text-sm text-[#8A8375] mb-6">{church.location}</p>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard icon={HandHeart} value={prayerNeeds.length} label="Prayer Requests" />
        <StatCard icon={HeartHandshake} value={careNeeds.length} label="Care Needs" />
        <StatCard icon={Users} value={members.length} label="Team Members" />
      </div>

      <div className="bg-white rounded-3xl border border-[#EFE8DA] p-5 mb-4">
        <h2 className="font-serif text-lg text-[#2B2620] mb-3">Team & Volunteers</h2>
        {members.length === 0 && <p className="text-sm text-[#8A8375]">No members yet — share your Get Involved link with your prayer team and volunteers.</p>}
        {members.map((m) => (
          <MemberRow key={m.id} member={m} onApprove={(id) => reviewVolunteer(id, true)} onReject={(id) => reviewVolunteer(id, false)} />
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-[#EFE8DA] p-5">
        <h2 className="font-serif text-lg text-[#2B2620] mb-3">Care Needs</h2>
        {careNeeds.length === 0 && <p className="text-sm text-[#8A8375]">No practical care needs routed yet.</p>}
        <div className="space-y-2">
          {careNeeds.map((n) => (
            <div key={n.id} className="flex items-center justify-between text-sm border-b border-[#F3EEE1] py-2 last:border-0">
              <span className="capitalize text-[#2B2620]">{n.type.replace(/_/g, " ")}</span>
              <StatusBadge status={n.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, value, label }) {
  return (
    <div className="bg-white rounded-2xl border border-[#EFE8DA] p-4 text-center">
      <Icon className="w-4 h-4 text-[#3D6E64] mx-auto mb-1.5" />
      <p className="text-xl font-serif text-[#2B2620]">{value}</p>
      <p className="text-xs text-[#8A8375]">{label}</p>
    </div>
  );
}