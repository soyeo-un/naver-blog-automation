"use client";

import { use, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CleanReport } from "@/components/publish/clean-report";
import { CopyButton } from "@/components/publish/copy-button";
import {
  getPost,
  cleanText as cleanTextAPI,
  type Post,
} from "@/lib/api";
import { scanTextLocal, cleanTextLocal } from "@/lib/text-cleaner";

export default function PublishPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [cleanHtml, setCleanHtml] = useState("");
  const [scanResult, setScanResult] = useState({
    isClean: true,
    totalHidden: 0,
  });
  const [toast, setToast] = useState("");

  useEffect(() => {
    getPost(Number(id))
      .then((p) => {
        setPost(p);
        const text = p.clean_html || p.enhanced_text || p.draft_text || "";
        // Run local scan
        const scan = scanTextLocal(text);
        setScanResult({ isClean: scan.isClean, totalHidden: scan.totalHidden });
        // Run local clean
        setCleanHtml(cleanTextLocal(text));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleClean = async () => {
    if (!post) return;
    setCleaning(true);
    try {
      const text = post.enhanced_text || post.draft_text || "";
      const result = await cleanTextAPI(text, true);
      const localClean = cleanTextLocal(result.cleaned_text);
      setCleanHtml(localClean);
      const scan = scanTextLocal(localClean);
      setScanResult({ isClean: scan.isClean, totalHidden: scan.totalHidden });
    } catch {
      // Fall back to local-only cleaning
      const text = post.enhanced_text || post.draft_text || "";
      const localClean = cleanTextLocal(text);
      setCleanHtml(localClean);
      const scan = scanTextLocal(localClean);
      setScanResult({ isClean: scan.isClean, totalHidden: scan.totalHidden });
    } finally {
      setCleaning(false);
    }
  };

  const handlePublish = async () => {
    try {
      await navigator.clipboard.writeText(cleanHtml);
      setToast("클립보드에 복사되었습니다! 네이버 에디터에 붙여넣기 하세요");
      window.open("https://blog.naver.com", "_blank");
      setTimeout(() => setToast(""), 4000);
    } catch {
      setToast("복사에 실패했습니다. 수동으로 복사해주세요.");
      setTimeout(() => setToast(""), 3000);
    }
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
      >
        <h1 className="text-2xl font-bold tracking-tight">발행 준비</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          글을 검증하고 네이버에 발행하세요
        </p>
      </motion.div>

      {/* Clean Report */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
        <CleanReport
          isClean={scanResult.isClean}
          hiddenCount={scanResult.totalHidden}
          aiScore={post.ai_detection_score ?? undefined}
          seoScore={post.seo_score ?? undefined}
        />
      </motion.div>

      {/* Clean action */}
      {!scanResult.isClean && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.16 }}
        >
          <Button
            variant="outline"
            onClick={handleClean}
            disabled={cleaning}
            className="gap-2"
          >
            {cleaning ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            텍스트 클린 실행
          </Button>
        </motion.div>
      )}

      {/* Preview */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
      >
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>미리보기</CardTitle>
            <CopyButton text={cleanHtml} />
          </CardHeader>
          <CardContent>
            <div
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: cleanHtml }}
            />
            {!cleanHtml && (
              <p className="text-sm text-muted-foreground">
                미리보기할 내용이 없습니다
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Big publish button */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col items-center gap-4"
      >
        <Button
          onClick={handlePublish}
          className="h-14 w-full max-w-md gap-3 text-lg font-semibold"
          size="lg"
        >
          <ExternalLink className="size-5" />
          네이버에 발행하기
        </Button>
        <p className="text-xs text-muted-foreground">
          클린 HTML이 클립보드에 복사되고 네이버 블로그가 새 탭으로 열립니다
        </p>
      </motion.div>

      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-foreground px-6 py-3 text-sm font-medium text-background shadow-lg"
        >
          {toast}
        </motion.div>
      )}
    </div>
  );
}
