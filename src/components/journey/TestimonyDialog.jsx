import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Sparkles } from "lucide-react";

export default function TestimonyDialog({ journey, open, onClose }) {
  const [content, setContent] = useState("");
  const [shareName, setShareName] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleShare = async () => {
    if (!content.trim()) return;
    setSaving(true);
    await base44.entities.Testimony.create({
      request_id: journey.id,
      content: content.trim(),
      is_anonymous: !shareName,
      is_published: true
    });
    setSaving(false);
    setSubmitted(true);
  };

  const handleClose = () => {
    setContent("");
    setShareName(true);
    setSubmitted(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="rounded-3xl max-w-md bg-[#333333] border-[#444444]">
        {submitted ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#EAF2EE] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-[#3D6E64]" />
            </div>
            <p className="font-serif text-lg text-white mb-1">Thank you for sharing!</p>
            <p className="text-sm text-white mb-5">Your testimony has been submitted and will be reviewed before publishing.</p>
            <Button onClick={handleClose} className="rounded-full bg-[#3D6E64] hover:bg-[#2F5850]">Close</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-serif text-xl text-white">Share Your Testimony?</DialogTitle>
              <DialogDescription className="text-white">
                Would you like to share how God answered your prayer? Your story can encourage others in the community.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <Textarea
                placeholder="Share your testimony..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="rounded-xl min-h-[120px] bg-[#444444] border-[#555555] text-white placeholder:text-white/60"
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShareName(true)}
                  className={`flex-1 rounded-xl border p-3 text-left transition ${shareName ? "border-[#3D6E64] bg-[#EAF2EE]" : "border-[#555555] bg-[#444444]"}`}
                >
                  <p className={`text-sm font-medium ${shareName ? "text-[#2B2620]" : "text-white"}`}>Share with my name</p>
                  <p className={`text-xs ${shareName ? "text-[#5C5648]" : "text-white"}`}>{journey?.display_name || "Your name"} will be shown</p>
                </button>
                <button
                  type="button"
                  onClick={() => setShareName(false)}
                  className={`flex-1 rounded-xl border p-3 text-left transition ${!shareName ? "border-[#3D6E64] bg-[#EAF2EE]" : "border-[#555555] bg-[#444444]"}`}
                >
                  <p className={`text-sm font-medium ${!shareName ? "text-[#2B2620]" : "text-white"}`}>Share anonymously</p>
                  <p className={`text-xs ${!shareName ? "text-[#5C5648]" : "text-white"}`}>Your name will be hidden</p>
                </button>
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={handleClose} className="rounded-full text-white border-white/40 hover:bg-white/10">Maybe Later</Button>
              <Button onClick={handleShare} disabled={!content.trim() || saving} className="rounded-full bg-[#3D6E64] hover:bg-[#2F5850] text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Share Testimony"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}