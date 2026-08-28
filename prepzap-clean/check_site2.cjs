fetch('https://studenius.com').then(async r => {
  const html = await r.text();
  const scriptMatch = html.match(/<script type="module" crossorigin src="(\/assets\/index-[^"]+\.js)"><\/script>/);
  if (scriptMatch) {
    const jsUrl = 'https://studenius.com' + scriptMatch[1];
    console.log('Fetching JS:', jsUrl);
  }
}).catch(console.error);
