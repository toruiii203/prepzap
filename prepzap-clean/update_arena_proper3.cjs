const fs = require('fs');
let content = fs.readFileSync('src/pages/Arena.tsx', 'utf8');

// Ensure SharedSidebar is imported
if (!content.includes('SharedSidebar')) {
    content = content.replace('import { useNavigate } from "react-router-dom";', 'import { useNavigate } from "react-router-dom";\nimport { SharedSidebar } from "@/components/SharedSidebar";');
}

// Target the main return block
const targetStr = `  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#f5f0e8]">
      {/* "?"? Mobile header "?"? */}
      <header className="md:hidden sticky top-0 z-30 bg-[#f5f0e8] border-b-[1.5px] border-black px-4 py-3 flex justify-between items-center">
        <button
          onClick={() => navigate("/dashboard")}
          className="w-9 h-9 flex items-center justify-center border-2 border-black bg-white rounded-full shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
          aria-label="Back to dashboard"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </button>
        <div className="text-center">
          <h1 className="font-black text-[22px] text-black tracking-tight leading-none">Arena</h1>
          <p className="text-[11px] text-black/50 font-medium mt-0.5">Compete. Rank. Win.</p>
        </div>
        <div className="w-9 h-9 rounded-full border-2 border-black bg-black/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-[18px]">person</span>
        </div>
      </header>

      {/* "?"? Desktop header "?"? */}
      <header className="hidden md:flex items-end justify-between px-8 pt-8 pb-4 border-b-2 border-black">
        <div className="flex items-end gap-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 px-3 py-2 border-2 border-black bg-white font-bold text-[13px] shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all mb-1"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>Dashboard
          </button>
          <div>
            <h1 className="font-black text-[36px] text-black tracking-tight leading-none">Arena</h1>
            <p className="text-[13px] text-black/50 font-medium mt-1">Test your knowledge and compete with peers.</p>
          </div>
        </div>
      </header>`;

const replaceStr = `  return (
    <div className="w-full min-h-[100dvh] bg-[#f5f0e8] flex">
      <SharedSidebar active="/arena" />
      
      <div className="flex-1 flex flex-col md:ml-64 relative min-h-[100dvh]">
      {/* Mobile header */}
      <header className="md:hidden sticky top-0 z-30 bg-[#f5f0e8] border-b-[1.5px] border-black px-4 py-3 flex justify-between items-center">
        <div className="text-center mx-auto">
          <h1 className="font-black text-[22px] text-black tracking-tight leading-none">Arena</h1>
          <p className="text-[11px] text-black/50 font-medium mt-0.5">Compete. Rank. Win.</p>
        </div>
      </header>

      {/* Desktop header */}
      <header className="hidden md:flex items-end justify-between px-8 pt-8 pb-4 border-b-2 border-black">
        <div className="flex items-end gap-4">
          <div>
            <h1 className="font-black text-[36px] text-black tracking-tight leading-none">Arena</h1>
            <p className="text-[13px] text-black/50 font-medium mt-1">Test your knowledge and compete with peers.</p>
          </div>
        </div>
      </header>`;

const encodedTarget = targetStr.replace(/"\?"\?/g, '"?"?');

// The original file contains this exact string, but encoding issues might break the regex/replace. We will use a more robust replacement by splitting.
// Let's use a simpler replace strategy that doesn't rely on the emoji characters.
let splitArr = content.split('<div className="flex flex-col min-h-[100dvh] bg-[#f5f0e8]">');
if (splitArr.length > 1) {
    let topPart = splitArr[0];
    let bottomPart = splitArr[1];
    
    // We just replace the layout and remove the back buttons from bottomPart
    let newBottom = bottomPart.replace(/<button[^>]+navigate\("\/dashboard"\)[^>]+>[\s\S]*?<\/button>/g, '');
    
    // The mobile header text-center is now off-center because we removed the back button and avatar. Let's fix that.
    newBottom = newBottom.replace(/<div className="text-center">/, '<div className="text-center mx-auto">');
    // Remove the avatar placeholder in mobile header
    newBottom = newBottom.replace(/<div className="w-9 h-9 rounded-full border-2 border-black bg-black\/10 flex items-center justify-center">[\s\S]*?<\/div>/, '');

    content = topPart + '<div className="w-full min-h-[100dvh] bg-[#f5f0e8] flex"><SharedSidebar active="/arena" /><div className="flex-1 flex flex-col md:ml-64 relative">' + newBottom + '</div>';
    
    fs.writeFileSync('src/pages/Arena.tsx', content, 'utf8');
} else {
    console.error("Split failed on Arena.tsx");
}
