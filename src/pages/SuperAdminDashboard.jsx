import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";
import StatusBadge from "@/components/shared/StatusBadge";
import {
  ShieldCheck, Church, Users, HandHeart, HeartHandshake,
  ScrollText, ShieldAlert, AlertTriangle, ArrowRight, Loader2
} from "lucide-react";

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [recentJourneys, setRecentJourneys] = useState([]);
  const [recentReviews, setRecentReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    const [
      churchCount, userCount, journeyCount, openAssignments,
      openTasks, openReviews, openCompliance, agentRuns
    ] = await Promise.all([
      base44.entities.Church.count(),
      base44.entities.User.count(),
      base44.entities.PrayerJourney.count(),
      base44.entities.PrayerAssignment.count({ status: "open" }),
      base44.entities.CareTask.count({ status: "open" }),
      base44.entities.HumanReview.count({ status: "open" }),
      base44.entities.ComplianceCase.count({ status: "open" }),
      base44.entities.AgentRun.count({ status: "running" }),
    ]);

    setStats({
      churches: churchCount,
      users: userCount,
      journeys: journeyCount,
      openAssignments,
      openTasks,
      openReviews,
      openCompliance,
      agentRuns,
    });

    const [journeys, reviews] = await Promise.all([
      base44.entities.PrayerJourney.filter({}, "-created_date", { limit: 5 }),
      base44.entities.HumanReview.filter({ status: "open" }, "-created_date", { limit: 5 }),
    ]);
    setRecentJourneys(journeys);
    setRecentReviews(reviews);

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (user?.role !== "admin") {
    return (
      <div className="max-w-lg mx-auto px-6 py-16 text-center text-[#8A8375]">
        You need admin access to view this dashboard.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#3D6E64]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck className="w-6 h-6 text-[#3D6E64]" />
        <h1 className="font-serif text-2xl text-[#2B2620]">Super Admin Dashboard</h1>
      </div>
      <p className="text-sm text-[#8A8375] mb-6">Platform-wide overview and administrative tools.</p>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard icon={Church} value={stats.churches} label="Churches" />
        <StatCard icon={Users} value={stats.users} label="Users" />
        <StatCard icon={HandHeart} value={stats.journeys} label="Prayer Journeys" />
        <StatCard icon={HeartHandshake} value={stats.openTasks} label="Open Care Tasks" />
        <StatCard icon={HandHeart} value={stats.openAssignments} label="Open Assignments" />
        <StatCard icon={ShieldAlert} value={stats.openReviews} label="Safety Reviews" />
        <StatCard icon={AlertTriangle} value={stats.openCompliance} label="Compliance Cases" />
        <StatCard icon={ScrollText} value={stats.agentRuns} label="Active Agent Runs" />
      </div>

      {/* Quick links */}
      <h2 className="font-serif text-lg text-[#2B2620] mb-3">Administrative Tools</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
        <QuickLink to="/admin/verification" icon={Church} title="Church Verification" desc="Review and approve registered churches" />
        <QuickLink to="/prayer-pool" icon={HandHeart} title="Prayer Pool" desc="View all warriors, assignments, and default pool" />
        <QuickLink to="/care-safety-review" icon={ShieldAlert} title="Care & Safety Review" desc="Handle flagged and sensitive requests" />
        <QuickLink to="/compliance" icon={AlertTriangle} title="Compliance Queue" desc="Review AI-flagged content" />
        <QuickLink to="/judge" icon={ScrollText} title="Agent Audit Trail" desc="Chronological view of Care Agent runs" />
        <QuickLink to="/church-dashboard" icon={Users} title="Church Dashboard" desc="Manage your church team and volunteers" />
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent journeys */}
        <div className="bg-white rounded-3xl border border-[#EFE8DA] p-5">
          <h2 className="font-serif text-lg text-[#2B2620] mb-3">Recent Prayer Journeys</h2>
          {recentJourneys.length === 0 ? (
            <p className="text-sm text-[#8A8375]">No journeys yet.</p>
          ) : (
            <div className="space-y-3">
              {recentJourneys.map((j) => (
                <div key={j.id} className="border-b border-[#F3EEE1] pb-2 last:border-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={j.status} />
                    <StatusBadge status={j.safety_level} />
                  </div>
                  <p className="text-sm text-[#2B2620] line-clamp-2">{j.ai_summary || j.message}</p>
                  <p className="text-xs text-[#8A8375] mt-1">{new Date(j.created_date).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Open safety reviews */}
        <div className="bg-white rounded-3xl border border-[#EFE8DA] p-5">
          <h2 className="font-serif text-lg text-[#2B2620] mb-3">Open Safety Reviews</h2>
          {recentReviews.length === 0 ? (
            <p className="text-sm text-[#8A8375]">No items awaiting review.</p>
          ) : (
            <div className="space-y-3">
              {recentReviews.map((r) => (
                <div key={r.id} className="border-b border-[#F3EEE1] pb-2 last:border-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={r.safety_level} />
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="text-sm text-[#2B2620] line-clamp-2">{r.reason}</p>
                  {r.automation_paused && (
                    <p className="text-xs text-amber-600 mt-1">⚠ Automation paused</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, value, label }) {
  return (
    <div className="bg-white rounded-2xl border border-[#EFE8DA] p-4 text-center">
      <Icon className="w-5 h-5 text-[#3D6E64] mx-auto mb-2" />
      <p className="text-2xl font-serif text-[#2B2620]">{value}</p>
      <p className="text-xs text-[#8A8375] mt-0.5">{label}</p>
    </div>
  );
}

function QuickLink({ to, icon: Icon, title, desc }) {
  return (
    <Link
      to={to}
      className="bg-white rounded-2xl border border-[#EFE8DA] p-4 flex items-center gap-3 hover:border-[#3D6E64] hover:bg-[#FBF8F3] transition-colors group"
    >
      <div className="w-10 h-10 rounded-full bg-[#EAF2EE] flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-[#3D6E64]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#2B2620]">{title}</p>
        <p className="text-xs text-[#8A8375]">{desc}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-[#8A8375] group-hover:text-[#3D6E64] shrink-0" />
    </Link>
  );
}