"use client";

import { Textarea } from "@/components/ui/textarea";

interface DraftEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function DraftEditor({ value, onChange }: DraftEditorProps) {
  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="5~6줄로 초안을 작성해주세요..."
      className="min-h-[200px] resize-y text-sm leading-relaxed"
      rows={8}
    />
  );
}
