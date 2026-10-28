import * as Dialog from "@radix-ui/react-dialog";
import { PROFILE_PORTRAITS } from "@/lib/profilePortraits";
import React, { useState, useRef } from "react";
import {
  PRESET_BANNERS,
  StudentProfileData,
  PresetAvatar,
  PresetBanner
} from "@/lib/userProfileStore";
import { playPop, playTap, playSuccess } from "@/lib/soundFX";
import { toast } from "sonner";

interface EditProfileModalProps {
  isOpen: boolean;
  currentProfile?: StudentProfileData;
  initialProfile?: StudentProfileData;
  onClose: () => void;
  onSave: (updated: Partial<StudentProfileData>) => void;
}

const FALLBACK_PROFILE: StudentProfileData = {
  displayName: "Student Scholar",
  username: "@studenius_student",
  bio: "Prepping for upcoming exams.",
  avatar: "/avatars/seedling.svg",
  isAvatarImage: true,
  bannerId: "amber_sunset",
  school: "Studenius Academy",
  targetExam: "Midterm Exams",
  targetSubject: "General Studies",
  verifiedStudent: true
};

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  currentProfile,
  initialProfile,
  onClose,
  onSave,
}) => {
  const profileToUse = currentProfile || initialProfile || FALLBACK_PROFILE;

  const [displayName, setDisplayName] = useState(profileToUse.displayName || "Student Scholar");
  const [username, setUsername] = useState(
    (profileToUse.username || "@student").startsWith("@")
      ? profileToUse.username || "@student"
      : `@${profileToUse.username || "student"}`
  );
  const [bio, setBio] = useState(profileToUse.bio || "");
  const [school, setSchool] = useState(profileToUse.school || "");
  const [targetExam, setTargetExam] = useState(profileToUse.targetExam || "");
  const [targetSubject, setTargetSubject] = useState(profileToUse.targetSubject || "");

  // Avatar state
  const [selectedAvatar, setSelectedAvatar] = useState(profileToUse.avatar || "/avatars/seedling.svg");
  const [isAvatarImage, setIsAvatarImage] = useState(profileToUse.isAvatarImage ?? true);
  const [avatarTab, setAvatarTab] = useState<"character" | "upload">("character");
  const [customImageUrl, setCustomImageUrl] = useState("");

  // Banner state
  const [selectedBannerId, setSelectedBannerId] = useState(profileToUse.bannerId || "amber_sunset");

  // Privacy state
  const [hideHearts, setHideHearts] = useState(profileToUse.hideHearts ?? false);

  // Keep state synchronized when profile prop updates
  React.useEffect(() => {
    if (isOpen) {
      setDisplayName(profileToUse.displayName || "Student Scholar");
      setUsername(
        (profileToUse.username || "@student").startsWith("@")
          ? profileToUse.username || "@student"
          : `@${profileToUse.username || "student"}`
      );
      setBio(profileToUse.bio || "");
      setSchool(profileToUse.school || "");
      setTargetExam(profileToUse.targetExam || "");
      setTargetSubject(profileToUse.targetSubject || "");
      setSelectedAvatar(profileToUse.avatar || "/avatars/seedling.svg");
      setIsAvatarImage(profileToUse.isAvatarImage ?? true);
      setSelectedBannerId(profileToUse.bannerId || "amber_sunset");
      setHideHearts(profileToUse.hideHearts ?? false);
    }
  }, [isOpen, profileToUse]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const currentBanner = PRESET_BANNERS.find((b) => b.id === selectedBannerId) || PRESET_BANNERS[0];

  const handleSelectPresetAvatar = (item: PresetAvatar) => {
    playTap();
    setSelectedAvatar(item.src);
    setIsAvatarImage(item.isImage);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file (PNG, JPG, WebP).");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image file is too large (maximum 2MB allowed).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setSelectedAvatar(result);
        setIsAvatarImage(true);
        playSuccess();
        toast.success("Profile photo uploaded!");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyCustomUrl = () => {
    if (!customImageUrl.trim()) return;
    setSelectedAvatar(customImageUrl.trim());
    setIsAvatarImage(true);
    playPop();
    toast.success("Avatar image linked!");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    playSuccess();

    const cleanUsername = username.trim().startsWith("@")
      ? username.trim()
      : `@${username.trim()}`;

    onSave({
      displayName: displayName.trim() || "Student Scholar",
      username: cleanUsername,
      bio: bio.trim(),
      school: school.trim(),
      targetExam: targetExam.trim(),
      targetSubject: targetSubject.trim(),
      avatar: selectedAvatar,
      isAvatarImage,
      bannerId: selectedBannerId,
      hideHearts
    });

    toast.success("Profile updated!");
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={open=>{if(!open)onClose();}}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-[80] bg-black/60"/>
      <Dialog.Content aria-describedby="profile-editor-description" style={{width:"calc(100% - 2 * max(12px, env(safe-area-inset-left, 0px), env(safe-area-inset-right, 0px)))",maxHeight:"calc(100dvh - 2 * max(12px, env(safe-area-inset-top, 0px), env(safe-area-inset-bottom, 0px)))"}} className="[&_button]:min-h-11 [&_button]:min-w-11 [&_input:not([type=checkbox])]:min-h-11 fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[81] bg-[#FFFDF5] border-2 border-black rounded-3xl w-[calc(100%-24px)] max-w-xl max-h-[calc(100dvh-24px)] flex flex-col shadow-[4px_4px_0px_#000000] overflow-hidden">
        
        {/* Header */}
        <div className="border-b-2 border-black p-4 flex justify-between gap-3 items-center bg-[#FFD13B] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span style={{color:"var(--pz-ink, #000000)"}} className="material-symbols-outlined text-[22px] text-black">edit_note</span>
            <Dialog.Title style={{color:"var(--pz-ink, #000000)"}} className="font-black text-xl text-black">Edit profile</Dialog.Title><Dialog.Description id="profile-editor-description" className="sr-only">Choose a portrait and edit your profile. Changes are saved only when you select Save Profile.</Dialog.Description>
          </div>
          <button
            onClick={onClose}
            aria-label="Close profile editor"
            type="button"
            className="w-11 h-11 shrink-0 rounded-full border-2 border-black bg-white hover:bg-rose-50 flex items-center justify-center font-black text-black cursor-pointer shadow-[2px_2px_0px_#000000] active:translate-y-0.5"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 md:p-6 overflow-y-auto space-y-5 flex-1 min-h-0">
          
          {/* ── PROFILE LIVE PREVIEW CARD ──────────────────────────────────── */}
          <div className="border-2 border-black rounded-2xl overflow-hidden bg-white shadow-[3px_3px_0px_#000000]">
            <div className={`h-20 w-full ${currentBanner.className} border-b-2 border-black relative p-2 flex justify-end items-start`}>
              <span className="text-[10px] font-black uppercase tracking-wider bg-black/70 text-white px-2 py-0.5 rounded border border-white/20">
                Profile Preview
              </span>
            </div>
            <div data-profile-preview-row className="relative z-10 px-4 pb-4 flex items-start gap-3">
              <div data-profile-preview-avatar className="relative -mt-7 w-16 h-16 rounded-2xl bg-white border-2 border-black flex items-center justify-center text-[30px] shadow-[3px_3px_0px_#000000] overflow-hidden shrink-0 bg-[#FAF7F2]">
                {isAvatarImage ? (
                  <img src={selectedAvatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{selectedAvatar}</span>
                )}
              </div>
              <div className="min-w-0 flex-1 pt-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-black text-base text-black break-words leading-snug [overflow-wrap:anywhere]">
                    {displayName || "Student Name"}
                  </span>
                  {profileToUse.verifiedStudent && <span aria-label="Verified student" className="material-symbols-outlined text-[15px] text-[#10B981]">verified</span>}
                </div>
                <div className="text-xs font-bold text-black/60 break-words [overflow-wrap:anywhere]">
                  {username || "@username"}{school && <span className="block mt-1">{school}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* ── 1. AVATAR PICKER ───────────────────────────────────────────── */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-black/70 mb-2">
              Profile Picture / Avatar
            </label>

            {/* Sub-tabs */}
            <div className="flex border-2 border-black rounded-xl overflow-hidden mb-3 bg-[#FAF7F2] p-1 gap-1">
              <button
                type="button"
                aria-pressed={avatarTab === "character"}
                onClick={() => { playTap(); setAvatarTab("character"); }}
                className={`flex-1 py-1.5 text-[11px] font-black rounded-lg transition-all cursor-pointer ${
                  avatarTab === "character"
                    ? "bg-[#FFD13B] text-black border border-black shadow-xs"
                    : "text-black/60 hover:text-black"
                }`}
              >
                Studenius portraits
              </button>
              <button
                type="button"
                aria-label="Upload Image"
                aria-pressed={avatarTab === "upload"}
                onClick={() => { playTap(); setAvatarTab("upload"); }}
                className={`flex-1 py-1.5 text-[11px] font-black rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  avatarTab === "upload"
                    ? "bg-[#FFD13B] text-black border border-black shadow-xs"
                    : "text-black/60 hover:text-black"
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">upload</span>
                Upload Image
              </button>
            </div>

            {/* Tab 1: Character Avatars */}
            {avatarTab === "character" && (
              <div className="grid grid-cols-4 gap-2.5 p-2 bg-white border-2 border-black rounded-xl">
                {PROFILE_PORTRAITS.map((a) => (
                  <button
                    key={a.id}
                    aria-label={a.name}
                    aria-pressed={selectedAvatar === a.src}
                    type="button"
                    onClick={() => handleSelectPresetAvatar(a)}
                    className={`h-14 rounded-xl border-2 p-1 flex items-center justify-center transition-all cursor-pointer ${
                      selectedAvatar === a.src
                        ? "border-[#245C3B] bg-[#FFD13B] shadow-[2px_2px_0px_#000000]"
                        : "border-black/20 hover:border-black bg-[#FAF7F2]"
                    }`}
                    title={a.name}
                  >
                    <img src={a.src} alt={a.name} className="w-11 h-11 object-contain" />
                  </button>
                ))}
              </div>
            )}

            {/* Tab 3: Custom Image Upload / URL */}
            {avatarTab === "upload" && (
              <div className="p-3.5 bg-white border-2 border-black rounded-xl space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2.5 px-3 bg-[#FAF7F2] hover:bg-white border-2 border-black rounded-xl font-black text-[12px] flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#000000] active:translate-y-0.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                    <span>Choose Photo from Device</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="Or paste an image URL..."
                    value={customImageUrl}
                    onChange={(e) => setCustomImageUrl(e.target.value)}
                    className="flex-1 px-3 py-1.5 border-2 border-black rounded-xl text-[12px] bg-[#FAF7F2] outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCustomUrl}
                    className="px-3 py-1.5 bg-black text-white rounded-xl font-black text-[11px] cursor-pointer hover:bg-[#10B981]"
                  >
                    Apply
                  </button>
                </div>
                <p className="text-[10.5px] font-medium text-black/50">
                  Tip: Supports PNG, JPG, WebP photos. Images will stay linked on your profile.
                </p>
              </div>
            )}
          </div>

          {/* ── 2. COVER BANNER THEME ──────────────────────────────────────── */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-black/70 mb-2">
              Profile Banner Theme
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESET_BANNERS.map((banner) => (
                <button
                  key={banner.id}
                  type="button"
                  onClick={() => { playTap(); setSelectedBannerId(banner.id); }}
                  className={`p-2 border-2 rounded-xl text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                    selectedBannerId === banner.id
                      ? "border-black shadow-[2px_2px_0px_#000] bg-white ring-2 ring-[#10B981]"
                      : "border-black/20 hover:border-black bg-white"
                  }`}
                >
                  <div className={`h-8 w-full rounded-lg ${banner.className} border border-black/20`} />
                  <span className="text-[11px] font-black text-black truncate">{banner.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── 3. PROFILE IDENTITY & BIO ──────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="profile-display-name" className="block text-[11px] font-black uppercase tracking-wider text-black/70 mb-1">
                Display Name
              </label>
              <input
                id="profile-display-name"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alex Rivera"
                className="w-full bg-white border-2 border-black px-3 py-2 text-base font-bold rounded-xl outline-none focus:border-[#10B981]"
              />
            </div>

            <div>
              <label htmlFor="profile-handle" className="block text-[11px] font-black uppercase tracking-wider text-black/70 mb-1">
                Handle
              </label>
              <input
                id="profile-handle"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. @alex_rivera"
                className="w-full bg-white border-2 border-black px-3 py-2 text-base font-bold rounded-xl outline-none focus:border-[#10B981]"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="profile-bio" className="text-[11px] font-black uppercase tracking-wider text-black/70">
                Bio & Study Focus
              </label>
              <span className="text-[10px] font-bold text-black/45">
                {bio.length}/180
              </span>
            </div>
            <textarea
                id="profile-bio"
              rows={3}
              maxLength={180}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell other students what you're revising (e.g. Pre-med sophomore grinding cellular biology and organic chemistry)..."
              className="w-full bg-white border-2 border-black p-3 text-base font-semibold rounded-xl outline-none focus:border-[#10B981] resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="profile-school" className="block text-[11px] font-black uppercase tracking-wider text-black/70 mb-1">
                School or University
              </label>
              <input
                id="profile-school"
                type="text"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="e.g. Lincoln High / State Univ"
                className="w-full bg-white border-2 border-black px-3 py-2 text-base font-bold rounded-xl outline-none focus:border-[#10B981]"
              />
            </div>

            <div>
              <label htmlFor="profile-exam" className="block text-[11px] font-black uppercase tracking-wider text-black/70 mb-1">
                Target Exam / Subject
              </label>
              <input
                id="profile-exam"
                type="text"
                value={targetExam}
                onChange={(e) => setTargetExam(e.target.value)}
                placeholder="e.g. AP Chemistry Midterm"
                className="w-full bg-white border-2 border-black px-3 py-2 text-base font-bold rounded-xl outline-none focus:border-[#10B981]"
              />
            </div>
          </div>

          {/* Privacy Controls */}
          <div className="p-3 bg-[#FAF7F2] border-2 border-black rounded-xl flex items-center justify-between gap-3">
            <div>
              <div className="text-[12px] font-black text-black">Hide Hearts on Profile</div>
              <div className="text-[10.5px] font-semibold text-black/55">
                Keep peer appreciation count private on your public profile.
              </div>
            </div>
            <input
              type="checkbox"
              checked={hideHearts}
              onChange={(e) => setHideHearts(e.target.checked)}
              className="w-4 h-4 accent-[#10B981] rounded cursor-pointer"
            />
          </div>

          {/* Footer Submit Buttons */}
          <div className="pt-3 border-t-2 border-black/10 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border-2 border-black rounded-xl font-black text-[12px] bg-white hover:bg-[#FAF7F2] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#10B981] hover:bg-black text-white border-2 border-black rounded-xl font-black text-[12px] shadow-[2px_2px_0px_#000000] active:translate-y-0.5 transition-all cursor-pointer"
            >
              Save Profile
            </button>
          </div>

        </form>
      </Dialog.Content></Dialog.Portal></Dialog.Root>
  );
};
