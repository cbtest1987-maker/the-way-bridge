import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import BackButton from "@/components/shared/BackButton";
import StatusBadge from "@/components/shared/StatusBadge";
import NeedBadge from "@/components/request/NeedBadge";
import { Loader2, Clock, CheckCircle2, HandHeart, HeartHandshake } from "lucide-react";

export default function JourneyDetail() {
  const { id } = useParams();
  const [journey, setJourney] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const j = await base44.entities.PrayerJourney.get(id);
      setJourney(j);
      const [a, t, r, runs] = await Promise.all([
        base44.entities.PrayerAssignment.filter({ journey_id: id }, "-created_date"),
        base44.entities.CareTask.filter({ journey_id: id }, "-created_date"),
        base44.entities.HumanReview.filter({ journey_id: id }, "-created_date"),
        base44.entities.AgentRun.filter({ journey_id: id }, "-created_date"),
      ]);
      setAssignments(a);
      setTasks(t);
      setReviews(r);
      setRuns(runs);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#3D6E64]" /></div>;
  if (!journey) return <div className="max-w-2xl mx-auto px-6 py-10"><BackButton /> <p className="text-[#8A8375]">Journey not found.</p></div>;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <BackButton label="Back" />

      <div className="flex items-center gap-2 mb-2">
        <StatusBadge status={journey.status} />
        <StatusBadge status={journey.safety_level} />
      </div>

      <div className="bg-white rounded-3xl border border-[#EFE8DA] p-5 mb-4">
        <p className="text-xs font-medium text-[#5B5648] mb-1">Request</p>
        <p className="text-sm text-[#2B2620] leading-relaxed">{journey.message}</p>
      </div>

      {journey.ai_summary && (
        <div className="bg-[#FBF8F3] rounded-2xl border border-[#EFE8DA] p-4 mb-4">
          <p className="text-xs font-medium text-[#5B5648] mb-1">AI Summary</p>
          <p className="text-sm text-[#2B2620] leading-relaxed">{journey.ai_summary}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#EFE8DA] p-4 mb-4">
        <p className="text-xs font-medium text-[#5B5648] mb-2">Details</p>
        <div className="space-y-1 text-sm text-[#8A8375]">
          <p>Submitted: {new Date(journey.created_date).toLocaleString()}</p>
          <p>Anonymous: {journey.is_anonymous ? "Yes" : "No"}</p>
          {journey.display_name && <p>Name: {journey.display_name}</p>}
          {journey.contact_email && <p>Email: {journey.contact_email}</p>}
          {journey.contact_phone && <p>Phone: {journey.contact_phone}</p>}
          {journey.location_text && <p>Location: {journey.location_text}</p>}
          {journey.follow_up_response && <p>Follow-up: {journey.follow_up_response}</p>}
        </div>
      </div>

      {/* Prayer Assignments */}
      {assignments.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#EFE8DA] p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <HandHeart className="w-4 h-4 text-[#3D6E64]" />
            <p className="text-sm font-medium text-[#2B2620]">Prayer Assignments ({assignments.length})</p>
          </div>
          <div className="space-y-2">
            {assignments.map((a) => (
              <div key={a.id} className="flex items-center justify-between border-b border-[#F3EEE1] pb-2 last:border-0">
                <div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={a.status} />
                    {a.is_default_warrior && <span className="text-xs px-2 py-0.5 rounded-full bg-[#EAF2EE] text-[#3D6E64] border border-[#BFD9CD]">Default</span>}
                  </div>
                  {a.warrior_note && <p className="text-xs text-[#8A8375] mt-1">"{a.warrior_note}"</p>}
                </div>
                <p className="text-xs text-[#8A8375]">{new Date(a.created_date).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Care Tasks */}
      {tasks.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#EFE8DA] p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <HeartHandshake className="w-4 h-4 text-[#3D6E64]" />
            <p className="text-sm font-medium text-[#2B2620]">Care Tasks ({tasks.length})</p>
          </div>
          <div className="space-y-2">
            {tasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between border-b border-[#F3EEE1] pb-2 last:border-0">
                <NeedBadge type={t.type} details={t.details} completed={t.status === "completed"} />
                <StatusBadge status={t.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Safety Reviews */}
      {reviews.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#EFE8DA] p-4 mb-4">
          <p className="text-sm font-medium text-[#2B2620] mb-3">Safety Reviews ({reviews.length})</p>
          <div className="space-y-2">
            {reviews.map((r) => (
              <div key={r.id} className="border-b border-[#F3EEE1] pb-2 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge status={r.safety_level} />
                  <StatusBadge status={r.status} />
                </div>
                <p className="text-xs text-[#8A8375]">{r.reason}</p>
                {r.reviewer_notes && <p className="text-xs text-[#5B5648] mt-1">Notes: {r.reviewer_notes}</p>}
                {r.resolution && <p className="text-xs text-[#5B5648]">Resolution: {r.resolution}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agent Runs */}
      {runs.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#EFE8DA] p-4">
          <p className="text-sm font-medium text-[#2B2620] mb-3">Agent Runs ({runs.length})</p>
          <div className="space-y-2">
            {runs.map((r) => (
              <div key={r.id} className="border-b border-[#F3EEE1] pb-2 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge status={r.status === "completed" ? "completed" : r.status === "running" ? "pending" : "declined"} />
                  <StatusBadge status={r.safety_level} />
                </div>
                <p className="text-sm text-[#2B2620]">{r.goal}</p>
                {r.summary && <p className="text-xs text-[#8A8375] mt-1">{r.summary}</p>}
                {r.detected_needs?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {r.detected_needs.map((n, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-[#EAF2EE] text-[#3D6E64]">{n}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}