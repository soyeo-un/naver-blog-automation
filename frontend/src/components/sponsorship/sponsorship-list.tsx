"use client";

import { motion } from "framer-motion";
import { format, differenceInCalendarDays } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Building2,
  ExternalLink,
  Pencil,
  Trash2,
  ArrowRightCircle,
  CalendarClock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  updateSponsorship,
  deleteSponsorship,
  type Sponsorship,
} from "@/lib/api";

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline"; next: string; nextLabel: string }
> = {
  pending: {
    label: "대기중",
    variant: "secondary",
    next: "in_progress",
    nextLabel: "진행 시작",
  },
  in_progress: {
    label: "진행중",
    variant: "outline",
    next: "completed",
    nextLabel: "완료 처리",
  },
  completed: {
    label: "완료",
    variant: "default",
    next: "pending",
    nextLabel: "다시 대기",
  },
};

const STATUS_DOT: Record<string, string> = {
  pending: "bg-blue-500",
  in_progress: "bg-amber-500",
  completed: "bg-green-500",
};

function getDdayText(deadline: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dl = new Date(deadline);
  dl.setHours(0, 0, 0, 0);
  const diff = differenceInCalendarDays(dl, today);

  if (diff < 0) return { text: `D+${Math.abs(diff)}`, urgent: true };
  if (diff === 0) return { text: "D-Day", urgent: true };
  if (diff <= 3) return { text: `D-${diff}`, urgent: true };
  return { text: `D-${diff}`, urgent: false };
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" as const },
  },
};

interface SponsorshipListProps {
  sponsorships: Sponsorship[];
  onEdit: (s: Sponsorship) => void;
  onRefresh: () => void;
}

export function SponsorshipList({
  sponsorships,
  onEdit,
  onRefresh,
}: SponsorshipListProps) {
  if (sponsorships.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-16"
      >
        <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
          <CalendarClock className="size-7 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-base font-semibold">등록된 협찬이 없어요</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          새 협찬 등록 버튼을 눌러 일정을 추가하세요
        </p>
      </motion.div>
    );
  }

  const handleStatusToggle = async (s: Sponsorship) => {
    const cfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.pending;
    try {
      await updateSponsorship(s.id, { status: cfg.next as Sponsorship["status"] });
      onRefresh();
    } catch {
      // silently fail
    }
  };

  const handleDelete = async (s: Sponsorship) => {
    if (!window.confirm(`"${s.company_name}" 협찬을 삭제하시겠습니까?`)) return;
    try {
      await deleteSponsorship(s.id);
      onRefresh();
    } catch {
      // silently fail
    }
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-3"
    >
      {sponsorships.map((s) => {
        const cfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.pending;
        const dday = getDdayText(s.deadline);

        return (
          <motion.div key={s.id} variants={item}>
            <Card className="transition-shadow hover:ring-2 hover:ring-primary/20">
              <CardContent className="flex items-start gap-4">
                {/* Status dot + D-day */}
                <div className="flex flex-col items-center gap-1 pt-0.5">
                  <span
                    className={`inline-block size-2.5 rounded-full ${STATUS_DOT[s.status] ?? "bg-blue-500"}`}
                  />
                  <span
                    className={`text-xs font-bold ${
                      dday.urgent ? "text-destructive" : "text-muted-foreground"
                    }`}
                  >
                    {dday.text}
                  </span>
                </div>

                {/* Main content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
                    <h3 className="truncate text-sm font-semibold">
                      {s.company_name}
                    </h3>
                    <Badge variant={cfg.variant}>{cfg.label}</Badge>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      {format(new Date(s.start_date), "M.d", { locale: ko })} ~{" "}
                      {format(new Date(s.deadline), "M.d", { locale: ko })}
                    </span>
                    {s.blog_url && (
                      <a
                        href={s.blog_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="size-3" />
                        링크
                      </a>
                    )}
                  </div>

                  {s.memo && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {s.memo}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleStatusToggle(s)}
                    title={cfg.nextLabel}
                  >
                    <ArrowRightCircle className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onEdit(s)}
                    title="수정"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleDelete(s)}
                    title="삭제"
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
