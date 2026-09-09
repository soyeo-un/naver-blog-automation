"use client";

import { CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CleanReportProps {
  isClean: boolean;
  hiddenCount: number;
  aiScore?: number;
  seoScore?: number;
}

export function CleanReport({
  isClean,
  hiddenCount,
  aiScore,
  seoScore,
}: CleanReportProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {/* Hidden chars */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            숨겨진 문자
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          {isClean ? (
            <CheckCircle2 className="size-8 text-green-500" />
          ) : (
            <AlertTriangle className="size-8 text-amber-500" />
          )}
          <div>
            <p className="text-2xl font-bold">{hiddenCount}개</p>
            <p className="text-xs text-muted-foreground">
              {isClean ? "깨끗합니다" : "클린 처리 필요"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* AI score */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            AI 탐지 점수
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <ShieldCheck
            className={`size-8 ${
              (aiScore ?? 0) < 30
                ? "text-green-500"
                : (aiScore ?? 0) < 60
                  ? "text-amber-500"
                  : "text-red-500"
            }`}
          />
          <div>
            <p className="text-2xl font-bold">{aiScore ?? "-"}점</p>
            <p className="text-xs text-muted-foreground">
              {(aiScore ?? 0) < 30
                ? "안전"
                : (aiScore ?? 0) < 60
                  ? "주의"
                  : "위험"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* SEO score */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            SEO 점수
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <div
            className={`flex size-8 items-center justify-center rounded-full text-sm font-bold ${
              (seoScore ?? 0) >= 70
                ? "bg-green-500/10 text-green-600"
                : (seoScore ?? 0) >= 40
                  ? "bg-amber-500/10 text-amber-600"
                  : "bg-red-500/10 text-red-600"
            }`}
          >
            {seoScore ?? "-"}
          </div>
          <div>
            <p className="text-2xl font-bold">{seoScore ?? "-"}</p>
            <p className="text-xs text-muted-foreground">
              {(seoScore ?? 0) >= 70
                ? "우수"
                : (seoScore ?? 0) >= 40
                  ? "보통"
                  : "개선 필요"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
