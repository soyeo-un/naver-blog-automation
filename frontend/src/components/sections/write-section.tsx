"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Lightbulb } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { KeywordInput } from "@/components/write/keyword-input";
import { DraftEditor } from "@/components/write/draft-editor";
import { CategorySelect } from "@/components/style/category-select";
import { createPost, enhancePost, suggestTitles } from "@/lib/api";

export function WriteSection() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [draftText, setDraftText] = useState("");
  const [category, setCategory] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestedTitles, setSuggestedTitles] = useState<string[]>([]);
  const [titleLoading, setTitleLoading] = useState(false);

  const handleSuggestTitles = async () => {
    if (keywords.length === 0) {
      setError("키워드를 먼저 입력해주세요");
      return;
    }
    setTitleLoading(true);
    setError("");
    setSuggestedTitles([]);
    try {
      const res = await suggestTitles(keywords);
      setSuggestedTitles(res.titles);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "제목 추천에 실패했습니다"
      );
    } finally {
      setTitleLoading(false);
    }
  };

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
      });
      await enhancePost(post.id, category || undefined);
      router.push(`/write/${post.id}/review`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "오류가 발생했습니다"
      );
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Keywords */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">키워드</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSuggestTitles}
            disabled={titleLoading || keywords.length === 0}
            className="h-6 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
          >
            {titleLoading ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Lightbulb className="size-3" />
            )}
            제목 추천
          </Button>
        </div>
        <KeywordInput keywords={keywords} onChange={setKeywords} />
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-xs text-muted-foreground">제목</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={keywords.length > 0 ? "직접 입력하거나 제목 추천을 눌러보세요" : "블로그 글 제목"}
          className="h-9 border-0 bg-muted/50 text-sm focus-visible:ring-1"
        />
        {suggestedTitles.length > 0 && (
          <div className="space-y-1 rounded-lg border border-border/50 bg-muted/30 p-2.5">
            <p className="text-[11px] text-muted-foreground">클릭해서 적용</p>
            {suggestedTitles.map((t, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setTitle(t);
                  setSuggestedTitles([]);
                }}
                className="block w-full rounded-md px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-primary/10"
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Draft */}
      <div className="space-y-2">
        <Label htmlFor="draft" className="text-xs text-muted-foreground">초안</Label>
        <DraftEditor value={draftText} onChange={setDraftText} />
      </div>

      {/* Category */}
      <CategorySelect value={category} onChange={setCategory} />

      {/* Error */}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {/* Submit */}
      <Button
        onClick={handleEnhance}
        disabled={loading}
        className="w-full gap-2 h-10"
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

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-card p-6 ring-1 ring-border">
            <div className="relative">
              <Loader2 className="size-8 animate-spin text-primary" />
              <Sparkles className="absolute -right-1 -top-1 size-3 text-amber-500" />
            </div>
            <p className="text-sm font-medium">AI가 글을 보정하고 있어요</p>
          </div>
        </div>
      )}
    </div>
  );
}
