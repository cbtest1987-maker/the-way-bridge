import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, AlertTriangle, MessageCircle } from "lucide-react";
import NeedBadge from "@/components/request/NeedBadge";
import ChurchMatchCard from "@/components/request/ChurchMatchCard";
import PrivacyNote from "@/components/shared/PrivacyNote";
import { matchChurches } from "@/lib/churchMatch";

export default function SubmitRequest() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [followUpQuestions, setFollowUpQuestions] = useState([]);
  const [followUpAnswers, setFollowUpAnswers] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [churches, setChurches] = useState([]);
  const [selectedChurchId, setSelectedChurchId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const draft = sessionStorage.getItem("bridge_draft");
    if (draft) {
      const parsed = JSON.parse(draft);
      setMessage(parsed.message || "");
      setAnonymous(!!parsed.anonymous);
    }
  }, []);

  const loadFollowUpQuestions = async () => {
    setStep(2);
    setLoadingQuestions(true);
    try {
      const res = await base44.functions.invoke("requestFollowUp", { message });
      const questions = res.data.questions || [];
      setFollowUpQuestions(questions);
      setFollowUpAnswers(questions.map(() => ""));
      if (questions.length === 0) {
        // No follow-up questions needed — go straight to analysis
        runAnalysis([]);
      }
    } catch {
      setFollowUpQuestions([]);
      runAnalysis([]);
    }
    setLoadingQuestions(false);
  };

  const runAnalysis = async (answers) => {
    setAnalyzing(true);
    setStep(3);
    const formattedAnswers = answers
      .map((answer, i) => answer.trim() ? { question: followUpQuestions[i], answer: answer.trim() } : null)
      .filter(Boolean);
    const res = await base44.functions.invoke("analyzeRequest", { message, follow_up_answers: formattedAnswers });
    setAnalysis(res.data);
    if (res.data.safety_status === "safe" || res.data.safety_status === "sensitive") {
      const list = await base44.entities.Church.filter({ verification_status: "verified" });
      const needsWithConnection = res.data.needs.some((n) =>
        ["transportation", "food", "church_connection", "resources", "building", "church_planting", "fundraising", "disaster"].includes(n.type)
      );
      if (needsWithConnection) {
        setChurches(matchChurches(res.data.needs.map((n) => n.type), list));
      }
    }
    setAnalyzing(false);
  };

  const finalize = async () => {
    setSubmitting(true);
    const request = await base44.entities.PrayerRequest.create({
      message,
      is_anonymous: anonymous,
      safety_status: analysis.safety_status,
      status: analysis.safety_status === "flagged" || analysis.safety_status === "danger" ? "screening" : "matched",
      ai_summary: analysis.ai_summary,
      matched_church_id: selectedChurchId || undefined,
    });

    await Promise.all(
      analysis.needs.map((n) =>
        base44.entities.Need.create({
          request_id: request.id,
          type: n.type,
          details: n.details,
          church_id: selectedChurchId || undefined,
        })
      )
    );

    if (analysis.safety_status === "flagged" || analysis.safety_status === "danger") {
      await base44.entities.ComplianceCase.create({
        request_id: request.id,
        reason: `Auto-flagged as "${analysis.safety_status}" by AI safety screening.`,
      });
    }

    sessionStorage.removeItem("bridge_draft");
    navigate("/journey");
  };

  const churchNeeded = churches.length > 0;
  const isCrisis = analysis?.safety_status === "danger";
  const isBlocked = analysis?.safety_status === "flagged";

  return (
    <div className="max-w-xl mx-auto px-6 py-10">
      {/* Step 1: Message entry */}
      {step === 1 && (
        <div className="bg-white rounded-3xl border border-[#EFE8DA] p-6">
          <h1 className="font-serif text-2xl text-[#2B2620] mb-1">Share Your Prayer Request</h1>
          <p className="text-sm text-[#8A8375] mb-5">You can share as much or as little as you're comfortable.</p>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[140px] resize-none"
            maxLength={2000}
          />
          <div className="flex items-center gap-2 mt-4">
            <Switch checked={anonymous} onCheckedChange={setAnonymous} id="anon2" />
            <label htmlFor="anon2" className="text-sm text-[#8A8375]">Submit anonymously (your name won't be shared)</label>
          </div>
          <PrivacyNote>You control what is shared — we only share the information needed to connect you with the right people.</PrivacyNote>
          <Button
            onClick={loadFollowUpQuestions}
            disabled={!message.trim()}
            className="w-full mt-5 rounded-full bg-[#3D6E64] hover:bg-[#2F5850] text-white"
          >
            Continue
          </Button>
        </div>
      )}

      {/* Step 2: AI follow-up questions */}
      {step === 2 && (
        <div className="bg-white rounded-3xl border border-[#EFE8DA] p-6">
          {loadingQuestions ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Loader2 className="w-8 h-8 text-[#3D6E64] animate-spin mb-4" />
              <p className="font-serif text-lg text-[#2B2620]">Our AI Care Agent is listening...</p>
              <p className="text-sm text-[#8A8375] mt-1">Thinking about how to best support you.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4">
                <MessageCircle className="w-4 h-4 text-[#3D6E64]" />
                <h2 className="font-serif text-xl text-[#2B2620]">A few quick questions</h2>
              </div>
              <p className="text-sm text-[#8A8375] mb-4">
                These help us understand your needs and connect you to the right support. All questions are optional.
              </p>
              <div className="space-y-4">
                {followUpQuestions.map((q, i) => (
                  <div key={i}>
                    <label className="text-sm font-medium text-[#2B2620] mb-1.5 block">{q}</label>
                    <Textarea
                      value={followUpAnswers[i] || ""}
                      onChange={(e) => {
                        const updated = [...followUpAnswers];
                        updated[i] = e.target.value;
                        setFollowUpAnswers(updated);
                      }}
                      className="min-h-[70px] resize-none"
                      maxLength={500}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-5">
                <Button variant="outline" className="flex-1 rounded-full" onClick={() => runAnalysis([])}>
                  Skip
                </Button>
                <Button
                  onClick={() => runAnalysis(followUpAnswers)}
                  className="flex-1 rounded-full bg-[#3D6E64] hover:bg-[#2F5850] text-white"
                >
                  Continue
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 3: Analysis results */}
      {step === 3 && (
        <div className="bg-white rounded-3xl border border-[#EFE8DA] p-6">
          {analyzing ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Loader2 className="w-8 h-8 text-[#3D6E64] animate-spin mb-4" />
              <p className="font-serif text-lg text-[#2B2620]">Our AI Care Agent is analyzing your request...</p>
              <p className="text-sm text-[#8A8375] mt-1">This only takes a moment.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-[#3D6E64]" />
                <h2 className="font-serif text-xl text-[#2B2620]">Here's what we heard</h2>
              </div>
              <p className="text-sm text-[#8A8375] mb-4">{analysis.ai_summary}</p>

              {isCrisis && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">
                    It sounds like you may be in crisis. Your request has been sent immediately to a trained human reviewer for urgent, caring follow-up. If you are in immediate danger, please contact local emergency services.
                  </p>
                </div>
              )}
              {isBlocked && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700">
                    Your request has been received and is being reviewed by our team before routing, to keep our community safe.
                  </p>
                </div>
              )}

              {!isCrisis && !isBlocked && (
                <div className="space-y-2 mb-4">
                  {analysis.needs.map((n, i) => (
                    <NeedBadge key={i} type={n.type} details={n.details} />
                  ))}
                </div>
              )}

              <PrivacyNote>We only share the information needed to connect you with the right people.</PrivacyNote>

              <Button
                onClick={() => (isCrisis || isBlocked ? finalize() : setStep(churchNeeded ? 4 : 5))}
                disabled={submitting}
                className="w-full mt-5 rounded-full bg-[#3D6E64] hover:bg-[#2F5850] text-white"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue"}
              </Button>
            </>
          )}
        </div>
      )}

      {/* Step 4: Church matching */}
      {step === 4 && (
        <div className="bg-white rounded-3xl border border-[#EFE8DA] p-6">
          <h2 className="font-serif text-xl text-[#2B2620] mb-1">Churches Near You</h2>
          <p className="text-sm text-[#8A8375] mb-4">We found verified churches that match your needs.</p>
          <div className="space-y-3">
            {churches.map(({ church, percent }) => (
              <ChurchMatchCard
                key={church.id}
                church={church}
                percent={percent}
                selected={selectedChurchId === church.id}
                onSelect={() => setSelectedChurchId(church.id)}
              />
            ))}
            {churches.length === 0 && (
              <p className="text-sm text-[#8A8375]">No verified churches match yet — we'll still record your request and connect you as soon as one becomes available.</p>
            )}
          </div>
          <div className="flex gap-3 mt-5">
            <Button variant="outline" className="flex-1 rounded-full" onClick={() => setStep(5)}>
              Skip for now
            </Button>
            <Button onClick={() => setStep(5)} className="flex-1 rounded-full bg-[#3D6E64] hover:bg-[#2F5850] text-white">
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Step 5: Confirm */}
      {step === 5 && (
        <div className="bg-white rounded-3xl border border-[#EFE8DA] p-6 text-center">
          <h2 className="font-serif text-xl text-[#2B2620] mb-2">Ready to send this to prayer</h2>
          <p className="text-sm text-[#8A8375] mb-6">Your request will be prayed for and, where relevant, gently routed to caring hands.</p>
          <Button onClick={finalize} disabled={submitting} className="w-full rounded-full bg-[#3D6E64] hover:bg-[#2F5850] text-white">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Submit Request"}
          </Button>
        </div>
      )}
    </div>
  );
}