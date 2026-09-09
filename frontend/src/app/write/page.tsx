"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KeywordInput } from "@/components/write/keyword-input";
import { DraftEditor } from "@/components/write/draft-editor";
import {
  createPost,
  enhancePost,
  getStyleProfiles,
  type StyleProfile,
} from "@/lib/api";

export default function WritePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [draftText, setDraftText] = useState("");
  const [styleProfileId, setStyleProfileId] = useState<string>("");
  const [profiles, setProfiles] = useState<StyleProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getStyleProfiles()
      .then(setProfiles)
      .catch(() => {});
  }, []);

  const handleEnhance = async () => {
    if (!title.trim()) {
      setError("제목을 입력해주세요");
      return;
    }
    if (!draftText.trim()) {
      setError("초안을 작성해주세요");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const post = await createPost({
        title: title.trim(),
        keywords,
        draft_text: draftText.trim(),
        style_profile_id: styleProfileId ? Number(styleProfileId) : undefined,
      });
      await enhancePost(
        post.id,
        styleProfileId ? Number(styleProfileId) : undefined
      );
      router.push(`/write/${post.id}/review`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "오류가 발생했습니다. 다시 시도해주세요."
      );
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6 md:p-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <h1 className="text-2xl font-bold tracking-tight">새 글 작성</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          초안을 작성하면 AI가 블로그 스타일로 보정해줍니다
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08 }}
        className="space-y-6"
      >
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">제목</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="블로그 글 제목을 입력하세요"
            className="h-10 text-base"
          />
        </div>

        {/* Keywords */}
        <div className="space-y-2">
          <Label>키워드</Label>
          <KeywordInput keywords={keywords} onChange={setKeywords} />
        </div>

        {/* Draft */}
        <div className="space-y-2">
          <Label htmlFor="draft">초안</Label>
          <DraftEditor value={draftText} onChange={setDraftText} />
        </div>

        {/* Style Profile Selector */}
        {profiles.length > 0 && (
          <div className="space-y-2">
            <Label>스타일 프로필</Label>
            <Select value={styleProfileId} onValueChange={(val) => setStyleProfileId(val ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="스타일 프로필 선택 (선택사항)" />
              </SelectTrigger>
              <SelectContent>
                {profiles
                  .filter((p) => p.is_active)
                  .map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {/* Submit */}
        <Button
          onClick={handleEnhance}
          disabled={loading}
          className="w-full gap-2 h-11"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              AI 보정 중...
            </>
          ) : (
            <>
              <Sparkles className="size-4" />
              AI 보정하기
            </>
          )}
        </Button>
      </motion.div>

      {/* Loading overlay */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="flex flex-col items-center gap-4 rounded-2xl bg-card p-8 ring-1 ring-foreground/10"
          >
            <div className="relative">
              <Loader2 className="size-10 animate-spin text-primary" />
              <Sparkles className="absolute -right-1 -top-1 size-4 text-amber-500" />
            </div>
            <div className="text-center">
              <p className="font-semibold">AI가 글을 보정하고 있어요</p>
              <p className="mt-1 text-sm text-muted-foreground">
                잠시만 기다려주세요...
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
