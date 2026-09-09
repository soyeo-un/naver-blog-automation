"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PenSquare, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { PostList } from "@/components/dashboard/post-list";
import { getPosts, type Post } from "@/lib/api";

export default function DashboardPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const data = await getPosts();
      setPosts(data);
    } catch {
      // API not reachable — use empty state
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const stats = {
    totalPosts: posts.length,
    weeklyPublished: posts.filter(
      (p) =>
        p.status === "published" &&
        new Date(p.created_at) > new Date(Date.now() - 7 * 86400000)
    ).length,
    avgSeoScore:
      posts.length > 0
        ? Math.round(
            posts.reduce((s, p) => s + (p.seo_score ?? 0), 0) / posts.length
          )
        : 0,
    pendingPosts: posts.filter(
      (p) => p.status === "draft" || p.status === "reviewing"
    ).length,
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6 md:p-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">대시보드</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            블로그 글 작성 현황을 한눈에 확인하세요
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={loadPosts}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Link href="/write">
            <Button className="gap-1.5">
              <PenSquare className="size-4" />
              새 글 작성
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <StatsCards stats={stats} />

      {/* Post list */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">최근 글</h2>
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-xl bg-muted"
              />
            ))}
          </div>
        ) : (
          <PostList posts={posts} />
        )}
      </div>
    </div>
  );
}
