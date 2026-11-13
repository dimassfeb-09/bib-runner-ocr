import React from "react";
import RunnerPortal from "src/components/guest/RunnerPortal";
import { getAllEvents } from "src/services/eventService";
import { Event } from "src/types";

export const dynamic = "force-dynamic";

interface SearchPageProps {
  searchParams: Promise<{
    event_id?: string;
    bib_number?: string;
  }>;
}

async function getActiveEvents(): Promise<Event[]> {
  try {
    return await getAllEvents();
  } catch (error) {
    console.error(error);
    return [];
  }
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedParams = await searchParams;
  const events = await getActiveEvents();

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <RunnerPortal
        initialEvents={events}
        defaultEventId={resolvedParams.event_id}
        defaultBibNumber={resolvedParams.bib_number}
      />
    </div>
  );
}
