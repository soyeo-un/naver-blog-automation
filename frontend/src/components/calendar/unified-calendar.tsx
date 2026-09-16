"use client";

import { useState } from "react";
import { format, isSameDay, addMonths, subMonths } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CalendarItem } from "@/components/sections/calendar-section";

interface UnifiedCalendarProps {
  items: CalendarItem[];
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
}

function getDaysInMonth(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];

  const startDayOfWeek = firstDay.getDay();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    days.push({ date: new Date(year, month, -i), isCurrentMonth: false });
  }

  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push({ date: new Date(year, month, i), isCurrentMonth: true });
  }

  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
  }

  return days;
}

function getItemsForDate(items: CalendarItem[], date: Date) {
  return items.filter((item) => {
    const start = new Date(item.startDate);
    const end = new Date(item.endDate);
    const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    return day >= s && day <= e;
  });
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function UnifiedCalendar({ items, selectedDate, onSelectDate }: UnifiedCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = getDaysInMonth(currentMonth);
  const today = new Date();

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 p-3">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="h-7 w-7 p-0"
        >
          <ChevronLeft className="size-3.5" />
        </Button>
        <h2 className="text-xs font-semibold">
          {format(currentMonth, "yyyy년 M월", { locale: ko })}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="h-7 w-7 p-0"
        >
          <ChevronRight className="size-3.5" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="mb-0.5 grid grid-cols-7 text-center">
        {WEEKDAYS.map((day, i) => (
          <div
            key={day}
            className={`py-1 text-[10px] font-medium ${
              i === 0 ? "text-red-400/70" : i === 6 ? "text-blue-400/70" : "text-muted-foreground/60"
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7">
        {days.map(({ date, isCurrentMonth }, idx) => {
          const dayItems = getItemsForDate(items, date);
          const isToday = isSameDay(date, today);
          const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
          const dayOfWeek = idx % 7;

          return (
            <button
              key={idx}
              onClick={() => onSelectDate(date)}
              className={`relative flex min-h-[2.6rem] flex-col items-center gap-0.5 rounded-lg p-1 text-[11px] transition-colors
                ${!isCurrentMonth ? "text-muted-foreground/25" : ""}
                ${isToday ? "bg-primary/10 font-bold text-primary" : ""}
                ${isSelected ? "ring-1.5 ring-primary ring-offset-1 ring-offset-background" : ""}
                ${dayOfWeek === 0 && isCurrentMonth && !isToday ? "text-red-400/70" : ""}
                ${dayOfWeek === 6 && isCurrentMonth && !isToday ? "text-blue-400/70" : ""}
                hover:bg-muted/40
              `}
            >
              <span className="leading-tight">{date.getDate()}</span>
              {dayItems.length > 0 && (
                <div className="flex gap-[3px]">
                  {dayItems.slice(0, 3).map((item) => (
                    <span
                      key={`${item.type}-${item.id}`}
                      className={`inline-block size-[5px] rounded-full ${
                        item.type === "sponsorship"
                          ? "bg-amber-400"
                          : item.notify
                            ? "bg-blue-400"
                            : "bg-zinc-500"
                      }`}
                    />
                  ))}
                  {dayItems.length > 3 && (
                    <span className="text-[8px] leading-none text-muted-foreground">
                      +{dayItems.length - 3}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
