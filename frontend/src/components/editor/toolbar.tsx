"use client";

import type { Editor } from "@tiptap/react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading2,
  Heading3,
  Quote,
  Minus,
  ImagePlus,
  Link2,
  Palette,
  Highlighter,
} from "lucide-react";

interface ToolbarProps {
  editor: Editor | null;
  onImageUpload?: () => void;
}

export function Toolbar({ editor, onImageUpload }: ToolbarProps) {
  if (!editor) return null;

  const tools = [
    {
      icon: Bold,
      action: () => editor.chain().focus().toggleBold().run(),
      active: editor.isActive("bold"),
      tooltip: "굵게",
    },
    {
      icon: Italic,
      action: () => editor.chain().focus().toggleItalic().run(),
      active: editor.isActive("italic"),
      tooltip: "기울임",
    },
    {
      icon: UnderlineIcon,
      action: () => editor.chain().focus().toggleUnderline().run(),
      active: editor.isActive("underline"),
      tooltip: "밑줄",
    },
    {
      icon: Strikethrough,
      action: () => editor.chain().focus().toggleStrike().run(),
      active: editor.isActive("strike"),
      tooltip: "취소선",
    },
    "sep",
    {
      icon: Palette,
      action: () => {
        const color = prompt("색상 코드를 입력하세요 (예: #ff0000)");
        if (color) editor.chain().focus().setColor(color).run();
      },
      active: false,
      tooltip: "텍스트 색상",
    },
    {
      icon: Highlighter,
      action: () => editor.chain().focus().toggleHighlight().run(),
      active: editor.isActive("highlight"),
      tooltip: "하이라이트",
    },
    "sep",
    {
      icon: AlignLeft,
      action: () => editor.chain().focus().setTextAlign("left").run(),
      active: editor.isActive({ textAlign: "left" }),
      tooltip: "왼쪽 정렬",
    },
    {
      icon: AlignCenter,
      action: () => editor.chain().focus().setTextAlign("center").run(),
      active: editor.isActive({ textAlign: "center" }),
      tooltip: "가운데 정렬",
    },
    {
      icon: AlignRight,
      action: () => editor.chain().focus().setTextAlign("right").run(),
      active: editor.isActive({ textAlign: "right" }),
      tooltip: "오른쪽 정렬",
    },
    "sep",
    {
      icon: Heading2,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      active: editor.isActive("heading", { level: 2 }),
      tooltip: "제목 2",
    },
    {
      icon: Heading3,
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      active: editor.isActive("heading", { level: 3 }),
      tooltip: "제목 3",
    },
    {
      icon: Quote,
      action: () => editor.chain().focus().toggleBlockquote().run(),
      active: editor.isActive("blockquote"),
      tooltip: "인용구",
    },
    {
      icon: Minus,
      action: () => editor.chain().focus().setHorizontalRule().run(),
      active: false,
      tooltip: "구분선",
    },
    "sep",
    {
      icon: ImagePlus,
      action: () => {
        if (onImageUpload) {
          onImageUpload();
        } else {
          const url = prompt("이미지 URL을 입력하세요");
          if (url) editor.chain().focus().setImage({ src: url }).run();
        }
      },
      active: false,
      tooltip: "이미지",
    },
    {
      icon: Link2,
      action: () => {
        if (editor.isActive("link")) {
          editor.chain().focus().unsetLink().run();
        } else {
          const url = prompt("링크 URL을 입력하세요");
          if (url) {
            editor
              .chain()
              .focus()
              .extendMarkRange("link")
              .setLink({ href: url })
              .run();
          }
        }
      },
      active: editor.isActive("link"),
      tooltip: "링크",
    },
  ] as const;

  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-t-xl border border-b-0 border-input bg-muted/30 p-1.5">
      {tools.map((tool, i) => {
        if (tool === "sep") {
          return (
            <Separator key={`sep-${i}`} orientation="vertical" className="mx-1 h-5" />
          );
        }
        const Icon = tool.icon;
        return (
          <Button
            key={tool.tooltip}
            variant="ghost"
            size="icon-xs"
            type="button"
            onClick={tool.action}
            className={cn(tool.active && "bg-accent text-accent-foreground")}
            title={tool.tooltip}
          >
            <Icon className="size-3.5" />
          </Button>
        );
      })}
    </div>
  );
}
