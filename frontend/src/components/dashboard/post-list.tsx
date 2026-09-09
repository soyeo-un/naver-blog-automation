"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { FileText, MoreHorizontal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Post } from "@/lib/api";

const STATUS_MAP: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  draft: { label: "초안", variant: "secondary" },
  reviewing: { label: "검토중", variant: "outline" },
  scheduled: { label: "예약", variant: "default" },
  published: { label: "발행완료", variant: "default" },
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.2 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

export function PostList({ posts }: { posts: Post[] }) {
  if (posts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-20"
      >
        <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
          <FileText className="size-8 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">아직 작성된 글이 없어요</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          새 글 작성을 눌러 첫 블로그 글을 만들어보세요
        </p>
        <Link
          href="/write"
          className="mt-4 inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
        >
          새 글 작성하기
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-3"
    >
      {posts.map((post) => {
        const status = STATUS_MAP[post.status] ?? STATUS_MAP.draft;
        return (
          <motion.div key={post.id} variants={item}>
            <Link href={`/write/${post.id}/edit`}>
              <Card className="transition-shadow hover:ring-2 hover:ring-primary/20">
                <CardContent className="flex items-center gap-4">
                  {/* Left content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-semibold">
                        {post.title || "제목 없음"}
                      </h3>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    {post.keywords.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {post.keywords.slice(0, 4).map((kw) => (
                          <span
                            key={kw}
                            className="inline-flex rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
                          >
                            {kw}
                          </span>
                        ))}
                        {post.keywords.length > 4 && (
                          <span className="inline-flex rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                            +{post.keywords.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {format(new Date(post.created_at), "yyyy년 M월 d일 HH:mm", {
                        locale: ko,
                      })}
                    </p>
                  </div>

                  {/* Right: SEO score */}
                  {post.seo_score != null && (
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-muted-foreground">SEO</span>
                      <span
                        className={`text-lg font-bold ${
                          post.seo_score >= 70
                            ? "text-green-500"
                            : post.seo_score >= 40
                              ? "text-amber-500"
                              : "text-red-500"
                        }`}
                      >
                        {post.seo_score}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
