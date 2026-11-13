import { NextRequest, NextResponse } from 'next/server';
import { getAllEvents, createEvent } from 'src/services/eventService';

// Helper untuk mengecek apakah user login sebagai admin
function isAdmin(req: NextRequest): boolean {
  const sessionCookie = req.cookies.get('admin_session');
  return !!sessionCookie;
}

// 1. AMBIL DAFTAR EVENT
export async function GET(req: NextRequest) {
  try {
    const events = await getAllEvents();
    return NextResponse.json(events);
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 550 }
    );
  }
}

// 2. BUAT EVENT BARU (Hanya Admin)
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, event_date, location } = await req.json();

    if (!name || !event_date) {
      return NextResponse.json(
        { error: 'Event name and date are required' },
        { status: 400 }
      );
    }

    const event = await createEvent(name, event_date, location);

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error('Failed to create event:', error);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 550 }
    );
  }
}
