"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2, MapPin, RotateCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { PlaceInfoDialog } from "@/components/editor/place-info-dialog";
import { getPost, updatePost, enhancePost, type Post } from "@/lib/api";

export default function EditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<{ insertHtml: (html: string) => void } | null>(null);

  useEffect(() => {
    getPost(Number(id))
      .then((p) => {
        setPost(p);
        setTitle(p.title);
        const raw = p.enhanced_text || p.draft_text || "";
        // plain text(\n)를 HTML(<br>)로 변환 (이미 HTML이면 그대로)
        const html = raw.includes("<") ? raw : raw.replace(/\n/g, "<br>");
        setContent(html);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  // Debounced auto-save
  const autoSave = useCallback(
    (html: string) => {
      setContent(html);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        try {
          await updatePost(Number(id), { enhanced_text: html });
        } catch {
          // silent fail on auto-save
        }
      }, 2000);
    },
    [id]
  );

  const handleManualSave = async () => {
    setSaving(true);
    try {
      await updatePost(Number(id), { title, enhanced_text: content });
    } catch {
      // silent fail
    } finally {
      setSaving(false);
    }
  };

  const handleReEnhance = async () => {
    if (!post) return;
    setEnhancing(true);
    try {
      // HTML → plain text 변환
      const div = document.createElement("div");
      div.innerHTML = content;
      const plainText = div.textContent || div.innerText || "";
      // 수정된 텍스트를 draft로 저장 후 AI 보정
      await updatePost(Number(id), { title, draft_text: plainText });
      await enhancePost(post.id);
      router.push(`/write/${id}/review`);
    } catch {
      setEnhancing(false);
    }
  };

  const handleInsertPlace = (html: string) => {
    // Insert into editor by appending
    setContent((prev) => prev + html);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">글을 찾을 수 없습니다</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 md:p-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => router.push("/")}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold tracking-tight">에디터</h1>
            <p className="text-xs text-muted-foreground">글을 편집하세요</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualSave}
            disabled={saving}
            className="gap-1.5"
          >
            {saving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            저장
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReEnhance}
            disabled={enhancing}
            className="gap-1.5"
          >
            {enhancing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RotateCw className="size-3.5" />
            )}
            AI 추가 보정
          </Button>
          <Button
            size="sm"
            onClick={() => router.push(`/write/${id}/publish`)}
            className="gap-1.5"
          >
            발행 준비
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="space-y-4"
      >
        {/* Title */}
        <div className="space-y-2">
          <Label>제목</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-10 text-base font-semibold"
          />
        </div>

        {/* Place info button */}
        <div className="flex gap-2">
          <PlaceInfoDialog onInsert={handleInsertPlace}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <MapPin className="size-3.5" />
              가게 정보 추가
            </Button>
          </PlaceInfoDialog>
        </div>

        {/* TipTap Editor */}
        <TiptapEditor
          content={content}
          onChange={autoSave}
          placeholder="블로그 내용을 편집하세요..."
        />
      </motion.div>
    </div>
  );
}
