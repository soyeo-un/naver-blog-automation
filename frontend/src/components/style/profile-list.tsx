"use client";

import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { StyleProfile } from "@/lib/api";

interface ProfileListProps {
  profiles: StyleProfile[];
  onToggle?: (id: number, active: boolean) => void;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

export function ProfileList({ profiles, onToggle }: ProfileListProps) {
  if (profiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
          <Sparkles className="size-7 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-base font-semibold">
          아직 생성된 프로필이 없어요
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          URL이나 텍스트를 분석해서 스타일 프로필을 만들어보세요
        </p>
      </div>
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-3"
    >
      {profiles.map((profile) => (
        <motion.div key={profile.id} variants={item}>
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm">{profile.name}</CardTitle>
                <Badge variant={profile.is_active ? "default" : "secondary"}>
                  {profile.is_active ? "활성" : "비활성"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor={`toggle-${profile.id}`} className="text-xs text-muted-foreground">
                  활성화
                </Label>
                <Switch
                  id={`toggle-${profile.id}`}
                  checked={profile.is_active}
                  onCheckedChange={(checked: boolean) =>
                    onToggle?.(profile.id, checked)
                  }
                  size="sm"
                />
              </div>
            </CardHeader>
            {profile.style_summary && (
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {profile.style_summary}
                </p>
              </CardContent>
            )}
            <CardContent>
              <p className="text-xs text-muted-foreground">
                생성: {format(new Date(profile.created_at), "yyyy년 M월 d일", { locale: ko })}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}
