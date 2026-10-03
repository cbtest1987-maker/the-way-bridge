import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/shared/StatusBadge";
import NeedBadge from "@/components/request/NeedBadge";
import RequestHistory from "@/components/journey/RequestHistory";
import { HandHeart, HeartHandshake, RefreshCw, CheckCircle2, LifeBuoy } from "lucide-react";

export default function PrayerJourney() {
  const { user } = useAuth();
  const [journeys, setJourneys] = useState([]);
  const [assignmentsByJourney, setAssignmentsByJourney] = useState({});
  const [tasksByJourney, setTasksByJourney] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [next, setNext] = useState(null);
  const allRequests = user?.role === "admin" && showAll;

  const load = useCallback(async (cursor = null) => {
    if (!user) return;
    setLoading(true);
    const query = allRequests ? {} : { $or: [{ requester_id: user.id }, { created_by_id: user.id }] };
    const page = await base44.entities.PrayerJourney.filter(query, { sort: "-created_date", limit: 50, ...(cursor ? { cursor } : {}) });
    const list = page.items;
    setJourneys(previous => cursor ? [...previous, ...list] : list);
    setNext(page.has_more ? page.next_cursor : null);

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
    setAssignmentsByJourney(previous => cursor ? { ...previous, ...aMap } : aMap);
    setTasksByJourney(previous => cursor ? { ...previous, ...tMap } : tMap);
    setLoading(false);
  }, [user, allRequests]);

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
        <h1 className="font-serif text-2xl text-[#2B2620]">{allRequests ? "All Prayer Requests" : "My Prayer Journey"}</h1>
        <Link to="/request/new">
          <Button size="sm" className="rounded-full bg-[#3D6E64] hover:bg-[#2F5850]">New Request</Button>
        </Link>
      </div>

      {user?.role === "admin" && <div className="mb-4 flex flex-wrap gap-2">
        <Button variant={allRequests ? "outline" : "default"} onClick={() => setShowAll(false)}>My requests</Button>
        <Button variant={allRequests ? "default" : "outline"} onClick={() => setShowAll(true)}>All requests (admin)</Button>
      </div>}
      {allRequests && <p className="mb-4 text-sm text-muted-foreground">Includes older requests with no recorded requester. These are not assigned to your personal account.</p>}
      {loading && <p className="text-sm text-[#8A8375]">Loading your journey...</p>}

      {(() => {
        const active = [];
        const completed = [];
        journeys.forEach((j) => {
          const assignments = assignmentsByJourney[j.id] || [];
          const isPrayed = assignments.some(a => a.status === "prayed" || a.status === "completed");
          const isOwnRequest = j.requester_id === user?.id || j.created_by_id === user?.id;
          const needsFollowUp = isOwnRequest && j.status === "open" && isPrayed && !j.follow_up_response;
          const isCompleted = (j.status === "answered" || j.status === "closed") || (isPrayed && !needsFollowUp);
          (isCompleted ? completed : active).push({ j, assignments, isPrayed, isOwnRequest, needsFollowUp });
        });

        const renderCard = ({ j, assignments, isPrayed, isOwnRequest, needsFollowUp }) => (
          <div key={j.id} className="bg-white rounded-3xl border border-[#EFE8DA] p-5">
            {allRequests && <p className="mb-2 text-xs text-muted-foreground">{new Date(j.created_date).toLocaleString()} · {j.requester_id || (!j.created_by_id?.startsWith("service_") ? j.created_by_id : "Requester not recorded")}</p>}
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

            {tasksByJourney[j.id]?.length > 0 && (
              <div className="space-y-1 mt-2">
                {tasksByJourney[j.id].map((t) => (
                  <NeedBadge key={t.id} type={t.type} details={t.details} completed={t.status === "completed"} />
                ))}
              </div>
            )}

            {allRequests && (
              <Link to={`/admin/journey/${j.id}`} className="text-xs text-[#3D6E64] hover:underline mt-2 inline-block">
                View full details →
              </Link>
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

        return (
          <>
            {active.length > 0 && (
              <div className="space-y-4">{active.map(renderCard)}</div>
            )}
            {completed.length > 0 && (
              <div className="mt-8">
                <h2 className="font-serif text-lg text-[#2B2620] mb-3">Answered Prayers</h2>
                <div className="space-y-4 opacity-75">{completed.map(renderCard)}</div>
              </div>
            )}
            {active.length === 0 && completed.length === 0 && !loading && (
              <div className="text-center py-16">
                <p className="text-[#8A8375] mb-4">{allRequests ? "No current prayer journeys found." : "No current prayer journeys linked to your account. Check your earlier request history below."}</p>
                <Link to="/request/new">
                  <Button className="rounded-full bg-[#3D6E64] hover:bg-[#2F5850]">Ask for Prayer</Button>
                </Link>
              </div>
            )}
          </>
        );
      })()}
      {next && <Button variant="outline" disabled={loading} onClick={() => load(next)}>Load more journeys</Button>}
      {user && <RequestHistory userId={user.id} showAll={allRequests} />}
    </div>
  );
}