import React from "react";

export function AppSkeleton() {
  return (
    <div role="status" aria-label="Loading your study space" className="w-full min-h-[100dvh] bg-[#FAF7F2] flex flex-col md:flex-row">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 flex-col p-4 border-r-[1.5px] border-black bg-[#FAF7F2] w-64 overflow-hidden">
        <div className="mb-8 px-1">
          <div className="h-6 w-32 bg-black/10 rounded studenius-skeleton" />
        </div>
        <div className="flex-1 flex flex-col gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="h-3 w-16 bg-black/10 rounded mb-2 studenius-skeleton" />
              {[...Array(i === 0 ? 5 : i === 1 ? 4 : 2)].map((_, j) => (
                <div key={j} className="flex items-center gap-3 px-3 py-2">
                  <div className="w-5 h-5 rounded bg-black/10 studenius-skeleton shrink-0" />
                  <div className="h-4 bg-black/10 rounded studenius-skeleton w-full" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:ml-64 relative min-h-[100dvh] pb-20 md:pb-0">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-[#FAF7F2] border-b-[1.5px] border-black px-4 md:px-8 h-16 md:h-24 flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <div className="h-5 md:h-8 w-40 md:w-64 bg-black/10 rounded studenius-skeleton" />
            <div className="hidden md:block h-3 w-32 bg-black/10 rounded studenius-skeleton" />
          </div>
          <div className="w-9 h-9 md:w-11 md:h-11 rounded-full border-2 border-black bg-black/10 studenius-skeleton shrink-0" />
        </header>

        {/* Content Body */}
        <div className="flex-1 p-4 md:p-8 flex flex-col gap-6 md:gap-8">
          {/* Top stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 md:h-32 border-2 border-black bg-white shadow-[3px_3px_0px_#000] p-4 flex flex-col justify-between">
                <div className="w-8 h-8 rounded-full bg-black/10 studenius-skeleton" />
                <div className="space-y-2 mt-auto">
                  <div className="h-5 w-16 bg-black/10 rounded studenius-skeleton" />
                  <div className="h-3 w-24 bg-black/10 rounded studenius-skeleton" />
                </div>
              </div>
            ))}
          </div>

          {/* Tools Grid */}
          <div className="space-y-4">
            <div className="h-5 w-32 bg-black/10 rounded studenius-skeleton" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-32 md:h-40 border-2 border-black bg-white shadow-[3px_3px_0px_#000] p-4 flex flex-col justify-center items-center gap-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded bg-black/10 studenius-skeleton" />
                  <div className="h-4 w-20 bg-black/10 rounded studenius-skeleton" />
                  <div className="h-3 w-24 bg-black/10 rounded studenius-skeleton hidden md:block" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#FAF7F2] border-t-[1.5px] border-black flex items-center justify-around z-40 px-2 safe-pb">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1 p-2">
            <div className="w-6 h-6 rounded bg-black/10 studenius-skeleton" />
            <div className="w-10 h-2 bg-black/10 rounded studenius-skeleton" />
          </div>
        ))}
      </div>
    </div>
  );
}
