import{c as C,s as w}from"./groq-EcU6pmSg.js";import{o as N,s as l,b as k,e as I,a as L}from"./types-BdZZ7avY.js";const y={},p="studenius_vault_contrib_consent",h="studenius_vault_excluded_chats",g="studenius_vault_processed_chats",A="studenius_vault_contrib_count",b="studenius_campus_notes_v3",O="v1.0",P=N({enabled:k(),timestamp:l(),version:l()}),R=N({title:l().min(3).max(100),subject:l().min(2).max(50),summary:l().min(10).max(300),key_points:L(l().min(5)).min(3).max(5),example:l().min(10).max(500),memory_hook:l().min(10).max(300),exam_trap:l().min(10).max(300),difficulty:I(["beginner","intermediate","advanced"]).default("intermediate")});function $(){return!(typeof import.meta<"u"&&(y==null?void 0:y.VITE_VAULT_CONTRIBUTIONS_ENABLED)==="false")}function D(e){const t=e?`${p}_${e}`:p;try{const s=localStorage.getItem(t);if(s){const a=JSON.parse(s),r=P.safeParse(a);if(r.success)return r.data}}catch{}return{enabled:!1,timestamp:new Date(0).toISOString(),version:O}}function Q(e,t){const s={enabled:e,timestamp:new Date().toISOString(),version:O},a=t?`${p}_${t}`:p;try{localStorage.setItem(a,JSON.stringify(s))}catch{}return s}function j(e){try{const t=localStorage.getItem(h);return(t?JSON.parse(t):[]).includes(e)}catch{return!1}}function ee(e,t){try{const s=localStorage.getItem(h),a=s?JSON.parse(s):[],r=new Set(a);t||r.delete(e),localStorage.setItem(h,JSON.stringify(Array.from(r)))}catch{}}function U(e){try{const t=localStorage.getItem(g);return(t?JSON.parse(t):[]).includes(e)}catch{return!1}}function u(e){try{const t=localStorage.getItem(g),s=t?JSON.parse(t):[];s.includes(e)||(s.push(e),localStorage.setItem(g,JSON.stringify(s)))}catch{}}function V(){try{const e=localStorage.getItem(A);return e&&parseInt(e,10)||0}catch{return 0}}function J(){const e=V()+1;try{localStorage.setItem(A,String(e))}catch{}return e}async function B(e){try{if(typeof crypto<"u"&&crypto.subtle){const s=new TextEncoder().encode(e),a=await crypto.subtle.digest("SHA-256",s);return Array.from(new Uint8Array(a)).map(o=>o.toString(16).padStart(2,"0")).join("")}}catch{}let t=0;for(let s=0;s<e.length;s++)t=(t<<5)-t+e.charCodeAt(s),t|=0;return`h_${Math.abs(t).toString(16)}`}function z(e,t=!1){return t?{eligible:!1,reason:"REJECT_FILE_ATTACHMENT",studyValueScore:0}:{eligible:!1,reason:"REJECT_TOO_SHORT",studyValueScore:0}}function H(e){const t=e.filter(o=>o.sender==="user").map(o=>o.text).join(" ").slice(0,500),s=t.toLowerCase();let a="General";/bio|cell|mitosis|dna|rna|gene|photosynthesis|krebs|organ|tissue/i.test(s)?a="Biology":/chem|reaction|atom|molecule|bond|acid|base|equilibrium/i.test(s)?a="Chemistry":/physics|quantum|force|velocity|gravity|energy|momentum|thermo/i.test(s)?a="Physics":/calculus|derivative|integral|limit|matrix|algebra|geometry|theorem/i.test(s)?a="Calculus":/econ|supply|demand|inflation|gdp|monetary|market|trade/i.test(s)?a="Economics":/psych|cognitive|behavior|brain|memory|freud|conditioning/i.test(s)?a="Psychology":/algorithm|code|data structure|binary|network|database|python|java/i.test(s)?a="Computer Science":/history|war|revolution|treaty|century|empire|civilization/i.test(s)&&(a="History");let r=t.replace(/^(can you|please|explain|what is|how does|tell me about|help me with|summarize|why does)\s+/i,"").replace(/[?!.]+$/,"").trim();return r.length>40&&(r=r.slice(0,37)+"..."),(!r||r.length<3)&&(r=`${a} Core Principles`),{topic:r,subject:a}}async function Y(e,t,s){const a=s.slice(0,2e3),r=`You are an expert academic curriculum author.
Synthesize an anonymous, generic, standalone study note for the topic "${e}" (${t}).
Use the provided AI explanation strictly as a conceptual seed.

CRITICAL PRIVACY & TONE RULES:
- Zero references to any student, user, professor, course, file, or chat history.
- Never use second-person pronouns referring to the user ("you", "your", "as you asked", "in your notes").
- Use objective, authoritative, textbook-grade third-person academic language.

Return ONLY a raw JSON object (no markdown, no backticks):
{
  "title": "<3 to 8 word generic academic title>",
  "subject": "${t}",
  "summary": "<1-2 clear sentences summarizing the topic>",
  "key_points": [
    "<3 to 5 core conceptual bullet points>"
  ],
  "example": "<1 clear concrete real-world or theoretical example>",
  "memory_hook": "<1 memorable everyday analogy>",
  "exam_trap": "<1 common exam misconception or pitfall to avoid>",
  "difficulty": "intermediate"
}`;try{const o=await C([{role:"user",content:`Topic: ${e}
Subject: ${t}

Seed explanation:
${a}`}],r,"openai/gpt-oss-20b",1600,"vault_contribution"),i=w(o),n=R.safeParse(i);if(!n.success)return console.warn("[vaultPipeline] Note failed schema validation:",n.error),null;const c=[n.data.summary,...n.data.key_points,n.data.memory_hook].join(" ");return/\b(as you mentioned|in your class|your professor|your uploaded|you asked me)\b/i.test(c)?(console.warn("[vaultPipeline] Note contained disallowed user-referencing phrasing."),null):n.data}catch(o){return console.warn("[vaultPipeline] Rewrite error:",o),null}}function _(e,t){const s=n=>new Set(n.toLowerCase().replace(/[^a-z0-9\s]/g,"").split(/\s+/).filter(c=>c.length>3)),a=s(e),r=s(t);if(a.size===0||r.size===0)return 0;let o=0;for(const n of a)r.has(n)&&o++;const i=new Set([...a,...r]).size;return i===0?0:o/i}function G(e,t){const s=`${t.title} ${t.summary} ${t.key_points.join(" ")} ${t.example}`;if(_(e,s)>.25)return{passed:!1,scrubbedNote:t,reason:"DROP_HIGH_VERBATIM_OVERLAP"};const r=[/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,/https?:\/\/[^\s]+/g,/\b[A-Z]{2,4}\s?[-_]?\d{3,4}[A-Za-z]?\b/g,/\b(?:student|prof|professor|instructor|dr\.)\s+[A-Z][a-z]+\b/gi],o=n=>{let c=n;return r.forEach(d=>{c=c.replace(d,"")}),c.replace(/\s{2,}/g," ").trim()},i={...t,title:o(t.title),summary:o(t.summary),key_points:t.key_points.map(o).filter(n=>n.length>=5),example:o(t.example),memory_hook:o(t.memory_hook),exam_trap:o(t.exam_trap)};return i.key_points.length<3?{passed:!1,scrubbedNote:i,reason:"DROP_SCRUBBED_TOO_SHORT"}:{passed:!0,scrubbedNote:i}}async function q(e){const t=`You are a strict academic fact-checker.
Verify if the following study note is scientifically/factually accurate, coherent, and free of misleading hallucination.
Return ONLY JSON:
{ "passed": true|false, "confidence": 0.0 to 1.0, "reason": "<short explanation>" }`;try{const s=await C([{role:"user",content:`Title: ${e.title}
Subject: ${e.subject}
Summary: ${e.summary}
Points: ${e.key_points.join(" | ")}`}],t,"openai/gpt-oss-20b",300,"quality_gate"),a=w(s);return{passed:(a==null?void 0:a.passed)===!0&&((a==null?void 0:a.confidence)??0)>=.7,confidence:(a==null?void 0:a.confidence)??0}}catch{const s=e.key_points.length>=3&&e.summary.length>=20;return{passed:s,confidence:s?.75:0}}}function K(e,t){if(!t||t.length===0)return{isDuplicate:!1};const s=r=>r.toLowerCase().replace(/[^a-z0-9]/g,""),a=s(e.title);for(const r of t){const o=s(r.title);if(a===o)return{isDuplicate:!0,matchedNoteId:r.id};if(_(e.title,r.title)>.65)return{isDuplicate:!0,matchedNoteId:r.id};if(r.subject.toLowerCase()===e.subject.toLowerCase()&&_(e.summary,r.summary)>.6)return{isDuplicate:!0,matchedNoteId:r.id}}return{isDuplicate:!1}}async function M(e,t){const s=await B(t),a=`# ${e.title}

## Summary
${e.summary}

## Key Principles
${e.key_points.map((o,i)=>`${i+1}. ${o}`).join(`
`)}

## Worked Example
${e.example}

## Memory Hook
> **Everyday Analogy**: ${e.memory_hook}

## Exam Watchout
> **Common Trap**: ${e.exam_trap}
`,r={id:`vault-ai-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,title:e.title,subject:e.subject,subjectBadgeColor:"bg-white text-black border-2 border-black font-black",author:"Community AI",authorCode:"AI-VAULT",authorAvatar:"/buddies/fox_scholar.png",date:"Just now",readTime:"2 min read",likes:1,likedByUser:!1,downloads:0,isOfficialSeed:!1,isReported:!1,tags:[e.subject,e.difficulty,"AI-Synthesized"],summary:e.summary,content:a,isAiGenerated:!0,helpfulCount:0,verifiedCount:0,reportCount:0,difficulty:e.difficulty,sourceHash:s,status:"published"};try{const o=localStorage.getItem(b),i=o?JSON.parse(o):[],n=[r,...i];localStorage.setItem(b,JSON.stringify(n))}catch{}return J(),r}async function te(e,t,s=!1,a){var E;if(!$())return{success:!1,reason:"PIPELINE_GLOBALLY_DISABLED"};if(!D(a).enabled)return{success:!1,reason:"USER_NOT_OPTED_IN"};if(j(e))return{success:!1,reason:"CHAT_EXCLUDED"};if(U(e))return{success:!1,reason:"CHAT_ALREADY_PROCESSED"};const o=z(t,s);if(!o.eligible)return u(e),{success:!1,reason:o.reason};const{topic:i,subject:n}=H(t),c=t.filter(m=>m.sender==="bot"),d=((E=c[c.length-1])==null?void 0:E.text)||"";if(!d||d.length<50)return u(e),{success:!1,reason:"BOT_REPLY_INSUFFICIENT"};const x=t.map(m=>m.text).join(" "),S=await Y(i,n,d);if(!S)return u(e),{success:!1,reason:"REWRITE_FAILED"};const f=G(x,S);if(!f.passed)return u(e),{success:!1,reason:f.reason};if(!(await q(f.scrubbedNote)).passed)return u(e),{success:!1,reason:"QUALITY_GATE_FAILED"};let T=[];try{const m=localStorage.getItem(b);m&&(T=JSON.parse(m))}catch{}if(K(f.scrubbedNote,T).isDuplicate)return u(e),{success:!1,reason:"DUPLICATE_NOTE_SKIPPED"};const v=await M(f.scrubbedNote,e);return u(e),{success:!0,noteId:v.id}}export{O as C,ee as a,V as b,D as g,j as i,te as r,Q as s};
