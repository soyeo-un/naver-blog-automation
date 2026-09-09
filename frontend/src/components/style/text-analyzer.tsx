"use client";

import { useState } from "react";
import { Loader2, FileText } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CategorySelect } from "./category-select";
import { analyzeText } from "@/lib/api";

interface TextAnalyzerProps {
  onComplete: () => void;
}

export function TextAnalyzer({ onComplete }: TextAnalyzerProps) {
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAnalyze = async () => {
    if (!text.trim() || !name.trim() || !category) {
      setError("텍스트, 프로필 이름, 카테고리를 모두 입력해주세요");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const samples = text
        .split(/\n{2,}/)
        .map((s) => s.trim())
        .filter(Boolean);
      await analyzeText(samples.length > 0 ? samples : [text.trim()], name.trim(), category);
      setText("");
      setName("");
      setCategory("");
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
      <CategorySelect value={category} onChange={setCategory} />
      <div className="space-y-2">
        <Label>샘플 텍스트</Label>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="블로그 글 샘플을 붙여넣기 하세요. 여러 샘플은 빈 줄로 구분해주세요."
          className="min-h-[180px]"
        />
      </div>
      <div className="space-y-2">
        <Label>프로필 이름</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 내 블로그 스타일"
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
            <FileText className="size-4" />
            텍스트 분석하기
          </>
        )}
      </Button>
    </div>
  );
}
