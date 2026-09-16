"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, PenSquare, Palette, FileText, Calendar, Camera } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WriteSection } from "@/components/sections/write-section";
import { StyleSection } from "@/components/sections/style-section";
import { PostsSection } from "@/components/sections/posts-section";
import { CalendarSection } from "@/components/sections/calendar-section";
import { PhotoSection } from "@/components/sections/photo-section";
import { API_URL } from "@/lib/api";

function ApiDot() {
  const [status, setStatus] = useState<"checking" | "ok" | "fail">("checking");

  useEffect(() => {
    fetch(`${API_URL}/health`, { cache: "no-store" })
      .then((r) => setStatus(r.ok ? "ok" : "fail"))
      .catch(() => setStatus("fail"));
  }, []);

  const color = status === "ok" ? "bg-emerald-400" : status === "fail" ? "bg-red-400" : "bg-yellow-400";

  return (
    <span
      className={`inline-block size-1.5 rounded-full ${color}`}
      title={status === "ok" ? "API 연결됨" : status === "fail" ? "API 연결 안됨" : "확인 중"}
    />
  );
}

export default function HomePage() {
  return (
    <div className="mx-auto min-h-screen max-w-xl px-5 py-8 md:py-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8 flex items-center gap-2"
      >
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
          <Sparkles className="size-3.5 text-primary" />
        </div>
        <h1 className="font-[var(--font-pixel)] text-sm tracking-wide text-foreground/80">
          숀로그<span className="ml-1.5 text-primary">auto</span>
        </h1>
        <ApiDot />
      </motion.div>

      {/* Main tabs */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <Tabs defaultValue="photo">
          <TabsList className="mb-6 w-full">
            <TabsTrigger value="photo" className="gap-1.5 text-xs">
              <Camera className="size-3" />
              사진 글
            </TabsTrigger>
            <TabsTrigger value="write" className="gap-1.5 text-xs">
              <PenSquare className="size-3" />
              글 보정
            </TabsTrigger>
            <TabsTrigger value="style" className="gap-1.5 text-xs">
              <Palette className="size-3" />
              스타일
            </TabsTrigger>
            <TabsTrigger value="posts" className="gap-1.5 text-xs">
              <FileText className="size-3" />
              내 글
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-1.5 text-xs">
              <Calendar className="size-3" />
              캘린더
            </TabsTrigger>
          </TabsList>

          <TabsContent value="photo">
            <PhotoSection />
          </TabsContent>

          <TabsContent value="write">
            <WriteSection />
          </TabsContent>

          <TabsContent value="style">
            <StyleSection />
          </TabsContent>

          <TabsContent value="posts">
            <PostsSection />
          </TabsContent>

          <TabsContent value="calendar">
            <CalendarSection />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
