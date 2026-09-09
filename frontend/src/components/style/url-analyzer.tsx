"use client";

import { useState } from "react";
import { Loader2, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { analyzeUrl } from "@/lib/api";

interface UrlAnalyzerProps {
  onComplete: () => void;
}

export function UrlAnalyzer({ onComplete }: UrlAnalyzerProps) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAnalyze = async () => {
    if (!url.trim() || !name.trim()) {
      setError("URL과 프로필 이름을 모두 입력해주세요");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await analyzeUrl(url.trim(), name.trim());
      setUrl("");
      setName("");
      onComplete();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "분석에 실패했습니다"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
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
        <Label>프로필 이름</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 맛집 블로거 스타일"
          className="h-9"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        onClick={handleAnalyze}
        disabled={loading}
        className="w-full gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            분석 중...
          </>
        ) : (
          <>
            <Globe className="size-4" />
            URL 분석하기
          </>
        )}
      </Button>
    </div>
  );
}
