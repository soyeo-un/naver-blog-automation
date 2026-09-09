"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UrlAnalyzer } from "@/components/style/url-analyzer";
import { TextAnalyzer } from "@/components/style/text-analyzer";
import { ProfileList } from "@/components/style/profile-list";
import { getStyleProfiles, type StyleProfile } from "@/lib/api";

export default function StylePage() {
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

  useEffect(() => {
    loadProfiles();
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6 md:p-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <h1 className="text-2xl font-bold tracking-tight">스타일 학습</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          블로그 URL이나 텍스트에서 글쓰기 스타일을 분석하세요
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
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
      </motion.div>

      {/* Profiles */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
      >
        <h2 className="mb-4 text-lg font-semibold">스타일 프로필</h2>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl bg-muted"
              />
            ))}
          </div>
        ) : (
          <ProfileList profiles={profiles} />
        )}
      </motion.div>
    </div>
  );
}
