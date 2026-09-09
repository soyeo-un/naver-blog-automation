"use client";

import { useState } from "react";
import { format, isSameDay, isSameMonth, addMonths, subMonths } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Sponsorship } from "@/lib/api";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-blue-500",
  in_progress: "bg-amber-500",
  completed: "bg-green-500",
};

interface CalendarViewProps {
  sponsorships: Sponsorship[];
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
}

function getDaysInMonth(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];

  // Fill in days from previous month to start on Sunday
  const startDayOfWeek = firstDay.getDay();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: d, isCurrentMonth: false });
  }

  // Current month days
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push({ date: new Date(year, month, i), isCurrentMonth: true });
  }

  // Fill rest of the grid (6 rows)
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
  }

  return days;
}

function getSponsorshipsForDate(sponsorships: Sponsorship[], date: Date) {
  return sponsorships.filter((s) => {
    const start = new Date(s.start_date);
    const deadline = new Date(s.deadline);
    // A sponsorship spans from start_date to deadline
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const sStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const sEnd = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
    return dayStart >= sStart && dayStart <= sEnd;
  });
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function CalendarView({
  sponsorships,
  selectedDate,
  onSelectDate,
}: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = getDaysInMonth(currentMonth);
  const today = new Date();

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <h2 className="text-sm font-semibold">
          {format(currentMonth, "yyyy년 M월", { locale: ko })}
        </h2>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="mb-1 grid grid-cols-7 text-center">
        {WEEKDAYS.map((day, i) => (
          <div
            key={day}
            className={`py-1 text-xs font-medium ${
              i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-muted-foreground"
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7">
        {days.map(({ date, isCurrentMonth }, idx) => {
          const daySpons = getSponsorshipsForDate(sponsorships, date);
          const isToday = isSameDay(date, today);
          const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
          const dayOfWeek = idx % 7;

          return (
            <button
              key={idx}
              onClick={() => onSelectDate(date)}
              className={`relative flex min-h-[3rem] flex-col items-center gap-0.5 rounded-lg p-1 text-xs transition-colors
                ${!isCurrentMonth ? "text-muted-foreground/40" : ""}
                ${isToday ? "bg-muted font-bold" : ""}
                ${isSelected ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""}
                ${dayOfWeek === 0 && isCurrentMonth ? "text-red-400" : ""}
                ${dayOfWeek === 6 && isCurrentMonth ? "text-blue-400" : ""}
                hover:bg-muted/60
              `}
            >
              <span className="leading-tight">{date.getDate()}</span>
              {daySpons.length > 0 && (
                <div className="flex gap-0.5">
                  {daySpons.slice(0, 3).map((s) => (
                    <span
                      key={s.id}
                      className={`inline-block size-1.5 rounded-full ${STATUS_COLORS[s.status] ?? "bg-blue-500"}`}
                    />
                  ))}
                  {daySpons.length > 3 && (
                    <span className="text-[9px] leading-none text-muted-foreground">
                      +{daySpons.length - 3}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block size-2 rounded-full bg-blue-500" />
          대기중
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2 rounded-full bg-amber-500" />
          진행중
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2 rounded-full bg-green-500" />
          완료
        </span>
      </div>
    </div>
  );
}
