import React, { useState, useRef } from "react";
import {
  PRESET_AVATARS,
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
  avatar: "/buddies/fox_scholar.png",
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
  const [selectedAvatar, setSelectedAvatar] = useState(profileToUse.avatar || "/buddies/fox_scholar.png");
  const [isAvatarImage, setIsAvatarImage] = useState(profileToUse.isAvatarImage ?? true);
  const [avatarTab, setAvatarTab] = useState<"character" | "emoji" | "upload">("character");
  const [customImageUrl, setCustomImageUrl] = useState("");

  // Banner state
  const [selectedBannerId, setSelectedBannerId] = useState(profileToUse.bannerId || "amber_sunset");

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
      setSelectedAvatar(profileToUse.avatar || "/buddies/fox_scholar.png");
      setIsAvatarImage(profileToUse.isAvatarImage ?? true);
      setSelectedBannerId(profileToUse.bannerId || "amber_sunset");
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

    if (file.size > 3 * 1024 * 1024) {
      toast.error("Image file is too large (max 3MB)");
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
    });

    toast.success("Profile updated! ✨");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 animate-in fade-in">
      <div className="bg-[#FFFDF5] border-4 border-black rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-[8px_8px_0px_#1A1A1A] overflow-hidden">
        
        {/* Header */}
        <div className="border-b-4 border-black p-4 flex justify-between items-center bg-[#FFD13B] shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[22px] text-black">edit_note</span>
            <h3 className="font-black text-[16px] text-black uppercase tracking-wider">
              Edit Student Profile & Bio
            </h3>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-full border-2 border-black bg-white hover:bg-rose-50 flex items-center justify-center font-black text-black cursor-pointer shadow-[2px_2px_0px_#1A1A1A] active:translate-y-0.5"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 md:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* ── PROFILE LIVE PREVIEW CARD ──────────────────────────────────── */}
          <div className="border-2 border-black rounded-2xl overflow-hidden bg-white shadow-[3px_3px_0px_#1A1A1A]">
            <div className={`h-20 w-full ${currentBanner.className} border-b-2 border-black relative p-2 flex justify-end items-start`}>
              <span className="text-[10px] font-black uppercase tracking-wider bg-black/70 text-white px-2 py-0.5 rounded border border-white/20">
                Profile Preview
              </span>
            </div>
            <div className="px-4 pb-3.5 pt-0 -mt-8 flex items-end gap-3">
              <div className="w-16 h-16 rounded-2xl bg-white border-2 border-black flex items-center justify-center text-[30px] shadow-[3px_3px_0px_#1A1A1A] overflow-hidden shrink-0 bg-[#FAF7F2]">
                {isAvatarImage ? (
                  <img src={selectedAvatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{selectedAvatar}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-[15px] text-black truncate leading-tight">
                    {displayName || "Student Name"}
                  </span>
                  <span className="material-symbols-outlined text-[15px] text-[#10B981]">verified</span>
                </div>
                <div className="text-[11px] font-bold text-black/50 truncate">
                  {username || "@username"} &bull; {school || "Campus Creator"}
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
                onClick={() => { playTap(); setAvatarTab("character"); }}
                className={`flex-1 py-1.5 text-[11px] font-black rounded-lg transition-all cursor-pointer ${
                  avatarTab === "character"
                    ? "bg-[#FFD13B] text-black border border-black shadow-xs"
                    : "text-black/60 hover:text-black"
                }`}
              >
                Illustrated Buddies
              </button>
              <button
                type="button"
                onClick={() => { playTap(); setAvatarTab("emoji"); }}
                className={`flex-1 py-1.5 text-[11px] font-black rounded-lg transition-all cursor-pointer ${
                  avatarTab === "emoji"
                    ? "bg-[#FFD13B] text-black border border-black shadow-xs"
                    : "text-black/60 hover:text-black"
                }`}
              >
                Academic Emojis
              </button>
              <button
                type="button"
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
              <div className="grid grid-cols-5 gap-2.5 max-h-36 overflow-y-auto p-2 bg-white border-2 border-black rounded-xl">
                {PRESET_AVATARS.filter((a) => a.category === "character").map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => handleSelectPresetAvatar(a)}
                    className={`h-14 rounded-xl border-2 p-1 flex items-center justify-center transition-all cursor-pointer ${
                      selectedAvatar === a.src
                        ? "border-[#FF4D2E] bg-[#FFE566]/40 shadow-[2px_2px_0px_#1A1A1A] scale-105"
                        : "border-black/20 hover:border-black bg-[#FAF7F2]"
                    }`}
                    title={a.name}
                  >
                    <img src={a.src} alt={a.name} className="w-10 h-10 object-contain" />
                  </button>
                ))}
              </div>
            )}

            {/* Tab 2: Academic Emojis */}
            {avatarTab === "emoji" && (
              <div className="grid grid-cols-5 gap-2.5 max-h-36 overflow-y-auto p-2 bg-white border-2 border-black rounded-xl">
                {PRESET_AVATARS.filter((a) => a.category === "emoji").map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => handleSelectPresetAvatar(a)}
                    className={`h-14 rounded-xl border-2 flex items-center justify-center text-[26px] transition-all cursor-pointer ${
                      selectedAvatar === a.src
                        ? "border-[#FF4D2E] bg-[#FFE566]/40 shadow-[2px_2px_0px_#1A1A1A] scale-105"
                        : "border-black/20 hover:border-black bg-[#FAF7F2]"
                    }`}
                    title={a.name}
                  >
                    <span>{a.src}</span>
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
                    className="flex-1 py-2.5 px-3 bg-[#FAF7F2] hover:bg-white border-2 border-black rounded-xl font-black text-[12px] flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#1A1A1A] active:translate-y-0.5 cursor-pointer"
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
                    className="px-3 py-1.5 bg-black text-white rounded-xl font-black text-[11px] cursor-pointer hover:bg-[#FF4D2E]"
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
                      ? "border-black shadow-[2px_2px_0px_#000] bg-white ring-2 ring-[#FF4D2E]"
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
              <label className="block text-[11px] font-black uppercase tracking-wider text-black/70 mb-1">
                Display Name
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alex Rivera"
                className="w-full bg-white border-2 border-black px-3 py-2 text-[13px] font-bold rounded-xl outline-none focus:border-[#FF4D2E]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-black/70 mb-1">
                Handle
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. @alex_rivera"
                className="w-full bg-white border-2 border-black px-3 py-2 text-[13px] font-bold rounded-xl outline-none focus:border-[#FF4D2E]"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-black uppercase tracking-wider text-black/70">
                Bio & Study Focus
              </label>
              <span className="text-[10px] font-bold text-black/45">
                {bio.length}/180
              </span>
            </div>
            <textarea
              rows={3}
              maxLength={180}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell other students what you're revising (e.g. Pre-med sophomore grinding cellular biology and organic chemistry)..."
              className="w-full bg-white border-2 border-black p-3 text-[12.5px] font-semibold rounded-xl outline-none focus:border-[#FF4D2E] resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-black/70 mb-1">
                School or University
              </label>
              <input
                type="text"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="e.g. Lincoln High / State Univ"
                className="w-full bg-white border-2 border-black px-3 py-2 text-[12.5px] font-bold rounded-xl outline-none focus:border-[#FF4D2E]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-black/70 mb-1">
                Target Exam / Subject
              </label>
              <input
                type="text"
                value={targetExam}
                onChange={(e) => setTargetExam(e.target.value)}
                placeholder="e.g. AP Chemistry Midterm"
                className="w-full bg-white border-2 border-black px-3 py-2 text-[12.5px] font-bold rounded-xl outline-none focus:border-[#FF4D2E]"
              />
            </div>
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
              className="px-5 py-2 bg-[#FF4D2E] hover:bg-black text-white border-2 border-black rounded-xl font-black text-[12px] shadow-[2px_2px_0px_#1A1A1A] active:translate-y-0.5 transition-all cursor-pointer"
            >
              Save Profile
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
