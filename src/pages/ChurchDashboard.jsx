import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import StatusBadge from "@/components/shared/StatusBadge";
import MemberRow from "@/components/church/MemberRow";
import { HandHeart, HeartHandshake, Users, AlertCircle } from "lucide-react";

export default function ChurchDashboard() {
  const { user } = useAuth();
  const [church, setChurch] = useState(null);
  const [prayerAssignments, setPrayerAssignments] = useState([]);
  const [careTasks, setCareTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.church_id) return;
    setLoading(true);
    const c = await base44.entities.Church.get(user.church_id);
    setChurch(c);

    // Load care tasks for this church
    const tasks = await base44.entities.CareTask.filter({ church_id: user.church_id }, "-created_date");
    setCareTasks(tasks);

    // Count open prayer assignments across journeys linked to this church
    // (simplified: load all open assignments)
    const openAssignments = await base44.entities.PrayerAssignment.filter({ status: "open" }, "-created_date", { limit: 50 });
    setPrayerAssignments(openAssignments);

    const res = await base44.functions.invoke("churchTeam", { action: "listMembers", church_id: user.church_id });
    setMembers(res.data.members || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const reviewServiceRole = async (targetUserId, approve) => {
    await base44.functions.invoke("churchTeam", {
      action: approve ? "approveServiceRole" : "rejectServiceRole",
      church_id: user.church_id,
      target_user_id: targetUserId,
    });
    load();
  };

  const clearBg = async (targetUserId) => {
    await base44.functions.invoke("churchTeam", {
      action: "clearBackgroundCheck",
      church_id: user.church_id,
      target_user_id: targetUserId,
    });
    load();
  };

  const failBg = async (targetUserId) => {
    await base44.functions.invoke("churchTeam", {
      action: "failBackgroundCheck",
      church_id: user.church_id,
      target_user_id: targetUserId,
    });
    load();
  };

  const toggleReviewer = async (targetUserId) => {
    await base44.functions.invoke("churchTeam", {
      action: "assignCareSafetyReviewer",
      church_id: user.church_id,
      target_user_id: targetUserId,
    });
    load();
  };

  if (!user?.church_id) {
    return <div className="max-w-lg mx-auto px-6 py-16 text-center text-[#8A8375]">You're not an administrator of a church yet.</div>;
  }
  if (loading || !church) return <div className="max-w-3xl mx-auto px-6 py-16 text-sm text-[#8A8375]">Loading dashboard...</div>;

  const pendingApprovals = members.filter(m => !m.church_approved);
  const pendingBgChecks = members.filter(m => m.service_roles?.includes("care_volunteer") && m.background_check_status === "pending");

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-serif text-2xl text-[#2B2620]">{church.name}</h1>
        <StatusBadge status={church.verification_status} />
      </div>
      <p className="text-sm text-[#8A8375] mb-6">{church.location}</p>

      {(pendingApprovals.length > 0 || pendingBgChecks.length > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700">
            {pendingApprovals.length > 0 && `${pendingApprovals.length} role approval(s) pending. `}
            {pendingBgChecks.length > 0 && `${pendingBgChecks.length} background check(s) pending review.`}
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard icon={HandHeart} value={prayerAssignments.length} label="Open Prayer" />
        <StatCard icon={HeartHandshake} value={careTasks.filter(t => t.status === "open").length} label="Open Care Tasks" />
        <StatCard icon={Users} value={members.length} label="Team Members" />
      </div>

      <div className="bg-white rounded-3xl border border-[#EFE8DA] p-5 mb-4">
        <h2 className="font-serif text-lg text-[#2B2620] mb-3">Team & Volunteers</h2>
        <p className="text-xs text-[#8A8375] mb-3">Approve service roles, clear background checks, and assign Care & Safety Reviewers.</p>
        {members.length === 0 && <p className="text-sm text-[#8A8375]">No members yet — share your Get Involved link with your team.</p>}
        {members.map((m) => (
          <MemberRow
            key={m.id}
            member={m}
            onApproveRole={(id) => reviewServiceRole(id, true)}
            onRejectRole={(id) => reviewServiceRole(id, false)}
            onClearBg={clearBg}
            onFailBg={failBg}
            onToggleReviewer={toggleReviewer}
          />
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-[#EFE8DA] p-5">
        <h2 className="font-serif text-lg text-[#2B2620] mb-3">Care Tasks</h2>
        {careTasks.length === 0 && <p className="text-sm text-[#8A8375]">No practical care tasks routed yet.</p>}
        <div className="space-y-2">
          {careTasks.map((t) => (
            <div key={t.id} className="flex items-center justify-between text-sm border-b border-[#F3EEE1] py-2 last:border-0">
              <div>
                <span className="capitalize text-[#2B2620]">{t.type.replace(/_/g, " ")}</span>
                {t.details && <p className="text-xs text-[#8A8375]">{t.details}</p>}
              </div>
              <StatusBadge status={t.status} />
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