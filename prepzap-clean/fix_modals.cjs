const fs = require('fs');
const glob = require('glob');

const pages = glob.sync('src/pages/*.tsx');
pages.push(...glob.sync('src/pages/arcade/*.tsx'));

pages.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('useTutorialModal') && !content.includes('<TutorialModal isOpen={tutorial.isOpen}')) {
    console.log("Fixing: " + file);
    
    // Determine the page key
    let match = content.match(/useTutorialModal\("([^"]+)"\)/);
    if (!match) return;
    const pageKey = match[1];

    const modalCode = `\n      <TutorialModal isOpen={tutorial.isOpen} onDismiss={tutorial.dismiss} features={TUTORIAL_CONTENT["${pageKey}"] || []} title="Tutorial" />`;

    // Find the main component's return
    // Simple heuristic: find 'export default function', then the next 'return ('
    const exportIdx = content.indexOf('export default function');
    if (exportIdx > -1) {
      const returnIdx = content.indexOf('return (', exportIdx);
      if (returnIdx > -1) {
        const afterReturn = returnIdx + 8; // skip 'return ('
        const tagIdx = content.indexOf('<', afterReturn);
        if (tagIdx > -1) {
          if (content.substring(tagIdx, tagIdx+2) === '<>') {
            content = content.substring(0, tagIdx+2) + modalCode + content.substring(tagIdx+2);
          } else {
            // Not a fragment, wrap the whole thing? Or just inject after the div.
            const divCloseIdx = content.indexOf('>', tagIdx);
            content = content.substring(0, divCloseIdx+1) + modalCode + content.substring(divCloseIdx+1);
          }
        }
      }
    }
    fs.writeFileSync(file, content, 'utf8');
  }
});
