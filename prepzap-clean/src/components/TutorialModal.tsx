import React from "react";
import { TutorialFeature } from "@/lib/tutorialContent";

interface TutorialModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  features: TutorialFeature[];
  title?: string;
}

export function TutorialModal({ isOpen, onDismiss, features, title = "How it works" }: TutorialModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#FAF7F2] border-4 border-black w-full max-w-md shadow-[8px_8px_0px_0px_#000] flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="border-b-4 border-black p-4 flex justify-between items-center bg-[#f0a040]">
          <h2 className="font-black text-[20px] uppercase tracking-wide">{title}</h2>
          <button 
            onClick={onDismiss}
            className="w-8 h-8 flex items-center justify-center border-2 border-black bg-white hover:bg-black hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
          {features.map((feat, idx) => (
            <div key={idx} className="flex gap-4 items-start">
              <div className="w-12 h-12 flex-shrink-0 border-2 border-black bg-white flex items-center justify-center shadow-[2px_2px_0px_0px_#000]">
                <span className="material-symbols-outlined text-[24px]">{feat.icon}</span>
              </div>
              <div className="flex-1 pt-1">
                <h3 className="font-black text-[15px] leading-tight mb-1">{feat.title}</h3>
                <p className="font-bold text-[12px] text-black/60 leading-snug">{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t-4 border-black p-4 bg-white flex justify-end gap-3">
          <button 
            onClick={onDismiss}
            className="px-6 py-3 bg-black text-white font-black text-[14px] uppercase tracking-widest border-2 border-black shadow-[4px_4px_0px_0px_#f0a040] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
