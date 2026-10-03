import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import BackButton from "@/components/shared/BackButton";
import StatusBadge from "@/components/shared/StatusBadge";
import { Loader2, ScrollText } from "lucide-react";

export default function AgentRunDetail() {
  const { id } = useParams();
  const [run, setRun] = useState(null);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const r = await base44.entities.AgentRun.get(id);
      setRun(r);
      const a = await base44.entities.AgentAction.filter({ run_id: id }, "created_date");
      setActions(a);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#3D6E64]" /></div>;
  if (!run) return <div className="max-w-2xl mx-auto px-6 py-10"><BackButton /> <p className="text-[#8A8375]">Run not found.</p></div>;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <BackButton to="/judge" label="Back to Audit Trail" />

      <div className="flex items-center gap-2 mb-2">
        <ScrollText className="w-5 h-5 text-[#3D6E64]" />
        <h1 className="font-serif text-xl text-[#2B2620]">Agent Run</h1>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <StatusBadge status={run.status === "completed" ? "completed" : run.status === "running" ? "pending" : "declined"} />
        <StatusBadge status={run.safety_level} />
      </div>

      <div className="bg-white rounded-2xl border border-[#EFE8DA] p-4 mb-4">
        <p className="text-xs font-medium text-[#5B5648] mb-1">Goal</p>
        <p className="text-sm text-[#2B2620] leading-relaxed">{run.goal}</p>
      </div>

      {run.summary && (
        <div className="bg-[#FBF8F3] rounded-2xl border border-[#EFE8DA] p-4 mb-4">
          <p className="text-xs font-medium text-[#5B5648] mb-1">Summary</p>
          <p className="text-sm text-[#2B2620] leading-relaxed">{run.summary}</p>
        </div>
      )}

      {run.detected_needs && run.detected_needs.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#EFE8DA] p-4 mb-4">
          <p className="text-xs font-medium text-[#5B5648] mb-2">Detected Needs</p>
          <div className="flex flex-wrap gap-2">
            {run.detected_needs.map((n, i) => (
              <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-[#EAF2EE] text-[#3D6E64]">{n}</span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#EFE8DA] p-4">
        <p className="text-sm font-medium text-[#2B2620] mb-3">Action Timeline ({actions.length})</p>
        {actions.length === 0 ? (
          <p className="text-sm text-[#8A8375]">No actions recorded.</p>
        ) : (
          <div className="space-y-2">
            {actions.map((a, i) => (
              <div key={a.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-2 h-2 rounded-full ${a.result === "success" ? "bg-emerald-500" : a.result === "paused" ? "bg-amber-500" : "bg-red-500"}`} />
                  {i < actions.length - 1 && <div className="w-0.5 flex-1 bg-[#EFE8DA] mt-1" />}
                </div>
                <div className="flex-1 pb-3">
                  <p className="text-xs font-medium text-[#2B2620]">{a.action_type}</p>
                  {a.description && <p className="text-xs text-[#8A8375] mt-0.5">{a.description}</p>}
                  {a.result !== "success" && <span className="text-xs text-amber-600">{a.result}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}