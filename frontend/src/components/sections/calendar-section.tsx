"use client";

import { useEffect, useState, useMemo } from "react";
import { format, isSameDay } from "date-fns";
import { ko } from "date-fns/locale";
import { Plus, Trash2, Bell, BellOff, Building2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { UnifiedCalendar } from "@/components/calendar/unified-calendar";
import {
  getSponsorships,
  getSchedules,
  createSchedule,
  deleteSchedule,
  deleteSponsorship,
  type Sponsorship,
  type ScheduleEvent,
} from "@/lib/api";

export interface CalendarItem {
  id: number;
  type: "sponsorship" | "schedule";
  title: string;
  startDate: string;
  endDate: string;
  memo?: string | null;
  notify: boolean;
  status?: string;
}

function toCalendarItems(sponsorships: Sponsorship[], schedules: ScheduleEvent[]): CalendarItem[] {
  const items: CalendarItem[] = [];

  for (const s of sponsorships) {
    items.push({
      id: s.id,
      type: "sponsorship",
      title: s.company_name,
      startDate: s.start_date,
      endDate: s.deadline,
      memo: s.memo,
      notify: s.notified === 1,
      status: s.status,
    });
  }

  for (const s of schedules) {
    items.push({
      id: s.id,
      type: "schedule",
      title: s.title,
      startDate: s.start_date,
      endDate: s.end_date || s.start_date,
      memo: s.memo,
      notify: s.notify,
    });
  }

  return items;
}

export function CalendarSection() {
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [schedules, setSchedules] = useState<ScheduleEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formNotify, setFormNotify] = useState(false);
  const [formMemo, setFormMemo] = useState("");
  const [saving, setSaving] = useState(false);

  const loadAll = async () => {
    const [sp, sc] = await Promise.allSettled([getSponsorships(), getSchedules()]);
    setSponsorships(sp.status === "fulfilled" ? sp.value : []);
    setSchedules(sc.status === "fulfilled" ? sc.value : []);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const allItems = useMemo(() => toCalendarItems(sponsorships, schedules), [sponsorships, schedules]);

  const selectedItems = useMemo(() => {
    if (!selectedDate) return allItems;
    return allItems.filter((item) => {
      const start = new Date(item.startDate);
      const end = new Date(item.endDate);
      const day = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      return day >= s && day <= e;
    });
  }, [allItems, selectedDate]);

  const handleAddSchedule = async () => {
    if (!formTitle.trim() || !selectedDate) return;
    setSaving(true);
    try {
      await createSchedule({
        title: formTitle.trim(),
        start_date: selectedDate.toISOString(),
        memo: formMemo.trim() || undefined,
        notify: formNotify,
      });
      setFormTitle("");
      setFormMemo("");
      setFormNotify(false);
      setShowForm(false);
      await loadAll();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: CalendarItem) => {
    if (!window.confirm(`"${item.title}" 삭제할까요?`)) return;
    try {
      if (item.type === "schedule") {
        await deleteSchedule(item.id);
      } else {
        await deleteSponsorship(item.id);
      }
      await loadAll();
    } catch {
      // silent
    }
  };

  return (
    <div className="space-y-4">
      {/* Calendar */}
      <UnifiedCalendar
        items={allItems}
        selectedDate={selectedDate}
        onSelectDate={(d) => {
          if (selectedDate && isSameDay(d, selectedDate)) {
            setSelectedDate(null);
          } else {
            setSelectedDate(d);
          }
        }}
      />

      {/* Legend */}
      <div className="flex items-center justify-center gap-5 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full bg-blue-400" />
          알림 ON
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full bg-zinc-500" />
          알림 OFF
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full bg-amber-400" />
          협찬
        </span>
      </div>

      {/* Actions bar */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {selectedDate
            ? `${selectedDate.getMonth() + 1}/${selectedDate.getDate()} — ${selectedItems.length}건`
            : `전체 ${allItems.length}건`}
          {selectedDate && (
            <button onClick={() => setSelectedDate(null)} className="ml-2 text-primary hover:underline">
              전체
            </button>
          )}
        </span>
        <Button
          size="sm"
          onClick={() => {
            if (!selectedDate) setSelectedDate(new Date());
            setShowForm(!showForm);
          }}
          className="h-7 gap-1 px-2.5 text-xs"
        >
          <Plus className="size-3" />
          일정 추가
        </Button>
      </div>

      {/* Quick add form */}
      {showForm && (
        <Card>
          <CardContent className="space-y-3 pt-4">
            <div className="space-y-1.5">
              <Label className="text-xs">
                {selectedDate
                  ? format(selectedDate, "M월 d일 (E)", { locale: ko })
                  : "날짜를 선택해주세요"}
              </Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="일정 제목"
                className="h-8 border-0 bg-muted/50 text-sm"
              />
            </div>
            <Input
              value={formMemo}
              onChange={(e) => setFormMemo(e.target.value)}
              placeholder="메모 (선택)"
              className="h-8 border-0 bg-muted/50 text-sm"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formNotify}
                  onCheckedChange={setFormNotify}
                  id="notify-switch"
                />
                <Label htmlFor="notify-switch" className="text-xs text-muted-foreground">알림</Label>
              </div>
              <div className="flex gap-1.5">
                <Button variant="ghost" size="sm" onClick={() => setShowForm(false)} className="h-7 text-xs">
                  취소
                </Button>
                <Button size="sm" onClick={handleAddSchedule} disabled={saving || !formTitle.trim()} className="h-7 text-xs">
                  추가
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Event list */}
      <div className="space-y-2">
        {selectedItems.length === 0 && (
          <div className="py-8 text-center text-xs text-muted-foreground">
            {selectedDate ? "이 날짜에 일정이 없어요" : "등록된 일정이 없어요"}
          </div>
        )}
        {selectedItems.map((item) => (
          <div
            key={`${item.type}-${item.id}`}
            className="group flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2.5 transition-colors hover:bg-muted/30"
          >
            {/* Notify indicator */}
            <span
              className={`inline-block size-2 shrink-0 rounded-full ${
                item.type === "sponsorship"
                  ? "bg-amber-400"
                  : item.notify
                    ? "bg-blue-400"
                    : "bg-zinc-500"
              }`}
            />

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                {item.type === "sponsorship" && <Building2 className="size-3 text-amber-400" />}
                {item.notify && item.type !== "sponsorship" && <Bell className="size-3 text-blue-400" />}
                {!item.notify && item.type !== "sponsorship" && <BellOff className="size-3 text-zinc-500" />}
                <span className="truncate text-sm">{item.title}</span>
                {item.type === "sponsorship" && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">협찬</Badge>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                <span>
                  {format(new Date(item.startDate), "M.d", { locale: ko })}
                  {item.startDate !== item.endDate && ` ~ ${format(new Date(item.endDate), "M.d", { locale: ko })}`}
                </span>
                {item.memo && <span className="truncate">{item.memo}</span>}
              </div>
            </div>

            {/* Delete */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(item)}
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
