"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Loader2,
  ShieldCheck,
  Check,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPost, enhancePost, approveCorrection, type Post } from "@/lib/api";

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
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${color}`}
    >
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
  const [editing, setEditing] = useState(false);
  const [editedText, setEditedText] = useState("");
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);
  const [approveResult, setApproveResult] = useState<{
    has_changes: boolean;
    style_update_needed: boolean;
  } | null>(null);

  useEffect(() => {
    getPost(Number(id))
      .then((p) => {
        setPost(p);
        setEditedText(p.enhanced_text || "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleRerun = async () => {
    if (!post) return;
    setRerunning(true);
    setApproved(false);
    setApproveResult(null);
    try {
      await enhancePost(post.id);
      const updated = await getPost(post.id);
      setPost(updated);
      setEditedText(updated.enhanced_text || "");
      setEditing(false);
    } catch {
      // silently fail
    } finally {
      setRerunning(false);
    }
  };

  const handleApprove = async () => {
    if (!post) return;
    setApproving(true);
    try {
      const result = await approveCorrection(post.id, editedText);
      setApproved(true);
      setApproveResult({
        has_changes: result.correction.has_changes,
        style_update_needed: result.correction.style_update_needed,
      });
    } catch {
      // silently fail
    } finally {
      setApproving(false);
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

  const hasEdits =
    editedText.trim() !== (post.enhanced_text || "").trim();

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 md:p-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
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
            <h1 className="text-lg font-bold tracking-tight">AI 보정 결과</h1>
            <p className="text-xs text-muted-foreground">
              원문과 보정본을 비교하고, 수정 후 승인하세요
            </p>
          </div>
        </div>
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

      {/* Approved notification */}
      {approved && approveResult && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3"
        >
          <div className="flex items-center gap-2 text-sm text-emerald-400">
            <Check className="size-4" />
            <span>스타일 학습 데이터로 저장됨</span>
            {approveResult.has_changes && (
              <Badge variant="secondary" className="text-[10px]">
                수정 반영
              </Badge>
            )}
          </div>
          {approveResult.style_update_needed && (
            <p className="mt-1 text-xs text-emerald-400/70">
              교정 데이터가 충분히 쌓였습니다. 스타일 탭에서 스타일 업데이트를 실행하세요.
            </p>
          )}
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

        {/* Enhanced / Editable */}
        <Card className="ring-2 ring-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge>{editing ? "수정 중" : "AI 보정"}</Badge>
              {editing ? "직접 수정하세요" : "보정본"}
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="size-3.5" />
                </button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="min-h-[300px] w-full resize-y rounded-lg border-0 bg-muted/30 p-3 text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            ) : (
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed">
                {editedText || "보정 결과가 없습니다"}
              </div>
            )}
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

        {!approved && (
          <Button
            variant={hasEdits ? "default" : "secondary"}
            onClick={handleApprove}
            disabled={approving}
            className="gap-2"
          >
            {approving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            {hasEdits ? "수정 후 승인 (학습에 반영)" : "그대로 승인"}
          </Button>
        )}

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
