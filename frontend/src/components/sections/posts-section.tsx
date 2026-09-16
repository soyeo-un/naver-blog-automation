"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PostList } from "@/components/dashboard/post-list";
import { getPosts, type Post } from "@/lib/api";

export function PostsSection() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const data = await getPosts();
      setPosts(data);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const stats = {
    total: posts.length,
    published: posts.filter((p) => p.status === "published").length,
    pending: posts.filter((p) => p.status === "draft" || p.status === "reviewing").length,
  };

  return (
    <div className="space-y-4">
      {/* Mini stats */}
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>전체 {stats.total}</span>
          <span>발행 {stats.published}</span>
          <span>대기 {stats.pending}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={loadPosts}
          className="h-7 gap-1 px-2 text-xs text-muted-foreground"
        >
          <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} />
          새로고침
        </Button>
      </div>

      {/* Post list */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/50" />
          ))}
        </div>
      ) : (
        <PostList posts={posts} />
      )}
    </div>
  );
}
