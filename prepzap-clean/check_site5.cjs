fetch('https://studenius.com', { headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } }).then(async r => {
  const html = await r.text();
  const scriptMatch = html.match(/<script type="module" crossorigin src="(\/assets\/index-[^"]+\.js)"><\/script>/);
  if (scriptMatch) {
    const jsUrl = 'https://studenius.com' + scriptMatch[1];
    console.log('Fetching JS:', jsUrl);
    const jsRes = await fetch(jsUrl, { headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } });
    const jsCode = await jsRes.text();
    const fallbackMatch = jsCode.match(/model:.*?resolvedModel\.includes.*?\"openai\/gpt-oss-20b\"/);
    console.log('Is the fallback ACTUALLY in the live JS?', !!fallbackMatch);
    const alertMatch = jsCode.match(/Failed to generate flashcards. Error:/);
    console.log('Is the new alert ACTUALLY in the live JS?', !!alertMatch);
  }
}).catch(console.error);
