import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import StatusBadge from "@/components/shared/StatusBadge";
import { Church, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function ChurchConnect() {
  const { user } = useAuth();
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [journeysById, setJourneysById] = useState({});
  const [churchesById, setChurchesById] = useState({});
  const [responseText, setResponseText] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user?.church_id) return;
    setLoading(true);

    const [inReq, outReq] = await Promise.all([
      base44.entities.ChurchConnectRequest.filter({ responding_church_id: user.church_id, status: "open" }, "-created_date"),
      base44.entities.ChurchConnectRequest.filter({ requesting_church_id: user.church_id }, "-created_date"),
    ]);

    const inList = Array.isArray(inReq) ? inReq : (inReq.items || []);
    const outList = Array.isArray(outReq) ? outReq : (outReq.items || []);
    setIncoming(inList);
    setOutgoing(outList);

    const allRequests = [...inList, ...outList];
    const journeyIds = [...new Set(allRequests.map(r => r.journey_id).filter(Boolean))];
    const churchIds = [...new Set([
      ...allRequests.map(r => r.requesting_church_id).filter(Boolean),
      ...allRequests.map(r => r.responding_church_id).filter(Boolean),
    ])];

    const [journeys, churches] = await Promise.all([
      Promise.all(journeyIds.map(id => base44.entities.PrayerJourney.get(id).catch(() => null))),
      Promise.all(churchIds.map(id => base44.entities.Church.get(id).catch(() => null))),
    ]);

    const jMap = {};
    journeyIds.forEach((id, i) => { if (journeys[i]) jMap[id] = journeys[i]; });
    setJourneysById(jMap);

    const cMap = {};
    churchIds.forEach((id, i) => { if (churches[i]) cMap[id] = churches[i]; });
    setChurchesById(cMap);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const respondToRequest = async (requestId, status) => {
    setSaving(true);
    try {
      await base44.entities.ChurchConnectRequest.update(requestId, {
        status,
        response_message: responseText[requestId] || undefined,
        responded_by_id: user.id,
      });
      setResponseText(prev => ({ ...prev, [requestId]: "" }));
      load();
    } catch (err) {
      alert(err?.message || "Failed to respond.");
    }
    setSaving(false);
  };

  if (!user?.church_id) {
    return (
      <div className="max-w-lg mx-auto px-6 py-16 text-center text-[#8A8375]">
        You need to be affiliated with a church first — visit <Link to="/get-involved" className="underline">Get Involved</Link>.
      </div>
    );
  }

  const isCoordinator = (user?.service_roles || []).includes("church_connect_coordinator") || user?.app_role === "church_connect_coordinator" || user?.role === "admin";

  if (!isCoordinator) {
    return (
      <div className="max-w-lg mx-auto px-6 py-16 text-center text-[#8A8375]">
        Church Connect is for designated Church Connect Coordinators. Contact your church admin if you'd like to serve in this role.
      </div>
    );
  }

  const myChurch = churchesById[user.church_id];

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="flex items-center gap-2 mb-1">
        <Church className="w-5 h-5 text-[#3D6E64]" />
        <h1 className="font-serif text-2xl text-[#2B2620]">Church Connect</h1>
      </div>
      <p className="text-sm text-[#8A8375] mb-6">
        {myChurch ? `${myChurch.name} — ` : ""}Coordinate church-to-church support for space, building, and resource needs.
      </p>

      {loading && <p className="text-sm text-[#8A8375]">Loading...</p>}

      {/* Incoming requests */}
      {!loading && incoming.length > 0 && (
        <div className="mb-8">
          <h2 className="font-serif text-lg text-[#2B2620] mb-3">Incoming Requests ({incoming.length})</h2>
          <div className="space-y-3">
            {incoming.map(req => {
              const church = churchesById[req.requesting_church_id];
              const journey = journeysById[req.journey_id];
              return (
                <div key={req.id} className="bg-white rounded-3xl border border-[#EFE8DA] p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <StatusBadge status={req.status} />
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#EAF2EE] text-[#3D6E64] capitalize">{req.need_type}</span>
                  </div>
                  <p className="text-sm font-medium text-[#2B2620] mb-1">
                    From: {church?.name || "Unknown Church"}
                  </p>
                  <p className="text-sm text-[#5B5648] mb-2">{req.details}</p>
                  {journey && <p className="text-xs text-[#8A8375] mb-3">Context: {journey.ai_summary || journey.message}</p>}
                  <Textarea
                    placeholder="Your response message..."
                    value={responseText[req.id] || ""}
                    onChange={e => setResponseText(prev => ({ ...prev, [req.id]: e.target.value }))}
                    className="mb-3 min-h-[60px]"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="rounded-full bg-[#3D6E64] hover:bg-[#2F5850]"
                      disabled={saving}
                      onClick={() => respondToRequest(req.id, "accepted")}
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-1" /> We Can Help</>}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      disabled={saving}
                      onClick={() => respondToRequest(req.id, "declined")}
                    >
                      <XCircle className="w-4 h-4 mr-1" /> Decline
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Outgoing requests */}
      {!loading && outgoing.length > 0 && (
        <div>
          <h2 className="font-serif text-lg text-[#2B2620] mb-3">Outgoing Requests ({outgoing.length})</h2>
          <div className="space-y-3">
            {outgoing.map(req => {
              const church = churchesById[req.responding_church_id];
              return (
                <div key={req.id} className="bg-white rounded-3xl border border-[#EFE8DA] p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <StatusBadge status={req.status} />
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#EAF2EE] text-[#3D6E64] capitalize">{req.need_type}</span>
                  </div>
                  <p className="text-sm font-medium text-[#2B2620] mb-1">
                    To: {church?.name || "Unknown Church"}
                  </p>
                  <p className="text-sm text-[#5B5648] mb-2">{req.details}</p>
                  {req.response_message && (
                    <div className="bg-[#EAF2EE] border border-[#BFD9CD] rounded-2xl p-3 mt-2">
                      <p className="text-xs font-medium text-[#3D6E64] mb-1">Response:</p>
                      <p className="text-sm text-[#2B2620]">{req.response_message}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && incoming.length === 0 && outgoing.length === 0 && (
        <div className="text-center py-16">
          <Church className="w-10 h-10 text-[#8A8375] mx-auto mb-3" />
          <p className="text-[#8A8375]">No church connect requests right now.</p>
        </div>
      )}
    </div>
  );
}