import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import StatusBadge from "@/components/shared/StatusBadge";
import { useAuth } from "@/lib/AuthContext";
import { isOwnRequest } from "@/lib/sod";

export default function ComplianceQueue() {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [requests, setRequests] = useState({});
  const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const list = await base44.entities.ComplianceCase.filter({}, "-created_date");
    setCases(list);
    const reqs = await Promise.all(list.map((c) => base44.entities.PrayerRequest.get(c.request_id)));
    const map = {};
    list.forEach((c, i) => (map[c.request_id] = reqs[i]));
    setRequests(map);

    // SOD: exclude the reviewer's own requests
    const ownReqIds = new Set(reqs.filter(r => isOwnRequest(r, user?.id)).map(r => r.id));
    setCases(list.filter(c => !ownReqIds.has(c.request_id)));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const resolve = async (c) => {
    await base44.entities.ComplianceCase.update(c.id, { status: "resolved", reviewer_notes: notes[c.id] || "" });
    load();
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="font-serif text-2xl text-[#2B2620] mb-1">Compliance Queue</h1>
      <p className="text-sm text-[#8A8375] mb-6">Content flagged by AI safety screening, awaiting human review.</p>

      {loading && <p className="text-sm text-[#8A8375]">Loading...</p>}
      {!loading && cases.length === 0 && <p className="text-sm text-[#8A8375]">No cases to review.</p>}

      <div className="space-y-3">
        {cases.map((c) => {
          const req = requests[c.request_id];
          return (
            <div key={c.id} className="bg-white rounded-3xl border border-[#EFE8DA] p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="text-sm text-[#2B2620]">{req?.message}</p>
                <StatusBadge status={c.status} />
              </div>
              <p className="text-xs text-[#8A8375] mb-3">{c.reason}</p>
              {c.status === "open" ? (
                <div>
                  <Textarea
                    placeholder="Reviewer notes..."
                    className="min-h-[60px] mb-2"
                    value={notes[c.id] || ""}
                    onChange={(e) => setNotes((p) => ({ ...p, [c.id]: e.target.value }))}
                  />
                  <Button size="sm" className="rounded-full bg-[#3D6E64] hover:bg-[#2F5850]" onClick={() => resolve(c)}>Mark Resolved</Button>
                </div>
              ) : (
                <p className="text-xs text-[#8A8375]">Notes: {c.reviewer_notes || "—"}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}