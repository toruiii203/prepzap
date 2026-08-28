fetch('https://studenius.com', { headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } }).then(async r => {
  const html = await r.text();
  const scriptMatch = html.match(/<script type="module" crossorigin src="(\/assets\/index-[^"]+\.js)"><\/script>/);
  if (scriptMatch) {
    const jsUrl = 'https://studenius.com' + scriptMatch[1];
    console.log('Fetching JS:', jsUrl);
    const jsRes = await fetch(jsUrl, { headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } });
    const jsCode = await jsRes.text();
    const match = jsCode.match(/model:.*?resolvedModel\.includes.*?\"openai\/gpt-oss-20b\"/);
    console.log('Is the fix ACTUALLY in the live JS?', !!match);
    if (!match) {
        console.log("Snippet near fetch body:");
        const idx = jsCode.indexOf("https://api.groq.com/openai/v1/chat/completions");
        if (idx > -1) {
            console.log(jsCode.substring(idx, idx + 400));
        }
    }
  }
}).catch(console.error);
