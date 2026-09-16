"use client";

import { useState } from "react";
import { Loader2, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CategorySelect } from "./category-select";
import { extractExamplesFromUrl } from "@/lib/api";

interface ExampleExtractorProps {
  onComplete: () => void;
}

export function ExampleExtractor({ onComplete }: ExampleExtractorProps) {
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("");
  const [maxPosts, setMaxPosts] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    posts_processed: number;
    sentences_extracted: number;
    paragraphs_extracted: number;
  } | null>(null);

  const handleExtract = async () => {
    if (!url.trim() || !category) {
      setError("카테고리와 URL을 모두 입력해주세요");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await extractExamplesFromUrl(url.trim(), category, maxPosts);
      setResult(res);
      onComplete();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "추출에 실패했습니다"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        블로그 글에서 문장/문단 예시를 추출하여 학습 데이터로 저장합니다.
        문장 간 연결 패턴, 역할, 톤까지 분석됩니다.
      </p>
      <CategorySelect value={category} onChange={setCategory} />
      <div className="space-y-2">
        <Label>블로그 URL</Label>
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://blog.naver.com/example"
          className="h-9"
        />
      </div>
      <div className="space-y-2">
        <Label>최대 글 수</Label>
        <Input
          type="number"
          value={maxPosts}
          onChange={(e) => setMaxPosts(Number(e.target.value) || 10)}
          min={1}
          max={50}
          className="h-9 w-24"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {result && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
          <p className="font-medium text-emerald-400">추출 완료</p>
          <p className="text-xs text-emerald-400/70">
            {result.posts_processed}개 글 처리 / 문장 {result.sentences_extracted}개 / 문단 {result.paragraphs_extracted}개
          </p>
        </div>
      )}

      <Button
        onClick={handleExtract}
        disabled={loading}
        className="w-full gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            추출 중... (시간이 걸릴 수 있어요)
          </>
        ) : (
          <>
            <BookOpen className="size-4" />
            예시 추출하기
          </>
        )}
      </Button>
    </div>
  );
}
