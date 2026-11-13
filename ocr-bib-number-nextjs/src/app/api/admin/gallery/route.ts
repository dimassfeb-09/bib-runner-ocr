import { NextRequest, NextResponse } from 'next/server';
import { getGalleryPhotos } from 'src/services/photoService';

// Helper to check admin session
function isAdmin(req: NextRequest): boolean {
  const sessionCookie = req.cookies.get('admin_session');
  return !!sessionCookie;
}

// GET: Retrieve photos for a specific event with optional bib filter, limit, and offset
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const eventIdStr = searchParams.get('event_id');
    const bibNumber = searchParams.get('bib_number') || undefined;
    const limitStr = searchParams.get('limit');
    const offsetStr = searchParams.get('offset');

    if (!eventIdStr) {
      return NextResponse.json({ error: 'event_id parameter is required' }, { status: 400 });
    }

    const eventId = parseInt(eventIdStr, 10);
    if (isNaN(eventId)) {
      return NextResponse.json({ error: 'Invalid event_id' }, { status: 400 });
    }

    const limit = limitStr ? parseInt(limitStr, 10) : 12;
    const offset = offsetStr ? parseInt(offsetStr, 10) : 0;

    const photos = await getGalleryPhotos(
      eventId,
      bibNumber,
      isNaN(limit) ? 12 : limit,
      isNaN(offset) ? 0 : offset
    );

    return NextResponse.json({
      success: true,
      photos,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET admin/gallery API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gallery photos: ' + errorMessage },
      { status: 500 }
    );
  }
}
