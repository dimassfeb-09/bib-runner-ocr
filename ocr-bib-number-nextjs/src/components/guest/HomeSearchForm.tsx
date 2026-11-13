"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Event } from "src/types";
import { Search, Calendar, Hash } from "lucide-react";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/components/ui/select";

interface HomeSearchFormProps {
  events: Event[];
}

export default function HomeSearchForm({
  events,
}: HomeSearchFormProps) {
  const router = useRouter();

  const [selectedEventId, setSelectedEventId] = useState(
    events[0]?.id.toString() || ""
  );

  const [bibNumber, setBibNumber] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEventId || !bibNumber.trim()) return;

    router.push(
      `/search?event_id=${selectedEventId}&bib_number=${encodeURIComponent(
        bibNumber.trim()
      )}`
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-6xl mx-auto bg-white border border-slate-200 rounded-3xl p-6 shadow-sm"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-end">
        {/* EVENT */}
        <div className="lg:col-span-7">
          <label className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <Calendar className="h-3.5 w-3.5" />
            Pilih Kompetisi
          </label>

          <Select
            value={selectedEventId}
            onValueChange={setSelectedEventId}
          >
            <SelectTrigger className="h-12 w-full rounded-xl border-slate-200 bg-slate-50">
              <SelectValue placeholder="Pilih Event" />
            </SelectTrigger>

            <SelectContent>
              {events.length === 0 ? (
                <SelectItem value="none" disabled>
                  Belum ada event aktif
                </SelectItem>
              ) : (
                events.map((event) => (
                  <SelectItem
                    key={event.id}
                    value={event.id.toString()}
                  >
                    {event.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* BIB */}
        <div className="lg:col-span-3">
          <label className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <Hash className="h-3.5 w-3.5" />
            Nomor Dada (BIB)
          </label>

          <Input
            type="text"
            value={bibNumber}
            onChange={(e) => setBibNumber(e.target.value)}
            placeholder="Contoh: 1002"
            className="h-12 rounded-xl border-slate-200 bg-slate-50"
            required
          />
        </div>

        {/* BUTTON */}
        <div className="lg:col-span-2">
          {/* spacer supaya sejajar dengan input */}
          <div className="mb-[24px] lg:block hidden" />

          <Button
            type="submit"
            className="h-12 w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            <Search className="mr-2 h-4 w-4" />
            Mulai Cari
          </Button>
        </div>
      </div>
    </form>
  );
}