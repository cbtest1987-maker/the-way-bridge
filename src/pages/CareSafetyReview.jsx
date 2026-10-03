import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import StatusBadge from "@/components/shared/StatusBadge";
import { ShieldAlert, Loader2 } from "lucide-react";
import { getOwnJourneyIds } from "@/lib/sod";
import { Link } from "react-router-dom";

export default function CareSafetyReview() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [journeysById, setJourneysById] = useState({});
  const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const list = await base44.entities.HumanReview.filter({ status: "open" }, "-created_date");
    setReviews(list);

    const journeyIds = [...new Set(list.map(r => r.journey_id))];
    const journeys = await Promise.all(journeyIds.map(id => base44.entities.PrayerJourney.get(id)));
    const map = {};
    journeyIds.forEach((id, i) => (map[id] = journeys[i]));
    setJourneysById(map);

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
    await base44.entities.HumanReview.update(review.id, {
      status: "resolved",
      reviewer_id: user?.id,
      reviewer_notes: notes[review.id] || "",
      resolution,
      automation_paused: false
    });
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
      {!loading && reviews.length === 0 && <p className="text-sm text-[#8A8375]">No items awaiting review.</p>}

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