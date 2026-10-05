import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Mail, User as UserIcon } from "lucide-react";

export default function VolunteerConnectDialog({ volunteer, open, onClose }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-[#2B2620]">Connect with your volunteer</DialogTitle>
          <DialogDescription className="text-[#8A8375]">
            A volunteer from your church community has stepped forward to help. Reach out to coordinate next steps.
          </DialogDescription>
        </DialogHeader>
        {volunteer && (
          <div className="space-y-3 mt-2">
            <div className="flex items-center gap-3 bg-[#F3EEE1] rounded-2xl p-4">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0">
                <UserIcon className="w-5 h-5 text-[#3D6E64]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#2B2620]">{volunteer.full_name || "Volunteer"}</p>
                <a href={`mailto:${volunteer.email}`} className="text-xs text-[#3D6E64] flex items-center gap-1 hover:underline mt-0.5">
                  <Mail className="w-3 h-3" /> {volunteer.email}
                </a>
              </div>
            </div>
            <p className="text-xs text-[#8A8375]">
              Your volunteer has been notified that you need support. Use the email above to introduce yourself and share any details that will help them assist you.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}