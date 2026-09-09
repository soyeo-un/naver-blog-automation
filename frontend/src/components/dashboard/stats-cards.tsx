"use client";

import { motion } from "framer-motion";
import {
  FileText,
  CalendarCheck,
  BarChart3,
  Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatsData {
  totalPosts: number;
  weeklyPublished: number;
  avgSeoScore: number;
  pendingPosts: number;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

export function StatsCards({ stats }: { stats: StatsData }) {
  const cards = [
    {
      label: "총 글 수",
      value: stats.totalPosts,
      icon: FileText,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "이번 주 발행",
      value: stats.weeklyPublished,
      icon: CalendarCheck,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      label: "평균 SEO 점수",
      value: stats.avgSeoScore,
      icon: BarChart3,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      label: "대기중 글",
      value: stats.pendingPosts,
      icon: Clock,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
  ];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <motion.div key={c.label} variants={item}>
            <Card className="relative overflow-hidden">
              <CardContent className="flex items-center gap-4">
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${c.bg}`}>
                  <Icon className={`size-5 ${c.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                  <p className="text-2xl font-bold tracking-tight">{c.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
