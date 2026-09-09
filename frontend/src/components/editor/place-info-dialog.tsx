"use client";

import { useState } from "react";
import { Search, MapPin, Phone, Clock, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { searchPlaces, type Place } from "@/lib/api";

interface PlaceInfoDialogProps {
  onInsert: (html: string) => void;
  children: React.ReactNode;
}

export function PlaceInfoDialog({ onInsert, children }: PlaceInfoDialogProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await searchPlaces(query.trim());
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (place: Place) => {
    const html = `
      <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin: 16px 0; background: #fafafa;">
        <h3 style="margin: 0 0 8px; font-size: 16px; font-weight: 600;">${place.name}</h3>
        ${place.address ? `<p style="margin: 4px 0; font-size: 14px; color: #6b7280;"><strong>주소:</strong> ${place.address}</p>` : ""}
        ${place.phone ? `<p style="margin: 4px 0; font-size: 14px; color: #6b7280;"><strong>전화:</strong> ${place.phone}</p>` : ""}
        ${place.open_hours ? `<p style="margin: 4px 0; font-size: 14px; color: #6b7280;"><strong>영업시간:</strong> ${place.open_hours}</p>` : ""}
        ${place.category ? `<p style="margin: 4px 0; font-size: 14px; color: #6b7280;"><strong>카테고리:</strong> ${place.category}</p>` : ""}
      </div>
    `.trim();
    onInsert(html);
    setOpen(false);
    setQuery("");
    setResults([]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<span />}>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>가게 정보 추가</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="가게 이름을 검색하세요"
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={loading} size="default">
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Search className="size-4" />
            )}
          </Button>
        </div>

        <div className="max-h-[300px] space-y-2 overflow-y-auto">
          {results.map((place, i) => (
            <Card
              key={`${place.name}-${i}`}
              className="cursor-pointer transition-shadow hover:ring-2 hover:ring-primary/20"
              onClick={() => handleSelect(place)}
            >
              <CardContent className="space-y-1 p-3">
                <p className="text-sm font-semibold">{place.name}</p>
                {place.address && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="size-3 shrink-0" />
                    {place.address}
                  </p>
                )}
                {place.phone && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="size-3 shrink-0" />
                    {place.phone}
                  </p>
                )}
                {place.open_hours && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="size-3 shrink-0" />
                    {place.open_hours}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
          {results.length === 0 && !loading && query && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              검색 결과가 없습니다
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
