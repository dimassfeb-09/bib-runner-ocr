import { NextRequest, NextResponse } from 'next/server';
import { getSettings } from 'src/services/settingsService';
import { getEventById, getBibPrice } from 'src/services/eventService';
import { searchPhotosByBib, getPhotosByEvent } from 'src/services/photoService';

// In-memory cache for search results to reduce DB load
interface CacheEntry {
  data: any;
  expiry: number;
}
const searchCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30000; // Cache for 30 seconds

export function invalidateSearchCache(eventId?: number) {
  if (eventId !== undefined) {
    for (const key of searchCache.keys()) {
      if (key.startsWith(`${eventId}_`)) {
        searchCache.delete(key);
      }
    }
  } else {
    searchCache.clear();
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventIdStr = searchParams.get('event_id');
    const bibNumber = searchParams.get('bib_number')?.trim();

    if (!eventIdStr) {
      return NextResponse.json(
        { error: 'event_id parameter is required' },
        { status: 400 }
      );
    }

    const eventId = parseInt(eventIdStr, 10);
    if (isNaN(eventId)) {
      return NextResponse.json({ error: 'Invalid event_id' }, { status: 400 });
    }

    // Check Cache
    const cacheKey = `${eventId}_${bibNumber || 'all'}`;
    const cached = searchCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return NextResponse.json(cached.data);
    }

    // Fetch global default settings
    const settingsMap = await getSettings();

    const defaultPhotoPrice = parseFloat(settingsMap['photo_price'] || '50000');
    const defaultBundlePrice = parseFloat(settingsMap['default_bundle_price'] || '100000');

    // Fetch event bundle price config
    const event = await getEventById(eventId);
    let eventBundlePrice = defaultBundlePrice;
    if (event && event.bundle_price !== null) {
      eventBundlePrice = parseFloat(event.bundle_price as string);
    }

    // Fetch custom BIB price if bibNumber is searched
    let customBibPrice: number | null = null;
    if (bibNumber) {
      customBibPrice = await getBibPrice(eventId, bibNumber);
    }

    const finalBundlePrice = customBibPrice !== null ? customBibPrice : eventBundlePrice;

    let photos: any[] = [];

    if (bibNumber) {
      // Jika nomor bib diisi, lakukan query filter relasi Many-to-Many
      photos = await searchPhotosByBib(eventId, bibNumber);
    } else {
      // Jika nomor bib kosong, kembalikan seluruh foto di event tersebut (untuk browsing manual)
      photos = await getPhotosByEvent(eventId);
    }

    // Map photo price with fallback to defaultPhotoPrice
    const mappedPhotos = photos.map((photo) => ({
      ...photo,
      price: photo.price !== null && photo.price !== undefined ? parseFloat(photo.price) : defaultPhotoPrice,
    }));

    const responseData = {
      success: true,
      photosCount: mappedPhotos.length,
      photos: mappedPhotos,
      bundlePrice: finalBundlePrice,
      defaultPhotoPrice,
    };

    // Store in Cache
    searchCache.set(cacheKey, {
      data: responseData,
      expiry: Date.now() + CACHE_TTL_MS,
    });

    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
