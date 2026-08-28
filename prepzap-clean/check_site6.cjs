fetch('https://studenius.com/assets/index-sc4ZRZhz.js', { headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } }).then(async r => {
  const jsCode = await r.text();
  console.log('Includes gpt-oss-20b?', jsCode.includes('gpt-oss-20b'));
  
  const idx = jsCode.indexOf("https://api.groq.com/openai/v1/chat/completions");
  if (idx > -1) {
      console.log(jsCode.substring(idx, idx + 400));
  }
}).catch(console.error);
