import React, { useRef, useState } from 'react';
import { toPng } from 'html-to-image';

interface StatsCardExportProps {
  totalStudyHours: number;
  streak: number;
  totalXp: number;
}

export function StatsCardExport({ totalStudyHours, streak, totalXp }: StatsCardExportProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  const handleShare = async () => {
    if (!cardRef.current) return;
    setLoading(true);
    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 3 });
      
      const link = document.createElement('a');
      link.download = 'my-studenius-stats.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export image', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-4">
      {/* Hidden card strictly for image generation */}
      <div className="absolute top-0 left-0 -z-50 opacity-0 pointer-events-none">
        <div 
          ref={cardRef} 
          className="w-[400px] h-[500px] bg-[#FAF7F2] border-4 border-black p-8 flex flex-col justify-between"
          style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}
        >
          <div>
            <div className="flex items-center gap-3 mb-6">
              <img src="/fox_icon_final.png" alt="Studenius" className="w-12 h-12 border-2 border-black rounded-full" />
              <h2 className="text-[24px] font-black tracking-tighter uppercase">Studenius</h2>
            </div>
            
            <h1 className="text-[42px] font-black leading-[1.1] tracking-tight mb-8">
              I'm locked in.<br/>Are you?
            </h1>
            
            <div className="flex flex-col gap-4">
              <div className="bg-white border-2 border-black shadow-[4px_4px_0px_#000] p-4 flex items-center justify-between">
                <span className="text-[14px] font-bold uppercase tracking-widest text-black/50">Study Time</span>
                <span className="text-[24px] font-black">{totalStudyHours} hrs</span>
              </div>
              <div className="bg-[#E8534A] text-white border-2 border-black shadow-[4px_4px_0px_#000] p-4 flex items-center justify-between">
                <span className="text-[14px] font-bold uppercase tracking-widest text-white/70">Current Streak</span>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                  <span className="text-[24px] font-black">{streak} Days</span>
                </div>
              </div>
              <div className="bg-[#FFE566] text-black border-2 border-black shadow-[4px_4px_0px_#000] p-4 flex items-center justify-between">
                <span className="text-[14px] font-bold uppercase tracking-widest text-black/50">Total XP</span>
                <span className="text-[24px] font-black">{totalXp.toLocaleString()} XP</span>
              </div>
            </div>
          </div>
          
          <div className="text-center text-[12px] font-bold uppercase tracking-widest text-black/40 mt-8 border-t-2 border-black pt-4">
            Join me at studenius.com
          </div>
        </div>
      </div>

      <button 
        onClick={handleShare} 
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-black text-white text-[12px] font-black uppercase tracking-widest hover:bg-black/80 transition-colors shadow-[3px_3px_0px_rgba(0,0,0,0.3)] disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-[18px]">share</span>
        {loading ? 'Exporting...' : 'Share to IG'}
      </button>
    </div>
  );
}
