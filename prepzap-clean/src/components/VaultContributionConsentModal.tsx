import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { setVaultConsent } from "@/lib/vaultContributionPipeline";
import { playPop, playSuccess } from "@/lib/soundFX";

interface VaultContributionConsentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
  onConsentChange?: (enabled: boolean) => void;
}

export function VaultContributionConsentModal({
  open,
  onOpenChange,
  userId,
  onConsentChange,
}: VaultContributionConsentModalProps) {
  const handleOptIn = () => {
    playSuccess();
    setVaultConsent(true, userId);
    onConsentChange?.(true);
    onOpenChange(false);
  };

  const handleDecline = () => {
    playPop();
    setVaultConsent(false, userId);
    onConsentChange?.(false);
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs animate-in fade-in-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 bg-[#FFFDF5] border-3 border-black p-6 shadow-[6px_6px_0px_#000] focus:outline-hidden animate-in zoom-in-95 font-['Nunito',sans-serif]"
          aria-describedby="vault-consent-description"
        >
          <div className="flex items-center gap-2 mb-3">
            <span
              className="w-8 h-8 rounded-full border-2 border-black bg-[#FFD13B] flex items-center justify-center text-black font-black"
              aria-hidden="true"
            >
              <span className="material-symbols-outlined text-[18px]">menu_book</span>
            </span>
            <Dialog.Title className="text-[17px] font-black text-black">
              Contribute to Study Vault
            </Dialog.Title>
          </div>

          <div id="vault-consent-description" className="space-y-3 text-[13px] text-black/80 font-bold leading-relaxed">
            <p>
              Help fellow learners by automatically turning study-worthy AI explanations into anonymized, public study guides in the <strong>Study Vault</strong>.
            </p>

            <div className="bg-white border-2 border-black p-3 space-y-2 text-[12px]">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] text-green-700 shrink-0 mt-0.5">
                  verified_user
                </span>
                <span>
                  <strong>Strictly Anonymous:</strong> Your name, username, and account ID are never attached to public notes.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] text-green-700 shrink-0 mt-0.5">
                  lock
                </span>
                <span>
                  <strong>No Personal Data or Files:</strong> Your own prompts, private messages, and uploaded files are never published.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] text-green-700 shrink-0 mt-0.5">
                  tune
                </span>
                <span>
                  <strong>Full Control:</strong> Exclude individual chats anytime, or turn this off in Settings whenever you choose.
                </span>
              </div>
            </div>

            <p className="text-[11px] text-black/50">
              In accordance with the Philippine Data Privacy Act, participation is 100% voluntary and explicit consent is required.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 mt-5 pt-3 border-t-2 border-black/10">
            <button
              type="button"
              onClick={handleDecline}
              className="px-3.5 py-2 border-2 border-black bg-white hover:bg-[#FAF7F2] font-black text-[12px] uppercase tracking-wider text-black cursor-pointer shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
            >
              Not Now
            </button>
            <button
              type="button"
              onClick={handleOptIn}
              className="px-4 py-2 border-2 border-black bg-[#10B981] hover:bg-[#059669] text-white font-black text-[12px] uppercase tracking-wider cursor-pointer shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">check</span>
              <span>Opt In to Contribute</span>
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
