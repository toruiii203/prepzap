fetch('https://studenius.com/assets/index-D4jFKYN1.js').then(async r => {
  const jsCode = await r.text();
  const match = jsCode.match(/model:.*?resolvedModel.includes.*?\"openai\/gpt-oss-20b\"/);
  console.log('Is the fix ACTUALLY in the live JS?', !!match);
  
  const match2 = jsCode.match(/\"llama-3.3-70b-versatile\"/g);
  console.log('Does it mention llama-3.3?', !!match2, match2?.length);
}).catch(console.error);
