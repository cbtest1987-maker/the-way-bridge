import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import BackButton from "@/components/shared/BackButton";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Church, Users, MapPin, Globe, Mail, Loader2 } from "lucide-react";

export default function ChurchDetail() {
  const { id } = useParams();
  const [church, setChurch] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const c = await base44.entities.Church.get(id);
      setChurch(c);
      try {
        const res = await base44.functions.invoke("churchTeam", { action: "listMembers", church_id: id });
        setMembers(res.data?.members || []);
      } catch { /* may not have admin rights */ }
      setLoading(false);
    })();
  }, [id]);

  const setStatus = async (status) => {
    await base44.entities.Church.update(id, { verification_status: status });
    setChurch((prev) => ({ ...prev, verification_status: status }));
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#3D6E64]" /></div>;
  if (!church) return <div className="max-w-2xl mx-auto px-6 py-10"><BackButton /> <p className="text-[#8A8375]">Church not found.</p></div>;

  const capabilities = [
    { key: "supports_transportation", label: "Transportation" },
    { key: "supports_food", label: "Food" },
    { key: "supports_students", label: "Students" },
    { key: "supports_church_planting", label: "Church Planting" },
    { key: "supports_resource_sharing", label: "Resource Sharing" },
    { key: "supports_disaster_response", label: "Disaster Response" },
  ];

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <BackButton to="/admin/verification" label="Back to Churches" />

      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <Church className="w-5 h-5 text-[#3D6E64]" />
          <h1 className="font-serif text-2xl text-[#2B2620]">{church.name}</h1>
        </div>
        <StatusBadge status={church.verification_status} />
      </div>

      <div className="space-y-1 mb-6">
        {church.location && <p className="text-sm text-[#8A8375] flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {church.location}</p>}
        {church.website && <p className="text-sm text-[#8A8375] flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> {church.website}</p>}
        <p className="text-sm text-[#8A8375] flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {church.leader_name} ({church.leader_email})</p>
        {church.denomination && <p className="text-sm text-[#8A8375]">Denomination: {church.denomination}</p>}
      </div>

      {church.verification_status === "pending" && (
        <div className="flex gap-2 mb-6">
          <Button size="sm" className="rounded-full bg-[#3D6E64] hover:bg-[#2F5850]" onClick={() => setStatus("verified")}>Verify</Button>
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => setStatus("rejected")}>Reject</Button>
        </div>
      )}

      {church.statement_of_faith && (
        <div className="bg-white rounded-2xl border border-[#EFE8DA] p-4 mb-4">
          <p className="text-xs font-medium text-[#5B5648] mb-1">Statement of Faith</p>
          <p className="text-sm text-[#2B2620] leading-relaxed">{church.statement_of_faith}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#EFE8DA] p-4 mb-4">
        <p className="text-xs font-medium text-[#5B5648] mb-2">Capabilities</p>
        <div className="flex flex-wrap gap-2">
          {capabilities.map((c) => (
            <span key={c.key} className={`text-xs px-2.5 py-1 rounded-full border ${church[c.key] ? "bg-[#EAF2EE] text-[#3D6E64] border-[#BFD9CD]" : "bg-stone-50 text-stone-400 border-stone-200"}`}>
              {c.label}
            </span>
          ))}
        </div>
      </div>

      {church.languages && church.languages.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#EFE8DA] p-4 mb-4">
          <p className="text-xs font-medium text-[#5B5648] mb-2">Languages</p>
          <div className="flex flex-wrap gap-2">
            {church.languages.map((l, i) => (
              <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-stone-50 text-stone-600 border border-stone-200">{l}</span>
            ))}
          </div>
        </div>
      )}

      {members.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#EFE8DA] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-[#3D6E64]" />
            <p className="text-sm font-medium text-[#2B2620]">Team Members ({members.length})</p>
          </div>
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between border-b border-[#F3EEE1] pb-2 last:border-0">
                <div>
                  <p className="text-sm text-[#2B2620]">{m.full_name || m.email}</p>
                  <p className="text-xs text-[#8A8375]">{(m.service_roles || []).join(", ") || "No role"}</p>
                </div>
                <div className="flex items-center gap-1">
                  {m.church_approved && <StatusBadge status="verified" label="Approved" />}
                  {m.background_check_status === "cleared" && <StatusBadge status="safe" label="BG Cleared" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}