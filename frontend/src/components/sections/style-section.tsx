"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UrlAnalyzer } from "@/components/style/url-analyzer";
import { TextAnalyzer } from "@/components/style/text-analyzer";
import { ProfileList } from "@/components/style/profile-list";
import {
  getStyleProfiles,
  toggleStyleProfile,
  deleteStyleProfile,
  type StyleProfile,
} from "@/lib/api";

export function StyleSection() {
  const [profiles, setProfiles] = useState<StyleProfile[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleToggle = async (id: number) => {
    await toggleStyleProfile(id);
    await loadProfiles();
  };

  const handleDelete = async (id: number) => {
    await deleteStyleProfile(id);
    await loadProfiles();
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="url">
        <TabsList>
          <TabsTrigger value="url">URL 분석</TabsTrigger>
          <TabsTrigger value="text">텍스트 분석</TabsTrigger>
        </TabsList>
        <TabsContent value="url" className="mt-4">
          <UrlAnalyzer onComplete={loadProfiles} />
        </TabsContent>
        <TabsContent value="text" className="mt-4">
          <TextAnalyzer onComplete={loadProfiles} />
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
