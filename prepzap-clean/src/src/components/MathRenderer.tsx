import katex from "katex";
import "katex/dist/katex.min.css";
import { useMemo } from "react";

interface Props { content: string; className?: string; }

function renderLatex(text: string): string {
  // Display math: \[ ... \]
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => {
    try {
      return `<div class="math-block">${katex.renderToString(m.trim(), { displayMode: true, throwOnError: false })}</div>`;
    } catch { return `<div class="math-block">${m}</div>`; }
  });
  // Inline math: \( ... \)
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => {
    try { return katex.renderToString(m.trim(), { displayMode: false, throwOnError: false }); }
    catch { return m; }
  });
  // Inline math: $...$ (single dollar, not double)
  text = text.replace(/\$(?!\$)([^$\n]+?)\$/g, (_, m) => {
    try { return katex.renderToString(m.trim(), { displayMode: false, throwOnError: false }); }
    catch { return m; }
  });
  return text;
}

function processContent(text: string): string {
  let out = renderLatex(text);
  out = out
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-bold mt-4 mb-2">$1</h2>')
    .replace(/^(\d+)\. (.+)$/gm,
      '<div class="flex gap-2 my-1"><span class="font-mono text-primary font-bold min-w-[1.2rem]">$1.</span><span>$2</span></div>')
    .replace(/^→ (.+)$/gm,
      '<div class="pl-3 border-l-2 border-primary/40 my-2 text-primary font-medium">→ $1</div>')
    .replace(/\n/g, "<br />");
  return out;
}

export function MathRenderer({ content, className = "" }: Props) {
  const html = useMemo(() => processContent(content), [content]);
  return (
    <div
      className={`math-output leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
