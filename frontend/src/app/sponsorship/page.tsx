"use client";

import { useEffect, useState, useMemo } from "react";
import { isSameDay } from "date-fns";
import { motion } from "framer-motion";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalendarView } from "@/components/sponsorship/calendar-view";
import { SponsorshipForm } from "@/components/sponsorship/sponsorship-form";
import { SponsorshipList } from "@/components/sponsorship/sponsorship-list";
import { getSponsorships, type Sponsorship } from "@/lib/api";

export default function SponsorshipPage() {
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Sponsorship | null>(null);

  const loadSponsorships = async () => {
    setLoading(true);
    try {
      const data = await getSponsorships();
      setSponsorships(data);
    } catch {
      setSponsorships([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSponsorships();
  }, []);

  // Filter by selected date if any
  const filteredSponsorships = useMemo(() => {
    if (!selectedDate) return sponsorships;
    return sponsorships.filter((s) => {
      const start = new Date(s.start_date);
      const deadline = new Date(s.deadline);
      const dayStart = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate()
      );
      const sStart = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate()
      );
      const sEnd = new Date(
        deadline.getFullYear(),
        deadline.getMonth(),
        deadline.getDate()
      );
      return dayStart >= sStart && dayStart <= sEnd;
    });
  }, [sponsorships, selectedDate]);

  const handleEdit = (s: Sponsorship) => {
    setEditItem(s);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditItem(null);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6 md:p-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">협찬 일정</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            협찬 일정을 캘린더로 관리하고 마감일을 확인하세요
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={loadSponsorships}>
            <RefreshCw
              className={`size-4 ${loading ? "animate-spin" : ""}`}
            />
          </Button>
          <Button className="gap-1.5" onClick={() => setFormOpen(true)}>
            <Plus className="size-4" />
            새 협찬 등록
          </Button>
        </div>
      </motion.div>

      {/* Calendar + selected date info */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
        <CalendarView
          sponsorships={sponsorships}
          selectedDate={selectedDate}
          onSelectDate={(d) => {
            // Toggle off if clicking same date
            if (selectedDate && isSameDay(d, selectedDate)) {
              setSelectedDate(null);
            } else {
              setSelectedDate(d);
            }
          }}
        />
      </motion.div>

      {/* Selected date label */}
      {selectedDate && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2"
        >
          <span className="text-sm text-muted-foreground">
            {selectedDate.getFullYear()}년 {selectedDate.getMonth() + 1}월{" "}
            {selectedDate.getDate()}일의 협찬
          </span>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setSelectedDate(null)}
          >
            전체 보기
          </Button>
        </motion.div>
      )}

      {/* List */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
      >
        <h2 className="mb-4 text-lg font-semibold">
          {selectedDate ? "선택된 날짜의 협찬" : "전체 협찬 목록"}
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {filteredSponsorships.length}건
          </span>
        </h2>
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-xl bg-muted"
              />
            ))}
          </div>
        ) : (
          <SponsorshipList
            sponsorships={filteredSponsorships}
            onEdit={handleEdit}
            onRefresh={loadSponsorships}
          />
        )}
      </motion.div>

      {/* Form dialog */}
      <SponsorshipForm
        open={formOpen}
        onOpenChange={handleFormClose}
        editItem={editItem}
        onSuccess={loadSponsorships}
      />
    </div>
  );
}
