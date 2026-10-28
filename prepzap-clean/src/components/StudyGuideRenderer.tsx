import React, { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface StudyGuideRendererProps {
  content: string;
  className?: string;
}

/**
 * Parses LaTeX expressions into KaTeX HTML strings safely.
 */
function renderLatex(text: string): string {
  if (!text || typeof text !== "string") return "";
  // Block / Display Math: $$ ... $$
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
    try {
      return `<div class="my-3 py-2.5 px-3 bg-[#FFFDF5] border-2 border-black rounded-xl overflow-x-auto text-center shadow-[2px_2px_0px_#1A1A1A]">${katex.renderToString(math.trim(), { displayMode: true, throwOnError: false })}</div>`;
    } catch {
      return `<div class="my-3 py-2 px-3 bg-red-50 border border-red-300 rounded text-xs font-mono">${math}</div>`;
    }
  });

  // Display math: \[ ... \]
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => {
    try {
      return `<div class="my-3 py-2.5 px-3 bg-[#FFFDF5] border-2 border-black rounded-xl overflow-x-auto text-center shadow-[2px_2px_0px_#1A1A1A]">${katex.renderToString(math.trim(), { displayMode: true, throwOnError: false })}</div>`;
    } catch {
      return `<div class="my-3 py-2 px-3 bg-red-50 border border-red-300 rounded text-xs font-mono">${math}</div>`;
    }
  });

  // Inline math: \( ... \)
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => {
    try {
      return `<span class="inline-block px-1 py-0.5 font-bold">${katex.renderToString(math.trim(), { displayMode: false, throwOnError: false })}</span>`;
    } catch {
      return math;
    }
  });

  // Inline math: $ ... $ (single dollar)
  text = text.replace(/\$(?!\$)([^$\n]+?)\$/g, (_, math) => {
    try {
      return `<span class="inline-block px-1 py-0.5 font-bold">${katex.renderToString(math.trim(), { displayMode: false, throwOnError: false })}</span>`;
    } catch {
      return math;
    }
  });

  return text;
}

/**
 * Transforms raw markdown into formatted Neobrutalist study guide blocks.
 */
function processStudyGuideMarkdown(raw: string): string {
  // First compile KaTeX equations
  let out = renderLatex(raw);

  // Clean lines split
  const lines = out.split("\n");
  const processedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // H1 (# Heading)
    if (line.startsWith("# ")) {
      const headingText = line.slice(2).trim();
      processedLines.push(
        `<h1 class="text-[22px] md:text-[24px] font-black text-black pb-2.5 mb-4 mt-6 border-b-2 border-black flex items-center gap-2">
          <span class="w-3 h-3 rounded-sm bg-[#10B981] border border-black inline-block shrink-0"></span>
          <span>${headingText}</span>
        </h1>`
      );
      continue;
    }

    // H2 (## Heading)
    if (line.startsWith("## ")) {
      const headingText = line.slice(3).trim();
      processedLines.push(
        `<h2 class="text-[17px] md:text-[18px] font-black text-black mt-6 mb-2.5 pb-1 border-b border-black/15 flex items-center gap-2">
          <span class="material-symbols-outlined text-[18px] text-[#10B981]">bookmark</span>
          <span>${headingText}</span>
        </h2>`
      );
      continue;
    }

    // H3 (### Heading)
    if (line.startsWith("### ")) {
      const headingText = line.slice(4).trim();
      processedLines.push(
        `<h3 class="text-[15px] font-extrabold text-black/90 mt-4 mb-1.5 flex items-center gap-1.5">
          <span class="text-[#FFD13B] font-black">▸</span>
          <span>${headingText}</span>
        </h3>`
      );
      continue;
    }

    // Blockquote (> text)
    if (line.startsWith("> ")) {
      const quoteText = line.slice(2).trim();
      processedLines.push(
        `<blockquote class="my-3 pl-3.5 pr-3 py-2 bg-[#FFFBEA] border-l-4 border-[#FFD13B] text-[13.5px] font-bold text-black/80 rounded-r-xl">
          ${quoteText}
        </blockquote>`
      );
      continue;
    }

    // Horizontal Rule (---)
    if (line.trim() === "---" || line.trim() === "***") {
      processedLines.push(`<hr class="my-5 border-t-2 border-black/15" />`);
      continue;
    }

    // Bullet List Item (- text or * text)
    if (line.match(/^[-*]\s+/)) {
      const itemText = line.replace(/^[-*]\s+/, "").trim();
      processedLines.push(
        `<div class="flex items-start gap-2.5 my-1.5 pl-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-black mt-2 shrink-0"></span>
          <div class="flex-1 text-[13.5px] md:text-[14px] leading-relaxed text-black">${itemText}</div>
        </div>`
      );
      continue;
    }

    // Numbered List Item (1. text)
    const numMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (numMatch) {
      processedLines.push(
        `<div class="flex items-start gap-2.5 my-1.5 pl-1.5">
          <span class="px-1.5 py-0.2 rounded bg-black text-white text-[11px] font-black shrink-0 mt-0.5">${numMatch[1]}</span>
          <div class="flex-1 text-[13.5px] md:text-[14px] leading-relaxed text-black">${numMatch[2]}</div>
        </div>`
      );
      continue;
    }

    // Empty lines
    if (!line.trim()) {
      processedLines.push(`<div class="h-2"></div>`);
      continue;
    }

    // Regular paragraph
    processedLines.push(
      `<p class="text-[13.5px] md:text-[14px] leading-relaxed text-black/90 font-medium my-1">${line}</p>`
    );
  }

  let html = processedLines.join("\n");

  // Bold (**text**)
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-black text-black">$1</strong>');
  // Italic (*text*)
  html = html.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>');
  // Inline code (`code`)
  html = html.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-[#FAF7F2] border border-black/20 rounded font-mono text-[12px] font-bold text-[#10B981]">$1</code>');

  return html;
}

export function StudyGuideRenderer({ content, className = "" }: StudyGuideRendererProps) {
  const renderedHtml = useMemo(() => processStudyGuideMarkdown(content), [content]);

  return (
    <div
      className={`study-guide-content font-body-md ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
}

export default StudyGuideRenderer;
