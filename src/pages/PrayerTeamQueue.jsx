import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { HandHeart, Loader2, Clock, CheckCircle2 } from "lucide-react";
import { getOwnJourneyIds } from "@/lib/sod";

export default function PrayerTeamQueue() {
  const { user } = useAuth();
  const [openAssignments, setOpenAssignments] = useState([]);
  const [journeysById, setJourneysById] = useState({});
  const [myAccepted, setMyAccepted] = useState(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user?.church_id) return;
    setLoading(true);

    // Load open assignments
    const open = await base44.entities.PrayerAssignment.filter({ status: "open" }, "-created_date");
    setOpenAssignments(open);

    // Load journeys for open assignments
    const journeyIds = [...new Set(open.map(a => a.journey_id))];
    const journeys = await Promise.all(journeyIds.map(id => base44.entities.PrayerJourney.get(id)));
    const jMap = {};
    journeyIds.forEach((id, i) => (jMap[id] = journeys[i]));
    setJourneysById(jMap);

    // SOD: exclude the warrior's own requests from the pool
    const ownJourneyIds = getOwnJourneyIds(journeys, user.id);
    setOpenAssignments(open.filter(a => !ownJourneyIds.has(a.journey_id)));

    // Load my accepted assignment
    const mine = await base44.entities.PrayerAssignment.filter({ assigned_warrior_id: user.id, status: "accepted" });
    const acceptedAssignment = mine[0] || null;
    setMyAccepted(acceptedAssignment);

    // Ensure the accepted assignment's journey is in the map
    if (acceptedAssignment && acceptedAssignment.journey_id && !jMap[acceptedAssignment.journey_id]) {
      try {
        jMap[acceptedAssignment.journey_id] = await base44.entities.PrayerJourney.get(acceptedAssignment.journey_id);
      } catch (e) {
        // journey may not be accessible; leave undefined
      }
    }
    setJourneysById(jMap);

    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const iWillPray = async (assignment) => {
    setSaving(true);
    const now = new Date();
    const due = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    await base44.entities.PrayerAssignment.update(assignment.id, {
      status: "accepted",
      assigned_warrior_id: user.id,
      accepted_at: now.toISOString(),
      due_at: due.toISOString(),
      warrior_note: note || undefined
    });
    setNote("");
    setSaving(false);
    load();
  };

  const iPrayed = async () => {
    if (!myAccepted) return;
    setSaving(true);
    await base44.entities.PrayerAssignment.update(myAccepted.id, {
      status: "prayed",
      prayed_at: new Date().toISOString()
    });
    setMyAccepted(null);
    setSaving(false);
    load();
  };

  const timeLeft = (dueAt) => {
    const diff = new Date(dueAt).getTime() - Date.now();
    if (diff <= 0) return "Overdue";
    const hrs = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hrs}h ${mins}m left`;
  };

  if (!user?.church_id) {
    return <div className="max-w-lg mx-auto px-6 py-16 text-center text-[#8A8375]">You need to join a church's prayer team first — visit Get Involved.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="font-serif text-2xl text-[#2B2620] mb-1">Prayer Queue</h1>
      <p className="text-sm text-[#8A8375] mb-6">Open prayer requests awaiting a prayer warrior.</p>

      {/* My accepted assignment */}
      {myAccepted && (
        <div className="bg-[#EAF2EE] border border-[#BFD9CD] rounded-3xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-[#3D6E64]" />
            <p className="text-sm font-medium text-[#2B2620]">You are praying for this request</p>
          </div>
          {(() => {
            const j = journeysById[myAccepted.journey_id];
            return j ? (
              <>
                <p className="text-sm text-[#2B2620] leading-relaxed mb-2">{j.ai_summary || j.message}</p>
                <p className="text-xs text-[#8A8375] mb-3">{j.is_anonymous ? "Anonymous request" : j.display_name || "A community member"}</p>
                <p className="text-xs text-[#5B5648] mb-4">⏱ {timeLeft(myAccepted.due_at)}</p>
                <Button onClick={iPrayed} disabled={saving} className="w-full rounded-full bg-[#3D6E64] hover:bg-[#2F5850] text-white">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-1" /> I Prayed</>}
                </Button>
              </>
            ) : null;
          })()}
        </div>
      )}

      {loading && <p className="text-sm text-[#8A8375]">Loading...</p>}
      {!loading && !myAccepted && openAssignments.length === 0 && <p className="text-sm text-[#8A8375]">No open prayer requests right now.</p>}

      {/* Open prayer pool */}
      {!myAccepted && (
        <div className="space-y-3">
          {openAssignments.map((assignment) => {
            const j = journeysById[assignment.journey_id];
            if (!j) return null;
            return (
              <div key={assignment.id} className="bg-white rounded-3xl border border-[#EFE8DA] p-5">
                <p className="text-sm text-[#2B2620] leading-relaxed mb-2">{j.ai_summary || j.message}</p>
                <p className="text-xs text-[#8A8375] mb-3">{j.is_anonymous ? "Anonymous request" : j.display_name || "A community member"}</p>
                <Button
                  onClick={() => iWillPray(assignment)}
                  disabled={saving}
                  className="rounded-full bg-[#3D6E64] hover:bg-[#2F5850] text-white"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><HandHeart className="w-4 h-4 mr-1" /> I Will Pray</>}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}