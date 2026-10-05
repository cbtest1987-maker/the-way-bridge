import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, FlaskConical, Church, ShoppingCart, ArrowRight } from "lucide-react";

const SCENARIOS = [
  {
    id: "A",
    label: "Resource Demo A — Church Network Match",
    icon: Church,
    input: "Our church needs a Communion Tray for our Christmas service.",
    expected: "Grace Community Church match found. Church-to-church connection created. No purchase options shown.",
    flow: [
      "Request received",
      "Gloo detects MINISTRY_RESOURCE",
      "search_ministry_resources",
      "Match: Grace Community Church",
      "ChurchConnectRequest created (status: open)",
      "Audit: CHURCH_RESOURCE_MATCH_FOUND",
    ],
  },
  {
    id: "B",
    label: "Resource Demo B — Purchase Fallback",
    icon: ShoppingCart,
    input: "Our church needs a Portable Communion Set for an outreach event.",
    expected: "No church match found. Purchase options offered ONLY if user clicks 'View Purchase Options'.",
    flow: [
      "Request received",
      "Gloo detects MINISTRY_RESOURCE",
      "search_ministry_resources",
      "No match found",
      "ChurchConnectRequest created (status: purchase_pending)",
      "Audit: CHURCH_RESOURCE_MATCH_NOT_FOUND",
      "User chooses: View Purchase Options or No Thanks",
    ],
  },
];

export default function MinistryResourceDemo() {
  const [running, setRunning] = useState(null);
  const [results, setResults] = useState({});

  const runScenario = async (scenario) => {
    setRunning(scenario.id);
    try {
      const res = await base44.functions.invoke("theWayCareAgent", {
        message: scenario.input,
        is_anonymous: false,
      });
      setResults(prev => ({ ...prev, [scenario.id]: res.data }));
    } catch (err) {
      setResults(prev => ({ ...prev, [scenario.id]: { error: err?.message || "Failed to run scenario." } }));
    }
    setRunning(null);
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="flex items-center gap-2 mb-1">
        <FlaskConical className="w-5 h-5 text-[#3D6E64]" />
        <h1 className="font-serif text-2xl text-[#2B2620]">Ministry Resource Demo</h1>
      </div>
      <p className="text-sm text-[#8A8375] mb-6">
        Two demonstrable scenarios for the MINISTRY_RESOURCE Church Connect workflow.
      </p>

      <div className="bg-[#EAF2EE] border border-[#BFD9CD] rounded-2xl p-4 mb-6">
        <p className="text-sm text-[#3D6E64] font-medium">Community comes before commerce.</p>
        <p className="text-xs text-[#5B5648] mt-1">
          Church need → search church network first → if another church can help: church-to-church connection → if no church can help: ask user about purchase options → only after explicit user choice: purchase options.
        </p>
      </div>

      <div className="space-y-4">
        {SCENARIOS.map(scenario => {
          const Icon = scenario.icon;
          const result = results[scenario.id];
          const isRunning = running === scenario.id;
          return (
            <div key={scenario.id} className="bg-white rounded-3xl border border-[#EFE8DA] p-5">
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-5 h-5 text-[#3D6E64]" />
                <h2 className="font-serif text-lg text-[#2B2620]">{scenario.label}</h2>
              </div>
              <div className="bg-[#FBF8F3] rounded-2xl p-3 mb-3">
                <p className="text-xs font-medium text-[#8A8375] mb-1">Input:</p>
                <p className="text-sm text-[#2B2620] italic">"{scenario.input}"</p>
              </div>
              <div className="bg-[#FBF8F3] rounded-2xl p-3 mb-3">
                <p className="text-xs font-medium text-[#8A8375] mb-1">Expected:</p>
                <p className="text-sm text-[#2B2620]">{scenario.expected}</p>
              </div>
              <div className="bg-[#FBF8F3] rounded-2xl p-3 mb-3">
                <p className="text-xs font-medium text-[#8A8375] mb-2">Flow:</p>
                <div className="space-y-1">
                  {scenario.flow.map((step, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {i > 0 && <ArrowRight className="w-3 h-3 text-[#BFD9CD] rotate-90" />}
                      <p className="text-xs text-[#5B5648]">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
              <Button
                className="rounded-full bg-[#3D6E64] hover:bg-[#2F5850]"
                disabled={isRunning}
                onClick={() => runScenario(scenario)}
              >
                {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : "Run Scenario"}
              </Button>
              {result && (
                <div className="mt-3 bg-[#EAF2EE] border border-[#BFD9CD] rounded-2xl p-3">
                  <p className="text-xs font-medium text-[#3D6E64] mb-1">Agent Response:</p>
                  {result.error ? (
                    <p className="text-sm text-red-600">{result.error}</p>
                  ) : (
                    <>
                      <p className="text-sm text-[#2B2620]">{result.message}</p>
                      {result.agent_run_id && (
                        <p className="text-xs text-[#8A8375] mt-2">Run ID: {result.agent_run_id}</p>
                      )}
                      {result.actions && result.actions.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs font-medium text-[#5B5648]">Tool calls:</p>
                          {result.actions.map((a, i) => (
                            <p key={i} className="text-xs text-[#8A8375]">→ {a.tool}</p>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}