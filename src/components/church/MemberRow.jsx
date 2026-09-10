import React from "react";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/shared/StatusBadge";

export default function MemberRow({ member, onApprove, onReject }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#F3EEE1] last:border-0">
      <div>
        <p className="text-sm text-[#2B2620]">{member.full_name || member.email}</p>
        <p className="text-xs text-[#8A8375] capitalize">{member.app_role?.replace("_", " ")}</p>
      </div>
      {member.app_role === "volunteer" ? (
        member.volunteer_status === "pending" ? (
          <div className="flex gap-2">
            <Button size="sm" className="rounded-full bg-[#3D6E64] hover:bg-[#2F5850]" onClick={() => onApprove(member.id)}>Approve</Button>
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => onReject(member.id)}>Decline</Button>
          </div>
        ) : (
          <StatusBadge status={member.volunteer_status} />
        )
      ) : null}
    </div>
  );
}