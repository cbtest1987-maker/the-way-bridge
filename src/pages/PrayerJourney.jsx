import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/shared/StatusBadge";
import NeedBadge from "@/components/request/NeedBadge";
import { HandHeart, HeartHandshake, RefreshCw, CheckCircle2, LifeBuoy } from "lucide-react";

export default function PrayerJourney() {
  const { user } = useAuth();
  const [journeys, setJourneys] = useState([]);
  const [assignmentsByJourney, setAssignmentsByJourney] = useState({});
  const [tasksByJourney, setTasksByJourney] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const page = await base44.entities.PrayerJourney.filter({ created_by_id: user.id }, { sort: "-created_date", limit: 50 });
    const list = page.items || page;
    setJourneys(list);

    const [allAssignments, allTasks] = await Promise.all([
      Promise.all(list.map(j => base44.entities.PrayerAssignment.filter({ journey_id: j.id }, "-created_date"))),
      Promise.all(list.map(j => base44.entities.CareTask.filter({ journey_id: j.id }, "-created_date")))
    ]);

    const aMap = {};
    const tMap = {};
    list.forEach((j, i) => {
      aMap[j.id] = allAssignments[i];
      tMap[j.id] = allTasks[i];
    });
    setAssignmentsByJourney(aMap);
    setTasksByJourney(tMap);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const respondToFollowUp = async (journeyId, response) => {
    await base44.entities.PrayerJourney.update(journeyId, { follow_up_response: response });
    if (response === "answered") {
      await base44.entities.PrayerJourney.update(journeyId, { status: "answered" });
    } else if (response === "continue") {
      await base44.entities.PrayerAssignment.create({ journey_id: journeyId, status: "open" });
    }
    load();
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl text-[#2B2620]">My Prayer Journey</h1>
        <Link to="/request/new">
          <Button size="sm" className="rounded-full bg-[#3D6E64] hover:bg-[#2F5850]">New Request</Button>
        </Link>
      </div>

      {loading && <p className="text-sm text-[#8A8375]">Loading your journey...</p>}

      {!loading && journeys.length === 0 && (
        <div className="text-center py-16">
          <p className="text-[#8A8375] mb-4">You haven't submitted a prayer request yet.</p>
          <Link to="/request/new">
            <Button className="rounded-full bg-[#3D6E64] hover:bg-[#2F5850]">Ask for Prayer</Button>
          </Link>
        </div>
      )}

      <div className="space-y-4">
        {journeys.map((j) => {
          const assignments = assignmentsByJourney[j.id] || [];
          const tasks = tasksByJourney[j.id] || [];
          const latestAssignment = assignments[0];
          const isPrayed = assignments.some(a => a.status === "prayed" || a.status === "completed");
          const needsFollowUp = j.status === "open" && isPrayed && !j.follow_up_response;

          return (
            <div key={j.id} className="bg-white rounded-3xl border border-[#EFE8DA] p-5">
              <div className="flex items-center gap-2 mb-2">
                <StatusBadge status={j.status} />
                <StatusBadge status={j.safety_level} />
              </div>
              <p className="text-sm text-[#2B2620] leading-relaxed mb-2">{j.ai_summary || j.message}</p>

              {assignments.length > 0 && (
                <p className="text-xs text-[#8A8375] mb-2">
                  {isPrayed ? "🙏 Your prayer has been prayed for." : "Your prayer is in the prayer warrior pool."}
                </p>
              )}

              {tasks.length > 0 && (
                <div className="space-y-1 mt-2">
                  {tasks.map((t) => (
                    <NeedBadge key={t.id} type={t.type} details={t.details} completed={t.status === "completed"} />
                  ))}
                </div>
              )}

              {needsFollowUp && (
                <div className="mt-4 bg-[#EAF2EE] border border-[#BFD9CD] rounded-2xl p-4">
                  <p className="text-sm font-medium text-[#2B2620] mb-3">How are you doing?</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" variant="outline" className="rounded-full text-xs" onClick={() => respondToFollowUp(j.id, "continue")}>
                      <RefreshCw className="w-3 h-3 mr-1" /> Continue Prayer
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-full text-xs" onClick={() => respondToFollowUp(j.id, "answered")}>
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Prayer Answered
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-full text-xs" onClick={() => respondToFollowUp(j.id, "update")}>
                      <HandHeart className="w-3 h-3 mr-1" /> Update My Request
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-full text-xs" onClick={() => respondToFollowUp(j.id, "need_help")}>
                      <LifeBuoy className="w-3 h-3 mr-1" /> I Need Help
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}