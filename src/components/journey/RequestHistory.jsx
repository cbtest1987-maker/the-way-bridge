import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";

export default function RequestHistory({ userId, showAll }) {
  const [records, setRecords] = useState([]);
  const [next, setNext] = useState(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async (cursor = null) => {
    setLoading(true);
    const page = await base44.entities.PrayerRequest.filter(showAll ? {} : { created_by_id: userId }, { sort: "-created_date", limit: 50, ...(cursor ? { cursor } : {}) });
    setRecords(previous => cursor ? [...previous, ...page.items] : page.items);
    setNext(page.has_more ? page.next_cursor : null);
    setLoading(false);
  }, [userId, showAll]);
  useEffect(() => { load(); }, [load]);
  return <section className="mt-6 space-y-3">
    <h2 className="font-heading text-lg">Earlier request history</h2>
    {loading && <p className="text-sm text-muted-foreground">Loading earlier requests...</p>}
    {!loading && records.length === 0 && <p className="text-sm text-muted-foreground">No earlier requests.</p>}
    {records.map(request => <article key={request.id} className="rounded-2xl border bg-card p-5">
      <StatusBadge status={request.status} />
      <p className="mt-3 whitespace-pre-wrap text-sm">{request.message}</p>
      <p className="mt-2 text-xs text-muted-foreground">{new Date(request.created_date).toLocaleString()}</p>
    </article>)}
    {next && <Button variant="outline" disabled={loading} onClick={() => load(next)}>Load more earlier requests</Button>}
  </section>;
}