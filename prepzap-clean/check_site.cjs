fetch('https://studenius.com').then(async r => {
  const html = await r.text();
  const scriptMatch = html.match(/<script type="module" crossorigin src="(\/assets\/index-[^"]+\.js)"><\/script>/);
  if (scriptMatch) {
    const jsUrl = 'https://studenius.com' + scriptMatch[1];
    console.log('Fetching JS:', jsUrl);
    const jsRes = await fetch(jsUrl);
    const jsCode = await jsRes.text();
    console.log('GROQ_API_URL included?', jsCode.includes('api.groq.com'));
    console.log('API KEY included?', jsCode.includes('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'));
    console.log('Model fallback included?', jsCode.includes('openai/gpt-oss-20b'));
  } else {
    console.log('Could not find JS bundle in HTML');
    console.log(html.substring(0, 1000));
  }
}).catch(console.error);
