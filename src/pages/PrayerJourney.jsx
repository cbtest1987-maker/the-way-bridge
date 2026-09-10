import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import RequestCard from "@/components/journey/RequestCard";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function PrayerJourney() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [needsByRequest, setNeedsByRequest] = useState({});
  const [offersByRequest, setOffersByRequest] = useState({});
  const [churches, setChurches] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const reqs = await base44.entities.PrayerRequest.filter({ created_by_id: user.id }, "-created_date");
    setRequests(reqs);

    const allNeeds = await Promise.all(reqs.map((r) => base44.entities.Need.filter({ request_id: r.id })));
    const needsMap = {};
    reqs.forEach((r, i) => (needsMap[r.id] = allNeeds[i]));
    setNeedsByRequest(needsMap);

    const allOffers = await Promise.all(reqs.map((r) => base44.entities.SupportOffer.filter({ request_id: r.id })));
    const offersMap = {};
    reqs.forEach((r, i) => (offersMap[r.id] = allOffers[i]));
    setOffersByRequest(offersMap);

    const churchIds = [...new Set(reqs.map((r) => r.matched_church_id).filter(Boolean))];
    const churchRecords = await Promise.all(churchIds.map((id) => base44.entities.Church.get(id)));
    const churchMap = {};
    churchIds.forEach((id, i) => (churchMap[id] = churchRecords[i]));
    setChurches(churchMap);

    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl text-[#2B2620]">My Prayer Journey</h1>
        <Link to="/request/new">
          <Button size="sm" className="rounded-full bg-[#3D6E64] hover:bg-[#2F5850]">New Request</Button>
        </Link>
      </div>

      {loading && <p className="text-sm text-[#8A8375]">Loading your journey...</p>}

      {!loading && requests.length === 0 && (
        <div className="text-center py-16">
          <p className="text-[#8A8375] mb-4">You haven't submitted a prayer request yet.</p>
          <Link to="/request/new">
            <Button className="rounded-full bg-[#3D6E64] hover:bg-[#2F5850]">Ask for Prayer</Button>
          </Link>
        </div>
      )}

      <div className="space-y-4">
        {requests.map((r) => (
          <RequestCard
            key={r.id}
            request={r}
            needs={needsByRequest[r.id] || []}
            offers={offersByRequest[r.id] || []}
            church={churches[r.matched_church_id]}
            onUpdate={load}
          />
        ))}
      </div>
    </div>
  );
}