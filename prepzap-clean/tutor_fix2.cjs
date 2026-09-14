const fs = require('fs');
let content = fs.readFileSync('src/pages/AITutor.tsx', 'utf8');

const composerTarget = `{/* Input */}
              <div className="shrink-0 px-8 pb-6 pt-4 border-t-2 border-black bg-[#FAF7F2]">
                <div className="border-2 border-black bg-white flex items-end gap-2 p-2" style={{ boxShadow: "3px 3px 0px #000" }}>
                  <button onClick={() => navigate("/sources")}
                    className="w-11 h-11 flex items-center justify-center hover:bg-[#F0EDE0] transition-colors flex-shrink-0">
                    <span className="material-symbols-outlined text-[22px]">attach_file</span>
                  </button>
                  <textarea
                    ref={textareaRef}
                    value={inputVal}
                    onChange={(e) => handleTextareaChange(e, textareaRef)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                    }}
                    placeholder="Ask Rex a question..."
                    className="flex-1 bg-transparent py-3 px-2 outline-none font-bold text-[14px] resize-none overflow-hidden placeholder:text-black/30"
                    rows={1}
                    style={{ minHeight: "44px", maxHeight: "200px" }}
                  />
                  {isRecording ? (
                    <button onClick={stopRecording} className="w-11 h-11 flex items-center justify-center flex-shrink-0 text-[#ae2925] animate-pulse">
                      <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>mic</span>
                    </button>
                  ) : (
                    <button onClick={startRecording} className="w-11 h-11 flex items-center justify-center hover:bg-[#F0EDE0] transition-colors flex-shrink-0">
                      <span className="material-symbols-outlined text-[22px]">mic</span>
                    </button>
                  )}
                  <button onClick={() => handleSend()}
                    disabled={!inputVal.trim() || isLoading}
                    className="w-11 h-11 bg-black text-white flex items-center justify-center flex-shrink-0 disabled:opacity-50 hover:bg-[#ae2925] transition-colors">
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                  </button>
                </div>
              </div>`;

const composerReplace = `{/* Input */}
              <div className="shrink-0 px-4 md:px-8 pb-6 pt-4 border-t-2 border-black bg-[#FAF7F2] flex flex-col gap-3">
                {/* Learning Modes (Desktop/Mobile) */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 md:mx-0 md:px-0">
                  {STUDY_ACTIONS.map(a => (
                    <button key={a.id} onClick={() => setActiveMode(a.id)}
                      className={\`shrink-0 px-3 py-1.5 border-2 border-black text-[11px] font-black uppercase tracking-widest transition-all \${activeMode === a.id ? "bg-[#ae2925] text-white shadow-[2px_2px_0px_#000]" : "bg-white text-black hover:bg-[#F0EDE0] shadow-[2px_2px_0px_#000]"}\`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
                
                {/* Index Card Composer */}
                <div className="relative border-2 border-black bg-white shadow-[4px_4px_0px_#000] flex flex-col pt-4">
                  {/* Worksheet lines background */}
                  <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, rgba(0,0,0,0.1) 27px, rgba(0,0,0,0.1) 28px)', backgroundPositionY: '8px' }} />
                  
                  <textarea
                    ref={textareaRef}
                    value={inputVal}
                    onChange={(e) => handleTextareaChange(e, textareaRef)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                    }}
                    placeholder="Write your question here..."
                    className="relative z-10 w-full bg-transparent px-5 outline-none font-bold text-[14px] leading-[28px] resize-none overflow-hidden placeholder:text-black/30 placeholder:font-black"
                    rows={2}
                    style={{ minHeight: "56px", maxHeight: "200px" }}
                  />
                  
                  <div className="relative z-10 flex items-center justify-between p-3 border-t-2 border-black bg-[#F0EDE0] mt-2">
                    <div className="flex items-center gap-2">
                      <button onClick={() => navigate("/sources")} className="w-10 h-10 border-2 border-black bg-white flex items-center justify-center hover:bg-black hover:text-white transition-colors shadow-[2px_2px_0px_#000]">
                        <span className="material-symbols-outlined text-[18px]">attach_file</span>
                      </button>
                      <button onClick={isRecording ? stopRecording : startRecording} className={\`w-10 h-10 border-2 border-black flex items-center justify-center transition-colors shadow-[2px_2px_0px_#000] \${isRecording ? 'bg-[#FF4D2E] text-white animate-pulse' : 'bg-white hover:bg-black hover:text-white'}\`}>
                        <span className="material-symbols-outlined text-[18px]" style={isRecording ? {fontVariationSettings: "'FILL' 1"} : {}}>mic</span>
                      </button>
                    </div>
                    
                    <button onClick={() => handleSend()}
                      disabled={!inputVal.trim() || isLoading}
                      className="px-6 py-2 bg-black text-white border-2 border-black font-black uppercase tracking-widest text-[13px] disabled:opacity-50 hover:bg-[#ae2925] transition-colors shadow-[3px_3px_0px_#000] active:translate-y-1 active:shadow-none">
                      SEND
                    </button>
                  </div>
                </div>
              </div>`;

content = content.replace(composerTarget, composerReplace);

// Don't forget Mobile layout Composer!
const mobileComposerTarget = `<div className="shrink-0 p-4 border-t-2 border-black bg-[#FAF7F2] z-20">
            {activeSource && (
              <div className="mb-2 flex items-center gap-2 border-2 border-black rounded-full px-3 py-1 bg-white inline-flex max-w-full">
                <span className="material-symbols-outlined text-[14px]">description</span>
                <span className="text-[11px] font-bold truncate flex-1">{activeSource}</span>
                <button onClick={handleClearSource} className="material-symbols-outlined text-[13px] hover:text-[#FF4D2E] shrink-0 transition-colors">close</button>
              </div>
            )}
            <div className="flex items-end gap-2 w-full">
              <button onClick={() => navigate("/sources")}
                className="w-11 h-11 shrink-0 bg-white border-2 border-black rounded-xl flex items-center justify-center shadow-[2px_2px_0px_#000] active:translate-y-0.5">
                <span className="material-symbols-outlined text-[20px]">attach_file</span>
              </button>
              <textarea
                ref={mobileTextareaRef}
                value={inputVal}
                onChange={(e) => handleTextareaChange(e, mobileTextareaRef)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
                placeholder="Ask Rex..."
                className="flex-1 bg-white border-2 border-black rounded-xl p-3 outline-none font-bold text-[13px] shadow-[2px_2px_0px_#000] resize-none placeholder:text-black/30"
                rows={1}
                style={{ minHeight: "44px", maxHeight: "150px" }}
              />
              <button onClick={() => handleSend()}
                className="w-11 h-11 shrink-0 bg-[#ae2925] border-2 border-black rounded-xl flex items-center justify-center shadow-[2px_2px_0px_#000] active:translate-y-0.5">
                <span className="material-symbols-outlined text-white text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
              </button>
            </div>`;

const mobileComposerReplace = `<div className="shrink-0 p-4 border-t-2 border-black bg-[#FAF7F2] z-20 flex flex-col gap-3">
            {/* Learning Modes Mobile */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
              {STUDY_ACTIONS.map(a => (
                <button key={a.id} onClick={() => setActiveMode(a.id)}
                  className={\`shrink-0 px-3 py-1.5 border-2 border-black text-[10px] font-black uppercase tracking-widest transition-all \${activeMode === a.id ? "bg-[#ae2925] text-white shadow-[2px_2px_0px_#000]" : "bg-white text-black hover:bg-[#F0EDE0] shadow-[2px_2px_0px_#000]"}\`}
                >
                  {a.label}
                </button>
              ))}
            </div>

            {activeSource && (
              <div className="flex items-center gap-2 border-2 border-black px-3 py-1.5 bg-white max-w-full shadow-[2px_2px_0px_#000]">
                <span className="material-symbols-outlined text-[14px]">description</span>
                <span className="text-[11px] font-bold truncate flex-1">{activeSource}</span>
                <button onClick={handleClearSource} className="material-symbols-outlined text-[13px] hover:text-[#FF4D2E] shrink-0 transition-colors">close</button>
              </div>
            )}
            
            <div className="relative border-2 border-black bg-white shadow-[3px_3px_0px_#000] flex flex-col pt-3">
              <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, rgba(0,0,0,0.1) 27px, rgba(0,0,0,0.1) 28px)', backgroundPositionY: '4px' }} />
              
              <textarea
                ref={mobileTextareaRef}
                value={inputVal}
                onChange={(e) => handleTextareaChange(e, mobileTextareaRef)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
                placeholder="Write your question..."
                className="relative z-10 w-full bg-transparent px-4 outline-none font-bold text-[13px] leading-[28px] resize-none overflow-hidden placeholder:text-black/30 placeholder:font-black"
                rows={2}
                style={{ minHeight: "56px", maxHeight: "150px" }}
              />
              
              <div className="relative z-10 flex items-center justify-between p-2 border-t-2 border-black bg-[#F0EDE0] mt-1">
                <div className="flex items-center gap-2">
                  <button onClick={() => navigate("/sources")} className="w-9 h-9 border-2 border-black bg-white flex items-center justify-center hover:bg-black hover:text-white transition-colors shadow-[2px_2px_0px_#000]">
                    <span className="material-symbols-outlined text-[16px]">attach_file</span>
                  </button>
                </div>
                
                <button onClick={() => handleSend()}
                  disabled={!inputVal.trim() || isLoading}
                  className="px-4 py-1.5 bg-black text-white border-2 border-black font-black uppercase tracking-widest text-[11px] disabled:opacity-50 hover:bg-[#ae2925] transition-colors shadow-[2px_2px_0px_#000] active:translate-y-1 active:shadow-none">
                  SEND
                </button>
              </div>
            </div>`;

content = content.replace(mobileComposerTarget, mobileComposerReplace);

fs.writeFileSync('src/pages/AITutor.tsx', content, 'utf8');
