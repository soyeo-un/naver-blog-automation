"use client";

import { useEffect, useState, useMemo } from "react";
import { isSameDay } from "date-fns";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalendarView } from "@/components/sponsorship/calendar-view";
import { SponsorshipForm } from "@/components/sponsorship/sponsorship-form";
import { SponsorshipList } from "@/components/sponsorship/sponsorship-list";
import { getSponsorships, type Sponsorship } from "@/lib/api";

export function SponsorshipSection() {
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

  const filteredSponsorships = useMemo(() => {
    if (!selectedDate) return sponsorships;
    return sponsorships.filter((s) => {
      const start = new Date(s.start_date);
      const deadline = new Date(s.deadline);
      const dayStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      const sStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const sEnd = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
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
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {filteredSponsorships.length}건
          {selectedDate && (
            <button
              onClick={() => setSelectedDate(null)}
              className="ml-2 text-primary hover:underline"
            >
              전체 보기
            </button>
          )}
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadSponsorships}
            className="h-7 gap-1 px-2 text-xs text-muted-foreground"
          >
            <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button
            size="sm"
            onClick={() => setFormOpen(true)}
            className="h-7 gap-1 px-2.5 text-xs"
          >
            <Plus className="size-3" />
            등록
          </Button>
        </div>
      </div>

      {/* Calendar */}
      <CalendarView
        sponsorships={sponsorships}
        selectedDate={selectedDate}
        onSelectDate={(d) => {
          if (selectedDate && isSameDay(d, selectedDate)) {
            setSelectedDate(null);
          } else {
            setSelectedDate(d);
          }
        }}
      />

      {/* List */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/50" />
          ))}
        </div>
      ) : (
        <SponsorshipList
          sponsorships={filteredSponsorships}
          onEdit={handleEdit}
          onRefresh={loadSponsorships}
        />
      )}

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
