import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import StatusBadge from "@/components/shared/StatusBadge";
import { ScrollText, Loader2, ChevronRight, ChevronDown } from "lucide-react";

export default function JudgeView() {
  const [runs, setRuns] = useState([]);
  const [actionsByRun, setActionsByRun] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const runList = await base44.entities.AgentRun.filter({}, "-created_date", { limit: 50 });
    setRuns(runList);

    const actions = await Promise.all(
      runList.map((r) => base44.entities.AgentAction.filter({ run_id: r.id }, "created_date"))
    );
    const map = {};
    runList.forEach((r, i) => (map[r.id] = actions[i]));
    setActionsByRun(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center gap-2 mb-1">
        <ScrollText className="w-5 h-5 text-[#3D6E64]" />
        <h1 className="font-serif text-2xl text-[#2B2620]">Agent Audit Trail</h1>
      </div>
      <p className="text-sm text-[#8A8375] mb-6">Chronological view of Care Agent runs and actions.</p>

      {loading && <p className="text-sm text-[#8A8375]">Loading...</p>}
      {!loading && runs.length === 0 && <p className="text-sm text-[#8A8375]">No agent runs yet.</p>}

      <div className="space-y-3">
        {runs.map((run) => {
          const actions = actionsByRun[run.id] || [];
          const isOpen = expanded === run.id;
          return (
            <div key={run.id} className="bg-white rounded-2xl border border-[#EFE8DA] overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : run.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-[#FBF8F3]"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={run.status === "completed" ? "completed" : run.status === "running" ? "pending" : "declined"} />
                    <StatusBadge status={run.safety_level} />
                  </div>
                  <p className="text-sm font-medium text-[#2B2620]">{run.goal}</p>
                  <p className="text-xs text-[#8A8375] mt-1">{run.summary}</p>
                  {run.detected_needs && run.detected_needs.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {run.detected_needs.map((n, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-[#EAF2EE] text-[#3D6E64]">{n}</span>
                      ))}
                    </div>
                  )}
                </div>
                {isOpen ? <ChevronDown className="w-4 h-4 text-[#8A8375]" /> : <ChevronRight className="w-4 h-4 text-[#8A8375]" />}
              </button>

              {isOpen && (
                <div className="border-t border-[#F3EEE1] p-4 space-y-2">
                  {actions.length === 0 && <p className="text-xs text-[#8A8375]">No actions recorded.</p>}
                  {actions.map((a, i) => (
                    <div key={a.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-2 h-2 rounded-full ${a.result === "success" ? "bg-emerald-500" : a.result === "paused" ? "bg-amber-500" : "bg-red-500"}`} />
                        {i < actions.length - 1 && <div className="w-0.5 flex-1 bg-[#EFE8DA] mt-1" />}
                      </div>
                      <div className="flex-1 pb-3">
                        <p className="text-xs font-medium text-[#2B2620]">{a.action_type}</p>
                        <p className="text-xs text-[#8A8375]">{a.description}</p>
                        {a.result !== "success" && (
                          <span className="text-xs text-amber-600">{a.result}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}