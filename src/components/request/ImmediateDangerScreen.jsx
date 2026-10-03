import React from "react";
import { Phone, MessageSquare } from "lucide-react";

export default function ImmediateDangerScreen({ onReturn }) {
  return (
    <div className="max-w-lg mx-auto px-6 py-10">
      <div className="bg-white rounded-3xl border-2 border-red-300 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
          <Phone className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="font-serif text-2xl text-red-800 mb-3">Your Safety Comes First</h1>
        <p className="text-sm text-[#5B5648] mb-5 leading-relaxed">
          What you shared may indicate that you or someone else could be in immediate danger.
        </p>
        <p className="text-sm font-medium text-[#2B2620] mb-5">
          Do not wait for a prayer team or theWay Care Team to respond.
        </p>
        <div className="bg-red-50 rounded-2xl p-5 mb-5 text-left">
          <p className="text-sm text-[#2B2620] mb-3">
            If there is immediate danger or a medical emergency in the U.S., call 911 now.
          </p>
          <p className="text-sm text-[#2B2620]">
            If you are experiencing a suicide, mental-health, substance-use, or emotional crisis in the U.S., call or text 988.
          </p>
        </div>
        <div className="space-y-3">
          <a href="tel:911" className="flex items-center justify-center gap-2 w-full h-12 rounded-full bg-red-600 text-white font-medium text-sm hover:bg-red-700">
            <Phone className="w-4 h-4" /> Call 911
          </a>
          <a href="tel:988" className="flex items-center justify-center gap-2 w-full h-12 rounded-full bg-[#3D6E64] text-white font-medium text-sm hover:bg-[#2F5850]">
            <MessageSquare className="w-4 h-4" /> Call / Text 988
          </a>
          <button onClick={onReturn} className="w-full h-12 rounded-full border border-[#EFE8DA] text-[#8A8375] font-medium text-sm hover:bg-[#F3EEE1]">
            Return to App
          </button>
        </div>
        <p className="text-xs text-[#B3AB9B] mt-6">
          Your request has also been placed in our Care & Safety Review queue. theWay is not an emergency-response service, and response times can vary.
        </p>
      </div>
    </div>
  );
}