"use client";

import { useEffect, useState } from "react";
import { Database, RefreshCw, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { UrlAnalyzer } from "@/components/style/url-analyzer";
import { TextAnalyzer } from "@/components/style/text-analyzer";
import { ProfileList } from "@/components/style/profile-list";
import { ExampleExtractor } from "@/components/style/example-extractor";
import {
  getStyleProfiles,
  toggleStyleProfile,
  deleteStyleProfile,
  getExampleStats,
  updateStyleJson,
  type StyleProfile,
  type ExampleStats,
} from "@/lib/api";

export function StyleSection() {
  const [profiles, setProfiles] = useState<StyleProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ExampleStats | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState("");

  const loadProfiles = async () => {
    try {
      const data = await getStyleProfiles();
      setProfiles(data);
    } catch {
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await getExampleStats();
      setStats(data);
    } catch {
      // ignore
    }
  };

  const handleToggle = async (id: number) => {
    await toggleStyleProfile(id);
    await loadProfiles();
  };

  const handleDelete = async (id: number) => {
    await deleteStyleProfile(id);
    await loadProfiles();
  };

  const handleUpdateStyle = async () => {
    setUpdating(true);
    setUpdateMsg("");
    try {
      const result = await updateStyleJson();
      if (result.updated) {
        setUpdateMsg(`style.json 업데이트 완료 (교정 ${result.corrections_used}건 반영)`);
      } else {
        setUpdateMsg(result.reason || "업데이트할 데이터가 없습니다");
      }
    } catch {
      setUpdateMsg("업데이트 실패");
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    loadProfiles();
    loadStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Learning Stats */}
      {stats && (
        <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="size-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">학습 데이터</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUpdateStyle}
              disabled={updating}
              className="h-6 gap-1 px-2 text-[11px]"
            >
              {updating ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <RefreshCw className="size-3" />
              )}
              스타일 업데이트
            </Button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{stats.sentence_examples}</p>
              <p className="text-[10px] text-muted-foreground">문장</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{stats.paragraph_examples}</p>
              <p className="text-[10px] text-muted-foreground">문단</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{stats.approved_corrections}</p>
              <p className="text-[10px] text-muted-foreground">승인된 교정</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{stats.total_corrections}</p>
              <p className="text-[10px] text-muted-foreground">전체 교정</p>
            </div>
          </div>
          {updateMsg && (
            <p className="mt-2 text-xs text-muted-foreground">{updateMsg}</p>
          )}
        </div>
      )}

      <Tabs defaultValue="url">
        <TabsList>
          <TabsTrigger value="url">URL 분석</TabsTrigger>
          <TabsTrigger value="text">텍스트 분석</TabsTrigger>
          <TabsTrigger value="extract">예시 추출</TabsTrigger>
        </TabsList>
        <TabsContent value="url" className="mt-4">
          <UrlAnalyzer onComplete={loadProfiles} />
        </TabsContent>
        <TabsContent value="text" className="mt-4">
          <TextAnalyzer onComplete={loadProfiles} />
        </TabsContent>
        <TabsContent value="extract" className="mt-4">
          <ExampleExtractor onComplete={loadStats} />
        </TabsContent>
      </Tabs>

      <div>
        <h3 className="mb-3 text-xs font-medium text-muted-foreground">저장된 프로필</h3>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/50" />
            ))}
          </div>
        ) : (
          <ProfileList
            profiles={profiles}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  );
}
