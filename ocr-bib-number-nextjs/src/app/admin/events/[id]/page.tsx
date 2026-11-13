import React from 'react';
import { Event, Photo } from 'src/types';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import UploadPhotoZone from 'src/components/admin/UploadPhotoZone';
import EventBundlePriceInput from 'src/components/admin/EventBundlePriceInput';
import { getEventById } from 'src/services/eventService';
import { getGalleryPhotos } from 'src/services/photoService';
import EventGallerySection from 'src/components/admin/EventGallerySection';
import EditEventModal from 'src/components/admin/EditEventModal';
import { LayoutDashboard, MapPin, Calendar, ChevronRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
}

async function getEventData(id: number): Promise<{ event: Event | null; photos: any[] }> {
  try {
    const event = await getEventById(id);
    if (!event) {
      return { event: null, photos: [] };
    }

    const photos = await getGalleryPhotos(id);

    return {
      event,
      photos,
    };
  } catch (err) {
    console.error('Error fetching event detail data:', err);
    return { event: null, photos: [] };
  }
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const resolvedParams = await params;
  const eventId = parseInt(resolvedParams.id, 10);

  if (isNaN(eventId)) {
    return notFound();
  }

  const { event, photos } = await getEventData(eventId);

  if (!event) {
    return notFound();
  }

  return (
    <div className="space-y-10">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-400 font-medium text-left">
        <Link
          href="/admin"
          className="flex items-center gap-1.5 hover:text-slate-900 transition-colors"
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          Dashboard
        </Link>

        <ChevronRight className="h-3 w-3" />

        <Link
          href="/admin/events"
          className="hover:text-slate-900 transition-colors"
        >
          Kelola Event
        </Link>

        <ChevronRight className="h-3 w-3" />

        <span className="font-semibold text-slate-800 truncate">
          {event.name}
        </span>
      </nav>

      {/* HERO SECTION */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.02)]">

        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/40 via-transparent to-transparent pointer-events-none" />

        <div className="relative p-6 md:p-8">

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">

            <div className="space-y-5">

              <div className="flex items-center gap-3">
                <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-100">
                  Event Management
                </span>
                <EditEventModal event={event} />
              </div>

              <div>
                <h1 className="text-4xl font-bold tracking-tight text-slate-900">
                  {event.name}
                </h1>

                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-600">

                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    {event.location || 'Lokasi tidak tersedia'}
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    {new Date(event.event_date).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>

                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 max-w-md">

                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Photos
                  </p>

                  <p className="mt-1 text-2xl font-black text-slate-900">
                    {photos.length}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Bundle Price
                  </p>

                  <p className="mt-1 text-lg font-bold text-blue-600">
                    {event.bundle_price
                      ? `Rp ${Number(event.bundle_price).toLocaleString('id-ID')}`
                      : 'Default'}
                  </p>
                </div>

              </div>
            </div>

            <div className="w-full lg:w-[380px]">
              <UploadPhotoZone eventId={eventId} />
            </div>

          </div>

        </div>
      </div>

      {/* SETTINGS */}
      <div className="rounded-3xl border border-slate-200/60 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.02)] text-left">

        <div className="border-b border-slate-100/80 px-6 py-4">
          <h2 className="font-bold text-slate-900 text-sm">
            Event Settings
          </h2>

          <p className="text-xs text-slate-400 mt-1">
            Configure pricing and event options.
          </p>
        </div>

        <div className="p-6">
          <EventBundlePriceInput
            eventId={eventId}
            initialBundlePrice={event.bundle_price}
          />
        </div>
      </div>

      {/* GALLERY SECTION (with grouping controls) */}
      <EventGallerySection photos={photos} eventId={eventId} />

    </div>
  );
}