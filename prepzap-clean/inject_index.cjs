const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

const headInjection = `
    <!-- Static Skeleton Logic -->
    <script>
      try {
        var p = window.location.pathname;
        var a = ['/dashboard', '/notes', '/ai-tutor', '/flashcards', '/practice', '/timer', '/planner', '/math', '/teach-it', '/quick-study', '/sources', '/mistakes', '/analytics', '/challenges'];
        var isApp = a.some(function(r) { return p.startsWith(r); });
        var hasS = localStorage.getItem('pz-auth-storage');
        if (isApp && hasS) {
          document.documentElement.classList.add('show-app-skeleton');
        }
      } catch(e) {}
    </script>
    <style>
      html, body { background: #FAF7F2; margin: 0; padding: 0; }
      .static-skel { display: none; width: 100%; min-height: 100vh; background: #FAF7F2; flex-direction: column; font-family: sans-serif; }
      .show-app-skeleton .static-skel { display: flex; }
      
      @keyframes skel-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      .skel-pulse { animation: skel-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      .skel-box { background: rgba(0,0,0,0.1); border-radius: 4px; }
      .skel-circle { background: rgba(0,0,0,0.1); border-radius: 50%; }

      .skel-sidebar { display: none; width: 256px; border-right: 1.5px solid #000; padding: 16px; flex-direction: column; position: fixed; left: 0; top: 0; bottom: 0; background: #FAF7F2; box-sizing: border-box; }
      .skel-main { flex: 1; display: flex; flex-direction: column; position: relative; min-height: 100vh; box-sizing: border-box; padding-bottom: 64px; }
      
      .skel-header { position: sticky; top: 0; z-index: 30; background: #FAF7F2; border-bottom: 1.5px solid #000; padding: 0 16px; height: 64px; display: flex; align-items: center; justify-content: space-between; box-sizing: border-box; }
      .skel-content { padding: 16px; display: flex; flex-direction: column; gap: 24px; box-sizing: border-box; }
      
      .skel-card { border: 2px solid #000; background: #fff; box-shadow: 3px 3px 0px #000; padding: 16px; display: flex; flex-direction: column; box-sizing: border-box; }
      .skel-grid-4 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
      .skel-grid-8 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }

      .skel-bottom { position: fixed; bottom: 0; left: 0; right: 0; height: 64px; background: #FAF7F2; border-top: 1.5px solid #000; display: flex; align-items: center; justify-content: space-around; z-index: 40; }
      .hide-mobile { display: none; }

      @media (min-width: 768px) {
        .hide-mobile { display: block; }
        .skel-sidebar { display: flex; }
        .skel-main { margin-left: 256px; padding-bottom: 0; }
        .skel-header { height: 96px; padding: 0 32px; }
        .skel-content { padding: 32px; gap: 32px; }
        .skel-grid-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
        .skel-grid-8 { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; }
        .skel-bottom { display: none; }
      }
      @media (min-width: 1024px) {
        .skel-grid-8 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
      }
    </style>
  </head>`;

const rootInjection = `<div id="root" vaul-drawer-wrapper="">
      <div class="static-skel">
        <!-- Sidebar -->
        <aside class="skel-sidebar">
          <div style="margin-bottom: 32px; padding: 0 4px;">
            <div class="skel-box skel-pulse" style="height: 24px; width: 128px;"></div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 16px; flex: 1;">
            <!-- Group 1: 5 items -->
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <div class="skel-box skel-pulse" style="height: 12px; width: 64px; margin-bottom: 8px;"></div>
              <div style="display: flex; align-items: center; gap: 12px; padding: 8px 12px;"><div class="skel-box skel-pulse" style="width: 20px; height: 20px; flex-shrink: 0;"></div><div class="skel-box skel-pulse" style="height: 16px; width: 100%;"></div></div>
              <div style="display: flex; align-items: center; gap: 12px; padding: 8px 12px;"><div class="skel-box skel-pulse" style="width: 20px; height: 20px; flex-shrink: 0;"></div><div class="skel-box skel-pulse" style="height: 16px; width: 100%;"></div></div>
              <div style="display: flex; align-items: center; gap: 12px; padding: 8px 12px;"><div class="skel-box skel-pulse" style="width: 20px; height: 20px; flex-shrink: 0;"></div><div class="skel-box skel-pulse" style="height: 16px; width: 100%;"></div></div>
              <div style="display: flex; align-items: center; gap: 12px; padding: 8px 12px;"><div class="skel-box skel-pulse" style="width: 20px; height: 20px; flex-shrink: 0;"></div><div class="skel-box skel-pulse" style="height: 16px; width: 100%;"></div></div>
              <div style="display: flex; align-items: center; gap: 12px; padding: 8px 12px;"><div class="skel-box skel-pulse" style="width: 20px; height: 20px; flex-shrink: 0;"></div><div class="skel-box skel-pulse" style="height: 16px; width: 100%;"></div></div>
            </div>
            <!-- Group 2: 4 items -->
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <div class="skel-box skel-pulse" style="height: 12px; width: 64px; margin-bottom: 8px;"></div>
              <div style="display: flex; align-items: center; gap: 12px; padding: 8px 12px;"><div class="skel-box skel-pulse" style="width: 20px; height: 20px; flex-shrink: 0;"></div><div class="skel-box skel-pulse" style="height: 16px; width: 100%;"></div></div>
              <div style="display: flex; align-items: center; gap: 12px; padding: 8px 12px;"><div class="skel-box skel-pulse" style="width: 20px; height: 20px; flex-shrink: 0;"></div><div class="skel-box skel-pulse" style="height: 16px; width: 100%;"></div></div>
              <div style="display: flex; align-items: center; gap: 12px; padding: 8px 12px;"><div class="skel-box skel-pulse" style="width: 20px; height: 20px; flex-shrink: 0;"></div><div class="skel-box skel-pulse" style="height: 16px; width: 100%;"></div></div>
              <div style="display: flex; align-items: center; gap: 12px; padding: 8px 12px;"><div class="skel-box skel-pulse" style="width: 20px; height: 20px; flex-shrink: 0;"></div><div class="skel-box skel-pulse" style="height: 16px; width: 100%;"></div></div>
            </div>
            <!-- Group 3: 2 items -->
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <div class="skel-box skel-pulse" style="height: 12px; width: 64px; margin-bottom: 8px;"></div>
              <div style="display: flex; align-items: center; gap: 12px; padding: 8px 12px;"><div class="skel-box skel-pulse" style="width: 20px; height: 20px; flex-shrink: 0;"></div><div class="skel-box skel-pulse" style="height: 16px; width: 100%;"></div></div>
              <div style="display: flex; align-items: center; gap: 12px; padding: 8px 12px;"><div class="skel-box skel-pulse" style="width: 20px; height: 20px; flex-shrink: 0;"></div><div class="skel-box skel-pulse" style="height: 16px; width: 100%;"></div></div>
            </div>
          </div>
        </aside>
      
        <!-- Main -->
        <div class="skel-main">
          <header class="skel-header">
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <div class="skel-box skel-pulse" style="height: 32px; width: 256px; max-width: 50vw;"></div>
              <div class="skel-box skel-pulse hide-mobile" style="height: 12px; width: 128px;"></div>
            </div>
            <div class="skel-circle skel-pulse" style="width: 44px; height: 44px; border: 2px solid #000; flex-shrink: 0;"></div>
          </header>
      
          <div class="skel-content">
            <div class="skel-grid-4">
              <div class="skel-card" style="height: 128px; justify-content: space-between;">
                <div class="skel-circle skel-pulse" style="width: 32px; height: 32px;"></div>
                <div style="margin-top: auto;">
                  <div class="skel-box skel-pulse" style="height: 20px; width: 64px; margin-bottom: 8px;"></div>
                  <div class="skel-box skel-pulse" style="height: 12px; width: 96px;"></div>
                </div>
              </div>
              <div class="skel-card" style="height: 128px; justify-content: space-between;">
                <div class="skel-circle skel-pulse" style="width: 32px; height: 32px;"></div>
                <div style="margin-top: auto;">
                  <div class="skel-box skel-pulse" style="height: 20px; width: 64px; margin-bottom: 8px;"></div>
                  <div class="skel-box skel-pulse" style="height: 12px; width: 96px;"></div>
                </div>
              </div>
              <div class="skel-card" style="height: 128px; justify-content: space-between;">
                <div class="skel-circle skel-pulse" style="width: 32px; height: 32px;"></div>
                <div style="margin-top: auto;">
                  <div class="skel-box skel-pulse" style="height: 20px; width: 64px; margin-bottom: 8px;"></div>
                  <div class="skel-box skel-pulse" style="height: 12px; width: 96px;"></div>
                </div>
              </div>
              <div class="skel-card" style="height: 128px; justify-content: space-between;">
                <div class="skel-circle skel-pulse" style="width: 32px; height: 32px;"></div>
                <div style="margin-top: auto;">
                  <div class="skel-box skel-pulse" style="height: 20px; width: 64px; margin-bottom: 8px;"></div>
                  <div class="skel-box skel-pulse" style="height: 12px; width: 96px;"></div>
                </div>
              </div>
            </div>
      
            <div>
              <div class="skel-box skel-pulse" style="height: 20px; width: 160px; margin-bottom: 16px;"></div>
              <div class="skel-grid-8">
                <div class="skel-card" style="height: 160px; justify-content: center; align-items: center; gap: 12px;">
                  <div class="skel-box skel-pulse" style="width: 48px; height: 48px;"></div>
                  <div class="skel-box skel-pulse" style="height: 16px; width: 80px;"></div>
                  <div class="skel-box skel-pulse hide-mobile" style="height: 12px; width: 96px;"></div>
                </div>
                <div class="skel-card" style="height: 160px; justify-content: center; align-items: center; gap: 12px;">
                  <div class="skel-box skel-pulse" style="width: 48px; height: 48px;"></div>
                  <div class="skel-box skel-pulse" style="height: 16px; width: 80px;"></div>
                  <div class="skel-box skel-pulse hide-mobile" style="height: 12px; width: 96px;"></div>
                </div>
                <div class="skel-card" style="height: 160px; justify-content: center; align-items: center; gap: 12px;">
                  <div class="skel-box skel-pulse" style="width: 48px; height: 48px;"></div>
                  <div class="skel-box skel-pulse" style="height: 16px; width: 80px;"></div>
                  <div class="skel-box skel-pulse hide-mobile" style="height: 12px; width: 96px;"></div>
                </div>
                <div class="skel-card" style="height: 160px; justify-content: center; align-items: center; gap: 12px;">
                  <div class="skel-box skel-pulse" style="width: 48px; height: 48px;"></div>
                  <div class="skel-box skel-pulse" style="height: 16px; width: 80px;"></div>
                  <div class="skel-box skel-pulse hide-mobile" style="height: 12px; width: 96px;"></div>
                </div>
                <div class="skel-card" style="height: 160px; justify-content: center; align-items: center; gap: 12px;">
                  <div class="skel-box skel-pulse" style="width: 48px; height: 48px;"></div>
                  <div class="skel-box skel-pulse" style="height: 16px; width: 80px;"></div>
                  <div class="skel-box skel-pulse hide-mobile" style="height: 12px; width: 96px;"></div>
                </div>
                <div class="skel-card" style="height: 160px; justify-content: center; align-items: center; gap: 12px;">
                  <div class="skel-box skel-pulse" style="width: 48px; height: 48px;"></div>
                  <div class="skel-box skel-pulse" style="height: 16px; width: 80px;"></div>
                  <div class="skel-box skel-pulse hide-mobile" style="height: 12px; width: 96px;"></div>
                </div>
                <div class="skel-card" style="height: 160px; justify-content: center; align-items: center; gap: 12px;">
                  <div class="skel-box skel-pulse" style="width: 48px; height: 48px;"></div>
                  <div class="skel-box skel-pulse" style="height: 16px; width: 80px;"></div>
                  <div class="skel-box skel-pulse hide-mobile" style="height: 12px; width: 96px;"></div>
                </div>
                <div class="skel-card" style="height: 160px; justify-content: center; align-items: center; gap: 12px;">
                  <div class="skel-box skel-pulse" style="width: 48px; height: 48px;"></div>
                  <div class="skel-box skel-pulse" style="height: 16px; width: 80px;"></div>
                  <div class="skel-box skel-pulse hide-mobile" style="height: 12px; width: 96px;"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      
        <div class="skel-bottom">
          <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px;">
            <div class="skel-box skel-pulse" style="width: 24px; height: 24px;"></div>
            <div class="skel-box skel-pulse" style="width: 40px; height: 8px;"></div>
          </div>
          <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px;">
            <div class="skel-box skel-pulse" style="width: 24px; height: 24px;"></div>
            <div class="skel-box skel-pulse" style="width: 40px; height: 8px;"></div>
          </div>
          <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px;">
            <div class="skel-box skel-pulse" style="width: 24px; height: 24px;"></div>
            <div class="skel-box skel-pulse" style="width: 40px; height: 8px;"></div>
          </div>
          <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px;">
            <div class="skel-box skel-pulse" style="width: 24px; height: 24px;"></div>
            <div class="skel-box skel-pulse" style="width: 40px; height: 8px;"></div>
          </div>
          <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px;">
            <div class="skel-box skel-pulse" style="width: 24px; height: 24px;"></div>
            <div class="skel-box skel-pulse" style="width: 40px; height: 8px;"></div>
          </div>
        </div>
      </div>
    </div>`;

// Apply head injection right before </head>
content = content.replace('</head>', headInjection);
// Replace <div id="root" ...></div> with <div id="root" ...> rootInjection </div>
content = content.replace(/<div id="root"([^>]*)>.*<\/div>/, `<div id="root"$1>\n${rootInjection}\n</div>`);

fs.writeFileSync('index.html', content, 'utf8');
