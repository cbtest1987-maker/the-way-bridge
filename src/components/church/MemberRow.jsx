import React from "react";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/shared/StatusBadge";
import { ShieldCheck, ShieldAlert, FileCheck } from "lucide-react";

export default function MemberRow({ member, onApproveRole, onRejectRole, onClearBg, onFailBg, onToggleReviewer }) {
  const roles = member.service_roles || [];
  const bgStatus = member.background_check_status || "none";
  const approved = member.church_approved || false;
  const isReviewer = member.care_safety_reviewer || false;
  const isCareVolunteer = roles.includes("care_volunteer");
  const needsBgCheck = isCareVolunteer && bgStatus !== "cleared";
  const canFullyServe = approved && !needsBgCheck;

  return (
    <div className="py-3 border-b border-[#F3EEE1] last:border-0">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-medium text-[#2B2620]">{member.full_name || member.email}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {roles.length > 0 ? roles.map((r) => (
              <span key={r} className="text-xs px-1.5 py-0.5 rounded-full bg-[#EAF2EE] text-[#3D6E64]">{r.replace(/_/g, " ")}</span>
            )) : (
              <span className="text-xs text-[#8A8375]">No service role</span>
            )}
          </div>
        </div>
        {canFullyServe ? (
          <StatusBadge status="verified" label="Ready to Serve" />
        ) : (
          <StatusBadge status="pending" label="Pending" />
        )}
      </div>

      {/* Status badges */}
      <div className="flex flex-wrap gap-2 mb-2">
        <div className="flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-[#8A8375]" />
          <span className="text-xs text-[#8A8375]">Church approval:</span>
          <StatusBadge status={approved ? "verified" : "pending"} />
        </div>
        {isCareVolunteer && (
          <div className="flex items-center gap-1">
            <FileCheck className="w-3 h-3 text-[#8A8375]" />
            <span className="text-xs text-[#8A8375]">Background check:</span>
            <StatusBadge status={bgStatus === "cleared" ? "verified" : bgStatus === "failed" ? "rejected" : bgStatus === "pending" ? "pending" : "none"} />
          </div>
        )}
        {isReviewer && (
          <div className="flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-amber-600" />
            <span className="text-xs text-amber-700">Care & Safety Reviewer</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {!approved && (
          <>
            <Button size="sm" className="rounded-full bg-[#3D6E64] hover:bg-[#2F5850] h-7 text-xs" onClick={() => onApproveRole(member.id)}>
              Approve Role
            </Button>
            <Button size="sm" variant="outline" className="rounded-full h-7 text-xs" onClick={() => onRejectRole(member.id)}>
              Reject
            </Button>
          </>
        )}
        {isCareVolunteer && bgStatus === "pending" && (
          <>
            <Button size="sm" variant="outline" className="rounded-full h-7 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => onClearBg(member.id)}>
              Mark BG Cleared
            </Button>
            <Button size="sm" variant="outline" className="rounded-full h-7 text-xs border-red-200 text-red-700 hover:bg-red-50" onClick={() => onFailBg(member.id)}>
              Mark BG Failed
            </Button>
          </>
        )}
        <Button size="sm" variant="ghost" className={`rounded-full h-7 text-xs ${isReviewer ? "text-amber-700" : ""}`} onClick={() => onToggleReviewer(member.id)}>
          {isReviewer ? "Remove Reviewer" : "Make Reviewer"}
        </Button>
      </div>
    </div>
  );
}