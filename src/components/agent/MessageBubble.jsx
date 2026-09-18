import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { ChevronDown, ChevronUp, CheckCircle2, Loader2, XCircle, Clock } from "lucide-react";

const STATUS_META = {
  pending: { icon: Clock, label: "Pending", color: "text-[#8A8375]" },
  running: { icon: Loader2, label: "Running", color: "text-[#3D6E64]" },
  in_progress: { icon: Loader2, label: "In progress", color: "text-[#3D6E64]" },
  completed: { icon: CheckCircle2, label: "Done", color: "text-[#3D6E64]" },
  success: { icon: CheckCircle2, label: "Done", color: "text-[#3D6E64]" },
  failed: { icon: XCircle, label: "Failed", color: "text-red-500" },
  error: { icon: XCircle, label: "Error", color: "text-red-500" },
};

function FunctionDisplay({ toolCall }) {
  const [expanded, setExpanded] = useState(false);
  const meta = STATUS_META[toolCall.status] || STATUS_META.pending;
  const Icon = meta.icon;
  const isSpinning = toolCall.status === "running" || toolCall.status === "in_progress";
  const isFailed = toolCall.status === "failed" || toolCall.status === "error";
  const hideDetails = toolCall.display_projection?.hide_details && toolCall.display_projection?.details_redacted;

  let parsedResults = null;
  try {
    parsedResults = typeof toolCall.results === "string" ? JSON.parse(toolCall.results) : toolCall.results;
    if (parsedResults && typeof parsedResults === "object" && parsedResults.success === false) {
      // treat as failed
    }
  } catch {
    parsedResults = toolCall.results;
  }

  const effectiveMeta = isFailed ? STATUS_META.failed : meta;

  return (
    <div className="mt-2 text-xs border border-[#F3EEE1] rounded-xl bg-[#FBF8F3] p-2.5">
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 w-full text-left">
        <Icon className={`w-3.5 h-3.5 ${effectiveMeta.color} ${isSpinning ? "animate-spin" : ""}`} />
        <span className="font-medium text-[#5B5648] flex-1">{toolCall.name}</span>
        <span className={effectiveMeta.color}>{effectiveMeta.label}</span>
        {expanded ? <ChevronUp className="w-3 h-3 text-[#8A8375]" /> : <ChevronDown className="w-3 h-3 text-[#8A8375]" />}
      </button>
      {expanded && !hideDetails && (
        <div className="mt-2 space-y-1.5">
          {toolCall.arguments_string && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-[#B3AB9B] mb-0.5">Parameters</p>
              <pre className="text-[11px] text-[#5B5648] whitespace-pre-wrap break-words">{(() => {
                try { return JSON.stringify(JSON.parse(toolCall.arguments_string), null, 2); }
                catch { return toolCall.arguments_string; }
              })()}</pre>
            </div>
          )}
          {parsedResults != null && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-[#B3AB9B] mb-0.5">Result</p>
              <pre className="text-[11px] text-[#5B5648] whitespace-pre-wrap break-words">{(() => {
                try { return JSON.stringify(parsedResults, null, 2); }
                catch { return String(parsedResults); }
              })()}</pre>
            </div>
          )}
        </div>
      )}
      {expanded && hideDetails && (
        <p className="mt-1 text-[11px] text-[#B3AB9B]">Details hidden</p>
      )}
    </div>
  );
}

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${isUser ? "bg-[#3D6E64] text-white" : "bg-white border border-[#EFE8DA] text-[#2B2620]"}`}>
        {message.content && (isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="text-sm prose prose-sm max-w-none [&_p]:mb-1 [&_p:last-child]:mb-0">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        ))}
        {message.tool_calls?.map((tc, idx) => <FunctionDisplay key={idx} toolCall={tc} />)}
      </div>
    </div>
  );
}