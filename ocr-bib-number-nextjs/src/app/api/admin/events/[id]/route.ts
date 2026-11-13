import { NextRequest, NextResponse } from 'next/server';
import { updateEventBundlePrice, updateEvent } from 'src/services/eventService';

function isAdmin(req: NextRequest): boolean {
  const sessionCookie = req.cookies.get('admin_session');
  return !!sessionCookie;
}

// PATCH: Perbarui detail event (seperti bundle_price atau detail acara)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resolvedParams = await params;
  const eventId = parseInt(resolvedParams.id, 10);
  if (isNaN(eventId)) {
    return NextResponse.json({ error: 'Invalid Event ID' }, { status: 400 });
  }

  try {
    const { name, event_date, location, bundle_price } = await req.json();

    // Jika parameter penamaan dikirimkan, lakukan update detail event
    if (name !== undefined || event_date !== undefined || location !== undefined) {
      if (!name || !event_date) {
        return NextResponse.json(
          { error: 'Nama event dan Tanggal event wajib diisi.' },
          { status: 400 }
        );
      }
      
      const event = await updateEvent(eventId, name, event_date, location);
      if (!event) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, event });
    }

    // Alur lama untuk bundle_price
    let finalBundlePrice: number | null = null;
    if (bundle_price !== undefined && bundle_price !== null && bundle_price !== '') {
      finalBundlePrice = parseFloat(bundle_price);
      if (isNaN(finalBundlePrice) || finalBundlePrice < 0) {
        return NextResponse.json(
          { error: 'Harga bundling harus berupa angka positif yang valid.' },
          { status: 400 }
        );
      }
    }

    const event = await updateEventBundlePrice(eventId, finalBundlePrice);

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, event });
  } catch (error: any) {
    console.error('Failed to update event:', error);
    return NextResponse.json(
      { error: 'Failed to update event: ' + error.message },
      { status: 500 }
    );
  }
}

