import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function CallWithRex() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const topic = searchParams.get("topic") || "";

  useEffect(() => {
    navigate(`/teach-it?mode=voice${topic ? `&topic=${encodeURIComponent(topic)}` : ""}`, {
      replace: true,
    });
  }, [navigate, topic]);

  return (
    <div className="flex items-center justify-center min-h-[100dvh] bg-[#FAF7F2]">
      <div className="flex flex-col items-center gap-3">
        <span className="material-symbols-outlined text-[36px] animate-spin text-[#10B981]">
          progress_activity
        </span>
        <p className="font-bold text-[14px] text-black/70">Connecting to Pip Voice Studio...</p>
      </div>
    </div>
  );
}
