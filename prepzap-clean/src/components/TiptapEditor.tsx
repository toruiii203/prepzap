import React, { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

interface TiptapEditorProps {
  initialContent: string;
  onUpdate: (html: string) => void;
}

export default function TiptapEditor({ initialContent, onUpdate }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Type '/' for commands, '[[' to link notes...",
      }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      onUpdate(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose-base focus:outline-none min-h-[400px] max-w-full px-4 py-2",
      },
    },
  });

  // Keep editor content in sync if initialContent changes externally (e.g. switching notes)
  useEffect(() => {
    if (editor && initialContent !== editor.getHTML()) {
      editor.commands.setContent(initialContent, false);
    }
  }, [initialContent, editor]);

  if (!editor) return null;

  return (
    <div className="w-full bg-white border-2 border-black rounded-xl overflow-hidden shadow-[4px_4px_0px_#000]">
      <EditorContent editor={editor} className="w-full p-4" />
    </div>
  );
}
