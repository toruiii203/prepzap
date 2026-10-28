import type { RoadmapSource } from "./learningRoadmap";
const MAX_CHARS = 32000;
export function sourceFromText(
  name: string,
  text: string,
  coverage = "Extracted text",
): RoadmapSource {
  const clean = text.trim();
  if (clean.length < 100)
    throw new Error(
      "There is not enough readable text to build a useful roadmap. Choose a text-based PDF, TXT or Markdown file with at least a paragraph of material.",
    );
  if (/^data:/i.test(clean) || clean.startsWith("%PDF-"))
    throw new Error(
      "This file has no readable extracted text. Upload a text-based PDF or plain text file.",
    );
  return {
    name,
    text: clean.slice(0, MAX_CHARS),
    coverage: `${coverage}${clean.length > MAX_CHARS ? ` · first ${MAX_CHARS.toLocaleString()} characters only` : ""}`,
  };
}
export async function readRoadmapFile(file: File): Promise<RoadmapSource> {
  if (file.size > 5 * 1024 * 1024)
    throw new Error("Choose one file up to 5 MB.");
  if (/\.pdf$/i.test(file.name) || file.type === "application/pdf") {
    const pdfjs = await import("pdfjs-dist");
    const worker = await import("pdfjs-dist/build/pdf.worker.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const task = pdfjs.getDocument({ data: await file.arrayBuffer() });
    const document = await task.promise;
    try {
      let text = "";
      let read = 0;
      let readable = 0;
      for (let page = 1; page <= Math.min(document.numPages, 40); page++) {
        const content = await (await document.getPage(page)).getTextContent();
        const words = content.items
          .flatMap((item) => ("str" in item ? [item.str] : []))
          .join(" ");
        readable += words.trim().length;
        text += `\n[Page ${page}]\n${words}`;
        read = page;
        if (text.length >= MAX_CHARS) break;
      }
      if (readable < 100)
        throw new Error(
          "This PDF has too little readable text. It may be scanned or image-only. Please use a text-based document.",
        );
      return sourceFromText(
        file.name,
        text,
        `Read ${read} of ${document.numPages} pages${read < document.numPages ? " · remaining pages not included" : ""}`,
      );
    } finally {
      await task.destroy();
    }
  }
  if (!/\.(txt|md|markdown)$/i.test(file.name))
    throw new Error(
      "Use a text-based PDF, TXT or Markdown file. Images, scanned PDFs and Word files are not supported in roadmaps yet.",
    );
  return sourceFromText(file.name, await file.text(), "Text document");
}
