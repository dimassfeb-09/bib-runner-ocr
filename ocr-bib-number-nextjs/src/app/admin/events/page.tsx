import React from "react";
import { Event } from "src/types";
import Link from "next/link";
import CreateEventModal from "src/components/admin/CreateEventModal";
import { Calendar, MapPin } from "lucide-react";
import { getAllEvents } from "src/services/eventService";

export const dynamic = "force-dynamic";

async function getEvents(): Promise<Event[]> {
  try {
    return await getAllEvents();
  } catch (err) {
    console.error("Error fetching events list:", err);
    return [];
  }
}

export default async function AdminEventsPage() {
  const events = await getEvents();

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200/80 pb-6">
        <div className="text-left">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Kelola Event Lari
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Buat event baru, unggah foto pelari dan kelola database foto lari.
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <CreateEventModal />
        </div>
      </div>

      {/* Grid List Event */}
      {events.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200/80">
          <p className="text-slate-600 text-sm font-medium">
            Belum ada event lari yang dibuat.
          </p>
          <p className="text-slate-400 text-xs mt-1">
            Silakan buat event baru untuk mulai mengunggah foto.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] hover:scale-[1.01] hover:shadow-md transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100/50 rounded-lg uppercase tracking-wider">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      {new Date(event.event_date).toLocaleDateString("id-ID", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono font-semibold">
                    ID: #{event.id}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-950 mb-2 line-clamp-1 text-left">
                  {event.name}
                </h3>

                <p className="text-slate-600 text-xs flex items-center gap-1.5 mb-6 text-left">
                  <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <span className="truncate">
                    {event.location || "Lokasi tidak ditentukan"}
                  </span>
                </p>
              </div>

              <div className="border-t border-slate-100 pt-4 mt-2 flex items-center justify-between">
                <Link
                  href={`/admin/events/${event.id}`}
                  className="w-full text-center px-4 h-10 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-semibold transition-all border border-slate-200/50"
                >
                  Kelola Event & Foto
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
