"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, RotateCw, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPost, enhancePost, type Post } from "@/lib/api";

function AiScoreBadge({ score }: { score: number }) {
  let color = "bg-green-500/10 text-green-600";
  let label = "안전";
  if (score >= 60) {
    color = "bg-red-500/10 text-red-600";
    label = "위험";
  } else if (score >= 30) {
    color = "bg-amber-500/10 text-amber-600";
    label = "주의";
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${color}`}>
      <ShieldCheck className="size-4" />
      AI 탐지 {score}점 — {label}
    </span>
  );
}

export default function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [rerunning, setRerunning] = useState(false);

  useEffect(() => {
    getPost(Number(id))
      .then(setPost)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleRerun = async () => {
    if (!post) return;
    setRerunning(true);
    try {
      await enhancePost(post.id, post.style_profile_id ?? undefined);
      const updated = await getPost(post.id);
      setPost(updated);
    } catch {
      // silently fail
    } finally {
      setRerunning(false);
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
    <div className="mx-auto max-w-5xl space-y-6 p-6 md:p-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <h1 className="text-2xl font-bold tracking-tight">AI 보정 결과</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          원문과 AI 보정본을 비교하고 수정하세요
        </p>
      </motion.div>

      {/* AI Detection Score */}
      {post.ai_detection_score != null && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <AiScoreBadge score={post.ai_detection_score} />
        </motion.div>
      )}

      {/* Side by side comparison */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="grid gap-4 lg:grid-cols-2"
      >
        {/* Original */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge variant="secondary">원문</Badge>
              초안
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {post.draft_text}
            </div>
          </CardContent>
        </Card>

        {/* Enhanced */}
        <Card className="ring-2 ring-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge>AI 보정</Badge>
              보정본
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed">
              {post.enhanced_text || "보정 결과가 없습니다"}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <Button
          variant="outline"
          onClick={handleRerun}
          disabled={rerunning}
          className="gap-2"
        >
          {rerunning ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RotateCw className="size-4" />
          )}
          다시 보정하기
        </Button>
        <Button
          onClick={() => router.push(`/write/${id}/edit`)}
          className="gap-2"
        >
          에디터로 이동
          <ArrowRight className="size-4" />
        </Button>
      </motion.div>
    </div>
  );
}
