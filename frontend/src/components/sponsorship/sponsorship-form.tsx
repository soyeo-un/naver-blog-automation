"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  createSponsorship,
  updateSponsorship,
  type Sponsorship,
} from "@/lib/api";

interface SponsorshipFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem?: Sponsorship | null;
  onSuccess: () => void;
}

export function SponsorshipForm({
  open,
  onOpenChange,
  editItem,
  onSuccess,
}: SponsorshipFormProps) {
  const isEdit = !!editItem;

  const [companyName, setCompanyName] = useState(editItem?.company_name ?? "");
  const [blogUrl, setBlogUrl] = useState(editItem?.blog_url ?? "");
  const [startDate, setStartDate] = useState<Date | undefined>(
    editItem ? new Date(editItem.start_date) : undefined
  );
  const [deadline, setDeadline] = useState<Date | undefined>(
    editItem ? new Date(editItem.deadline) : undefined
  );
  const [memo, setMemo] = useState(editItem?.memo ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [startOpen, setStartOpen] = useState(false);
  const [deadlineOpen, setDeadlineOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError("업체명을 입력해주세요");
      return;
    }
    if (!startDate || !deadline) {
      setError("시작일과 마감일을 선택해주세요");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        company_name: companyName.trim(),
        blog_url: blogUrl.trim() || undefined,
        start_date: startDate.toISOString(),
        deadline: deadline.toISOString(),
        memo: memo.trim() || undefined,
      };

      if (isEdit && editItem) {
        await updateSponsorship(editItem.id, payload);
      } else {
        await createSponsorship(payload);
      }

      onSuccess();
      onOpenChange(false);
    } catch {
      setError("저장에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "협찬 수정" : "새 협찬 등록"}</DialogTitle>
          <DialogDescription>
            협찬 일정 정보를 입력하세요
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Company name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company_name">업체명 *</Label>
            <Input
              id="company_name"
              placeholder="협찬 업체명"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>

          {/* Blog URL */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="blog_url">블로그/사이트 URL</Label>
            <Input
              id="blog_url"
              placeholder="https://..."
              value={blogUrl}
              onChange={(e) => setBlogUrl(e.target.value)}
            />
          </div>

          {/* Date pickers row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Start date */}
            <div className="flex flex-col gap-1.5">
              <Label>시작일 *</Label>
              <Popover open={startOpen} onOpenChange={setStartOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    />
                  }
                >
                  <CalendarIcon className="mr-1.5 size-3.5 text-muted-foreground" />
                  {startDate ? (
                    <span className="text-xs">
                      {format(startDate, "yyyy.MM.dd", { locale: ko })}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">날짜 선택</span>
                  )}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(d) => {
                      setStartDate(d ?? undefined);
                      setStartOpen(false);
                    }}
                    locale={ko}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Deadline */}
            <div className="flex flex-col gap-1.5">
              <Label>마감일 *</Label>
              <Popover open={deadlineOpen} onOpenChange={setDeadlineOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    />
                  }
                >
                  <CalendarIcon className="mr-1.5 size-3.5 text-muted-foreground" />
                  {deadline ? (
                    <span className="text-xs">
                      {format(deadline, "yyyy.MM.dd", { locale: ko })}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">날짜 선택</span>
                  )}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={deadline}
                    onSelect={(d) => {
                      setDeadline(d ?? undefined);
                      setDeadlineOpen(false);
                    }}
                    locale={ko}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Memo */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="memo">메모</Label>
            <Textarea
              id="memo"
              placeholder="메모 (선택사항)"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={3}
            />
          </div>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="size-3.5 animate-spin" />}
              {isEdit ? "수정" : "등록"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
