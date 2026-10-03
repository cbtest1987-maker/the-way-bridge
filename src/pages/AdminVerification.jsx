import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/shared/StatusBadge";
import { Link } from "react-router-dom";

export default function AdminVerification() {
  const [churches, setChurches] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const list = await base44.entities.Church.list("-created_date");
    setChurches(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (id, status) => {
    await base44.entities.Church.update(id, { verification_status: status });
    load();
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="font-serif text-2xl text-[#2B2620] mb-1">Church Verification</h1>
      <p className="text-sm text-[#8A8375] mb-6">Review and approve registered churches.</p>

      {loading && <p className="text-sm text-[#8A8375]">Loading...</p>}

      <div className="space-y-3">
        {churches.map((c) => (
          <Link key={c.id} to={`/admin/church/${c.id}`} className="block bg-white rounded-3xl border border-[#EFE8DA] p-5 hover:border-[#3D6E64] transition-colors">
            <div className="flex items-start justify-between gap-3 mb-1">
              <p className="font-medium text-[#2B2620]">{c.name}</p>
              <StatusBadge status={c.verification_status} />
            </div>
            <p className="text-xs text-[#8A8375] mb-1">{c.location} · {c.leader_name} ({c.leader_email})</p>
            {c.website && <p className="text-xs text-[#8A8375] mb-3">{c.website}</p>}
            {c.verification_status === "pending" && (
              <div className="flex gap-2 mt-2">
                <Button size="sm" className="rounded-full bg-[#3D6E64] hover:bg-[#2F5850]" onClick={() => setStatus(c.id, "verified")}>Verify</Button>
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => setStatus(c.id, "rejected")}>Reject</Button>
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}