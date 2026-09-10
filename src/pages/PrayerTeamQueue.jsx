import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { HandHeart, Loader2 } from "lucide-react";

export default function PrayerTeamQueue() {
  const { user } = useAuth();
  const [needs, setNeeds] = useState([]);
  const [requestsById, setRequestsById] = useState({});
  const [myCommitments, setMyCommitments] = useState(new Set());
  const [notes, setNotes] = useState({});
  const [openNote, setOpenNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  const load = useCallback(async () => {
    if (!user?.church_id) return;
    setLoading(true);
    const list = await base44.entities.Need.filter({ church_id: user.church_id, type: "prayer" }, "-created_date");
    setNeeds(list);
    const reqs = await Promise.all(list.map((n) => base44.entities.PrayerRequest.get(n.request_id)));
    const map = {};
    list.forEach((n, i) => (map[n.request_id] = reqs[i]));
    setRequestsById(map);
    const commitments = await base44.entities.PrayerCommitment.filter({ created_by_id: user.id });
    setMyCommitments(new Set(commitments.map((c) => c.need_id)));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const iWillPray = async (need) => {
    setSaving(need.id);
    await base44.entities.PrayerCommitment.create({ request_id: need.request_id, need_id: need.id, note: notes[need.id] || "" });
    setOpenNote(null);
    setSaving(null);
    load();
  };

  if (!user?.church_id) {
    return <div className="max-w-lg mx-auto px-6 py-16 text-center text-[#8A8375]">You need to join a church's prayer team first — visit Get Involved.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="font-serif text-2xl text-[#2B2620] mb-1">Prayer Queue</h1>
      <p className="text-sm text-[#8A8375] mb-6">Requests routed to your church, awaiting prayer.</p>

      {loading && <p className="text-sm text-[#8A8375]">Loading...</p>}
      {!loading && needs.length === 0 && <p className="text-sm text-[#8A8375]">No prayer requests right now.</p>}

      <div className="space-y-3">
        {needs.map((need) => {
          const req = requestsById[need.request_id];
          if (!req) return null;
          const prayed = myCommitments.has(need.id);
          return (
            <div key={need.id} className="bg-white rounded-3xl border border-[#EFE8DA] p-5">
              <p className="text-sm text-[#2B2620] leading-relaxed mb-2">{req.ai_summary || req.message}</p>
              <p className="text-xs text-[#8A8375] mb-3">{req.is_anonymous ? "Anonymous request" : req.display_name || "A community member"}</p>

              {prayed ? (
                <span className="text-xs font-medium text-[#3D6E64]">🙏 You prayed for this</span>
              ) : openNote === need.id ? (
                <div>
                  <Textarea
                    placeholder="Optional encouragement or Scripture..."
                    className="min-h-[70px] mb-2"
                    value={notes[need.id] || ""}
                    onChange={(e) => setNotes((p) => ({ ...p, [need.id]: e.target.value }))}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="rounded-full bg-[#3D6E64] hover:bg-[#2F5850]" onClick={() => iWillPray(need)} disabled={saving === need.id}>
                      {saving === need.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm"}
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-full" onClick={() => iWillPray(need)}>Skip note</Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" className="rounded-full bg-[#3D6E64] hover:bg-[#2F5850]" onClick={() => setOpenNote(need.id)}>
                  <HandHeart className="w-4 h-4 mr-1" /> I Will Pray
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}