import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import StatusBadge from "@/components/shared/StatusBadge";
import { Users, CheckCircle2, Clock, UserCheck, Loader2 } from "lucide-react";

export default function PrayerPoolOverview() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.church_id) return;
    setLoading(true);

    // Load church members
    const res = await base44.functions.invoke("churchTeam", {
      action: "listMembers",
      church_id: user.church_id,
    });
    const allMembers = res.data?.members || [];
    // Filter to approved prayer warriors
    setMembers(allMembers.filter((m) =>
      m.service_roles?.includes("prayer_warrior") && m.church_approved
    ));

    // Load all active assignments (accepted, open, prayed, completed)
    const [accepted, open, prayed] = await Promise.all([
      base44.entities.PrayerAssignment.filter({ status: "accepted" }, "-created_date"),
      base44.entities.PrayerAssignment.filter({ status: "open" }, "-created_date"),
      base44.entities.PrayerAssignment.filter({ status: "prayed" }, "-created_date", { limit: 50 }),
    ]);
    setAssignments([...accepted, ...open, ...prayed]);

    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user?.church_id) {
    return <div className="max-w-lg mx-auto px-6 py-16 text-center text-[#8A8375]">You need to be a church admin to view the prayer pool.</div>;
  }

  const acceptedByWarrior = {};
  assignments
    .filter((a) => a.status === "accepted" && a.assigned_warrior_id)
    .forEach((a) => {
      acceptedByWarrior[a.assigned_warrior_id] = a;
    });

  const defaultWarriors = members.filter((m) => m.is_default_prayer_warrior);
  const acceptedWarriors = members.filter((m) => acceptedByWarrior[m.id]);
  const availableWarriors = members.filter((m) => !acceptedByWarrior[m.id]);

  const timeLeft = (dueAt) => {
    if (!dueAt) return "";
    const diff = new Date(dueAt).getTime() - Date.now();
    if (diff <= 0) return "Overdue";
    const hrs = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hrs}h ${mins}m left`;
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="font-serif text-2xl text-[#2B2620] mb-1">Prayer Pool Overview</h1>
      <p className="text-sm text-[#8A8375] mb-6">All approved prayer warriors, their current status, and the default pool.</p>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-[#8A8375]">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading pool...
        </div>
      )}

      {!loading && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <StatCard icon={Users} value={members.length} label="Total Warriors" />
            <StatCard icon={CheckCircle2} value={acceptedWarriors.length} label="Actively Praying" />
            <StatCard icon={UserCheck} value={defaultWarriors.length} label="Default Pool" />
          </div>

          {/* Default pool */}
          <Section title="Default Pool" icon={UserCheck} description="Auto-assigned warriors who cover unassigned requests.">
            {defaultWarriors.length === 0 ? (
              <Empty text="No default warriors assigned." />
            ) : (
              defaultWarriors.map((m) => (
                <WarriorRow key={m.id} member={m} assignment={acceptedByWarrior[m.id]} timeLeft={timeLeft} />
              ))
            )}
          </Section>

          {/* Currently praying */}
          <Section title="Currently Praying" icon={Clock} description="Warriors with an accepted assignment in progress.">
            {acceptedWarriors.length === 0 ? (
              <Empty text="No warriors are currently praying." />
            ) : (
              acceptedWarriors.map((m) => (
                <WarriorRow key={m.id} member={m} assignment={acceptedByWarrior[m.id]} timeLeft={timeLeft} />
              ))
            )}
          </Section>

          {/* Available */}
          <Section title="Available" icon={Users} description="Approved warriors with no active assignment.">
            {availableWarriors.length === 0 ? (
              <Empty text="No available warriors right now." />
            ) : (
              availableWarriors.map((m) => (
                <WarriorRow key={m.id} member={m} assignment={null} timeLeft={timeLeft} />
              ))
            )}
          </Section>
        </>
      )}
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

function Section({ title, icon: Icon, description, children }) {
  return (
    <div className="bg-white rounded-3xl border border-[#EFE8DA] p-5 mb-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-[#3D6E64]" />
        <h2 className="font-serif text-lg text-[#2B2620]">{title}</h2>
      </div>
      <p className="text-xs text-[#8A8375] mb-3">{description}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Empty({ text }) {
  return <p className="text-sm text-[#8A8375] py-2">{text}</p>;
}

function WarriorRow({ member, assignment, timeLeft }) {
  return (
    <div className="flex items-center justify-between border-b border-[#F3EEE1] py-2 last:border-0">
      <div>
        <p className="text-sm text-[#2B2620]">{member.full_name || member.email}</p>
        {assignment ? (
          <p className="text-xs text-[#5B5648]">⏱ {timeLeft(assignment.due_at)}</p>
        ) : (
          <p className="text-xs text-[#8A8375]">No active assignment</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {member.is_default_prayer_warrior && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#EAF2EE] text-[#3D6E64] border border-[#BFD9CD]">Default</span>
        )}
        <StatusBadge status={assignment ? "accepted" : "open"} />
      </div>
    </div>
  );
}