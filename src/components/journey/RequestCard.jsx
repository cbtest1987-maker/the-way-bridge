import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { HandHeart, Car, Loader2 } from "lucide-react";

export default function RequestCard({ request, needs, offers, church, onUpdate }) {
  const [showTestimony, setShowTestimony] = useState(false);
  const [content, setContent] = useState("");
  const [anon, setAnon] = useState(true);
  const [saving, setSaving] = useState(false);

  const pendingOffers = offers.filter((o) => o.status === "requester_review");

  const respondToOffer = async (offer, approve) => {
    await base44.entities.SupportOffer.update(offer.id, { status: approve ? "approved" : "declined" });
    if (approve) await base44.entities.PrayerRequest.update(request.id, { status: "connected" });
    onUpdate();
  };

  const submitTestimony = async () => {
    setSaving(true);
    await base44.entities.Testimony.create({ request_id: request.id, content, is_anonymous: anon });
    await base44.entities.PrayerRequest.update(request.id, { status: "answered" });
    setSaving(false);
    setShowTestimony(false);
    onUpdate();
  };

  return (
    <div className="bg-white rounded-3xl border border-[#EFE8DA] p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-sm text-[#2B2620] leading-relaxed pr-2">{request.message}</p>
        <StatusBadge status={request.status} />
      </div>
      {church && <p className="text-xs text-[#8A8375] mb-3">Connected with <span className="font-medium">{church.name}</span></p>}

      <div className="flex flex-wrap gap-1.5 mb-3">
        {needs.map((n) => (
          <span key={n.id} className="text-xs bg-[#F3EEE1] text-[#5B5648] px-2.5 py-1 rounded-full">{n.type.replace(/_/g, " ")}</span>
        ))}
      </div>

      {pendingOffers.map((offer) => (
        <div key={offer.id} className="border border-[#BFD9CD] bg-[#EAF2EE] rounded-2xl p-4 mb-3">
          <p className="text-sm font-medium text-[#2B2620] mb-1 flex items-center gap-2">
            <Car className="w-4 h-4 text-[#3D6E64]" /> A volunteer offered to help
          </p>
          {offer.volunteer_message && <p className="text-xs text-[#5B5648] mb-2">"{offer.volunteer_message}"</p>}
          <p className="text-xs text-[#8A8375] mb-3">Your contact details stay private until you approve. You can end the connection anytime.</p>
          <div className="flex gap-2">
            <Button size="sm" className="rounded-full bg-[#3D6E64] hover:bg-[#2F5850]" onClick={() => respondToOffer(offer, true)}>Accept Connection</Button>
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => respondToOffer(offer, false)}>Decline</Button>
          </div>
        </div>
      ))}

      {request.status !== "answered" && request.status !== "closed" && !showTestimony && (
        <button onClick={() => setShowTestimony(true)} className="text-xs font-medium text-[#3D6E64] flex items-center gap-1 mt-1">
          <HandHeart className="w-3.5 h-3.5" /> Share how God has answered this
        </button>
      )}

      {showTestimony && (
        <div className="mt-3 border-t border-[#F3EEE1] pt-3">
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Tell us how God has worked in your life..." className="min-h-[80px] mb-2" maxLength={1000} />
          <div className="flex items-center gap-2 mb-3">
            <Switch checked={anon} onCheckedChange={setAnon} id={`anon-${request.id}`} />
            <label htmlFor={`anon-${request.id}`} className="text-xs text-[#8A8375]">Share anonymously</label>
          </div>
          <Button onClick={submitTestimony} disabled={!content.trim() || saving} size="sm" className="rounded-full bg-[#3D6E64] hover:bg-[#2F5850]">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Share Testimony"}
          </Button>
        </div>
      )}
    </div>
  );
}