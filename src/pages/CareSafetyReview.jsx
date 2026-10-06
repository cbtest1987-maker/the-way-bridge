import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import StatusBadge from "@/components/shared/StatusBadge";
import { ShieldAlert, Loader2, HeartHandshake } from "lucide-react";
import { getOwnJourneyIds } from "@/lib/sod";
import { Link } from "react-router-dom";

export default function CareSafetyReview() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [journeysById, setJourneysById] = useState({});
  const [tasksByJourney, setTasksByJourney] = useState({});
  const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const list = await base44.entities.HumanReview.filter({ status: "open" }, "-created_date");
    setReviews(list);

    const journeyIds = [...new Set(list.map(r => r.journey_id))];
    const journeys = await Promise.all(journeyIds.map(id => base44.entities.PrayerJourney.get(id)));
    const jMap = {};
    journeyIds.forEach((id, i) => (jMap[id] = journeys[i]));
    setJourneysById(jMap);

    // Load care tasks for each journey
    const taskResults = await Promise.all(
      journeyIds.map(id => base44.entities.CareTask.filter({ journey_id: id }, { sort: "-created_date", limit: 50 }))
    );
    const tMap = {};
    journeyIds.forEach((id, i) => {
      const page = taskResults[i];
      tMap[id] = page.items || page;
    });
    setTasksByJourney(tMap);

    // SOD: exclude the reviewer's own requests
    const ownIds = getOwnJourneyIds(journeys, user?.id);
    setReviews(list.filter(r => !ownIds.has(r.journey_id)));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const resolve = async (review, resolution) => {
    setSaving(review.id);
    try {
      await base44.functions.invoke("resolveHumanReview", {
        review_id: review.id,
        resolution,
        reviewer_notes: notes[review.id] || "",
      });
    } catch (e) {
      // handled silently
    }
    setSaving(null);
    load();
  };

  const releaseToPrayerCare = async (review) => {
    setSaving(review.id);
    try {
      await base44.functions.invoke("releaseToPrayerCare", {
        journey_id: review.journey_id,
        reviewer_notes: notes[review.id] || ""
      });
    } catch (e) {
      // handled silently
    }
    setSaving(null);
    load();
  };

  if (!user?.care_safety_reviewer && user?.role !== "admin") {
    return <div className="max-w-lg mx-auto px-6 py-16 text-center text-[#8A8375]">You need Care & Safety Reviewer permission to access this page.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="flex items-center gap-2 mb-1">
        <ShieldAlert className="w-5 h-5 text-amber-600" />
        <h1 className="font-serif text-2xl text-[#2B2620]">Care & Safety Review</h1>
      </div>
      <p className="text-sm text-[#8A8375] mb-6">Requests requiring human review. Reviewer identity, decision, and timestamp are recorded in the audit trail.</p>

      {loading && <p className="text-sm text-[#8A8375]">Loading...</p>}
      {!loading && reviews.length === 0 && (
        <div className="bg-[#FBF8F3] rounded-2xl border border-[#EFE8DA] p-5">
          <p className="text-sm text-[#2B2620] font-medium mb-1">No items available for your review</p>
          <p className="text-sm text-[#8A8375]">
            Open review items exist, but they are excluded by Separation of Duties because you submitted those requests yourself.
            Another care & safety reviewer would see them here.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {reviews.map((review) => {
          const j = journeysById[review.journey_id];
          return (
            <div key={review.id} className="bg-white rounded-3xl border border-[#EFE8DA] p-5">
              <div className="flex items-center gap-2 mb-3">
                <StatusBadge status={review.safety_level} />
                <StatusBadge status={review.status} />
              </div>
              <p className="text-xs text-[#8A8375] mb-2">Reason: {review.reason}</p>
              {j && (
                <div className="bg-[#FBF8F3] rounded-xl p-3 mb-3">
                  <p className="text-sm text-[#2B2620] leading-relaxed">{j.ai_summary || j.message}</p>
                  <p className="text-xs text-[#8A8375] mt-1">{j.is_anonymous ? "Anonymous" : j.display_name || "A community member"}</p>
                </div>
              )}
              <p className="text-xs text-[#5B5648] mb-3">
                {review.automation_paused ? "⚠ Automation is paused for this request." : "Automation resumed."}
              </p>
              {(tasksByJourney[review.journey_id] || []).length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-[#5B5648] mb-2">Critical Tasks ({tasksByJourney[review.journey_id].length})</p>
                  <div className="space-y-1.5">
                    {tasksByJourney[review.journey_id].map(task => (
                      <div key={task.id} className="flex items-center justify-between bg-[#FBF8F3] rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={task.status} />
                          <span className="text-xs text-[#2B2620] capitalize">{task.type.replace(/_/g, " ")}</span>
                        </div>
                        <p className="text-xs text-[#8A8375] max-w-[60%] truncate">{task.details || "—"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <Textarea
                placeholder="Reviewer notes..."
                className="min-h-[60px] mb-3"
                value={notes[review.id] || ""}
                onChange={(e) => setNotes(p => ({ ...p, [review.id]: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" variant="outline" className="rounded-full text-xs" onClick={() => resolve(review, "return_to_normal")} disabled={saving === review.id}>
                  Return to Normal
                </Button>
                <Button size="sm" variant="outline" className="rounded-full text-xs" onClick={() => resolve(review, "care_handling")} disabled={saving === review.id}>
                  Move to Care Handling
                </Button>
                <Button size="sm" variant="outline" className="rounded-full text-xs" onClick={() => resolve(review, "escalate")} disabled={saving === review.id}>
                  Escalate
                </Button>
                <Button size="sm" variant="outline" className="rounded-full text-xs" onClick={() => resolve(review, "close_inappropriate")} disabled={saving === review.id}>
                  Close / Inappropriate
                </Button>
                <Button size="sm" className="rounded-full text-xs col-span-2 bg-[#3D6E64] hover:bg-[#2F5850] text-white" onClick={() => releaseToPrayerCare(review)} disabled={saving === review.id}>
                  {saving === review.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><HeartHandshake className="w-3 h-3 mr-1" /> Release to Prayer Care</>}
                </Button>
              </div>
              <Link to={`/admin/journey/${review.journey_id}`} className="text-xs text-[#3D6E64] hover:underline mt-2 inline-block">
                View full journey details →
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}