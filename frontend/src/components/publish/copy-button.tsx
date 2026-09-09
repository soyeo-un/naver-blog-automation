"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CopyButtonProps {
  text: string;
  onCopied?: () => void;
}

export function CopyButton({ text, onCopied }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onCopied?.();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      onCopied?.();
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleCopy}
      className="gap-2"
      size="sm"
    >
      {copied ? (
        <>
          <Check className="size-4 text-green-500" />
          복사 완료
        </>
      ) : (
        <>
          <Copy className="size-4" />
          HTML 복사
        </>
      )}
    </Button>
  );
}
