import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/shared/StatusBadge";
import { Car, MapPin } from "lucide-react";

const TYPES = ["transportation", "food", "resources"];

export default function VolunteerQueue() {
  const { user } = useAuth();
  const [needs, setNeeds] = useState([]);
  const [requestsById, setRequestsById] = useState({});
  const [myOffers, setMyOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.church_id) return;
    setLoading(true);
    const offers = await base44.entities.SupportOffer.filter({ created_by_id: user.id });
    setMyOffers(offers);

    const list = await base44.entities.Need.filter({ church_id: user.church_id, status: "pending" }, "-created_date");
    const filtered = list.filter((n) => TYPES.includes(n.type));
    setNeeds(filtered);
    const reqs = await Promise.all(filtered.map((n) => base44.entities.PrayerRequest.get(n.request_id)));
    const map = {};
    filtered.forEach((n, i) => (map[n.request_id] = reqs[i]));
    setRequestsById(map);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const iCanHelp = async (need) => {
    await base44.entities.SupportOffer.create({ need_id: need.id, request_id: need.request_id, status: "requester_review" });
    await base44.entities.Need.update(need.id, { status: "offered" });
    load();
  };

  if (!user?.church_id) {
    return <div className="max-w-lg mx-auto px-6 py-16 text-center text-[#8A8375]">You need to join a church as a volunteer first — visit Get Involved.</div>;
  }
  if (user.volunteer_status !== "approved") {
    return <div className="max-w-lg mx-auto px-6 py-16 text-center text-[#8A8375]">Your church admin still needs to approve you before you see support invitations.</div>;
  }

  const offerForNeed = (needId) => myOffers.find((o) => o.need_id === needId);

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="font-serif text-2xl text-[#2B2620] mb-1">Volunteer Queue</h1>
      <p className="text-sm text-[#8A8375] mb-6">Practical support invitations from your church community.</p>

      {loading && <p className="text-sm text-[#8A8375]">Loading...</p>}
      {!loading && needs.length === 0 && <p className="text-sm text-[#8A8375]">No open support needs right now.</p>}

      <div className="space-y-3">
        {needs.map((need) => {
          const req = requestsById[need.request_id];
          if (!req) return null;
          const myOffer = offerForNeed(need.id);
          return (
            <div key={need.id} className="bg-white rounded-3xl border border-[#EFE8DA] p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="text-sm font-medium text-[#2B2620] capitalize flex items-center gap-2">
                  <Car className="w-4 h-4 text-[#3D6E64]" /> {need.type.replace(/_/g, " ")} request
                </p>
                {myOffer && <StatusBadge status={myOffer.status} />}
              </div>
              <p className="text-sm text-[#5B5648] mb-2">{need.details}</p>

              {myOffer?.status === "approved" ? (
                <div className="bg-[#EAF2EE] rounded-xl p-3 text-xs text-[#2B2620] space-y-1">
                  <p className="font-medium">Connection approved — contact details:</p>
                  <p className="flex items-center gap-1">{req.contact_email || "Not provided"}</p>
                  <p className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {req.location_text || "Approximate area only"}</p>
                </div>
              ) : myOffer ? (
                <p className="text-xs text-[#8A8375]">Waiting for the requester's approval before contact details are shared.</p>
              ) : (
                <Button size="sm" className="rounded-full bg-[#3D6E64] hover:bg-[#2F5850]" onClick={() => iCanHelp(need)}>
                  I Can Help
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}