fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer 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'
  },
  body: JSON.stringify({
    model: 'openai/gpt-oss-20b',
    max_tokens: 2048,
    messages: [
      { role: 'user', content: 'Generate 10 highly educational study flashcards about \"General Study\".\n  \n  \n  Return strictly a valid raw JSON array containing exactly 10 objects. Each object must have fields:\n  \"front\" (string, the question/concept front),\n  \"back\" (string, the core answer/fact back),\n  \"explanation\" (string, detailed memory cue / educational backup).\n  \n  Only return the raw system valid JSON array. No markdown codeblocks, no explanations, no prefix or suffix!' }
    ]
  })
}).then(async r => {
  const json = await r.json();
  console.log('Result length:', json.choices[0].message.content.length);
  console.log('Content preview:', json.choices[0].message.content.substring(0, 200));
  
  // Try regex
  let sanitized = json.choices[0].message.content.trim();
  const match = sanitized.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (match) {
    sanitized = match[0];
  } else {
    if (sanitized.startsWith('`')) {
      sanitized = sanitized.replace(/^`(json)?/, '').replace(/`$/, '').trim();
    }
  }
  
  try {
    const parsed = JSON.parse(sanitized);
    console.log('Parsed successfully! Array length:', parsed.length);
  } catch (err) {
    console.error('PARSE FAILED:', err.message);
    console.log('Raw sanitized:', sanitized);
  }
}).catch(console.error);
