"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import LinkExtension from "@tiptap/extension-link";
import PlaceholderExtension from "@tiptap/extension-placeholder";
import TextAlignExtension from "@tiptap/extension-text-align";
import UnderlineExtension from "@tiptap/extension-underline";
import ColorExtension from "@tiptap/extension-color";
import { TextStyle as TextStyleExtension } from "@tiptap/extension-text-style";
import HighlightExtension from "@tiptap/extension-highlight";
import { Toolbar } from "./toolbar";

interface TiptapEditorProps {
  content: string;
  onChange?: (html: string) => void;
  placeholder?: string;
}

export function TiptapEditor({
  content,
  onChange,
  placeholder = "내용을 입력하세요...",
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      ImageExtension.configure({ allowBase64: true }),
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline" },
      }),
      PlaceholderExtension.configure({ placeholder }),
      TextAlignExtension.configure({ types: ["heading", "paragraph"] }),
      UnderlineExtension,
      ColorExtension,
      TextStyleExtension,
      HighlightExtension,
    ],
    content,
    onUpdate: ({ editor: ed }) => {
      onChange?.(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[400px] rounded-b-xl border border-input bg-transparent px-4 py-3 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring/50 dark:prose-invert",
      },
    },
    immediatelyRender: false,
  });

  const handleImageUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file || !editor) return;

      const reader = new FileReader();
      reader.onload = () => {
        const src = reader.result as string;
        editor.chain().focus().setImage({ src }).run();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  // Handle drag & drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/")
    );
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (!editor) return;
        const src = reader.result as string;
        editor.chain().focus().setImage({ src }).run();
      };
      reader.readAsDataURL(file);
    });
  };

  return (
    <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
      <Toolbar editor={editor} onImageUpload={handleImageUpload} />
      <EditorContent editor={editor} />
    </div>
  );
}
