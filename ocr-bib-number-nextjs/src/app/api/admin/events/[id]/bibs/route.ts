import { NextRequest, NextResponse } from 'next/server';
import { updateBibPrice } from 'src/services/eventService';

// Helper to check admin session
function isAdmin(req: NextRequest): boolean {
  const sessionCookie = req.cookies.get('admin_session');
  return !!sessionCookie;
}

// ENDPOINT: UPDATE BIB BUNDLE PRICE (Hanya Admin)
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
    const { bib_number, price } = await req.json();

    if (!bib_number) {
      return NextResponse.json({ error: 'bib_number is required' }, { status: 400 });
    }

    // price can be empty (NULL) or numeric
    let finalPrice: number | null = null;
    if (price !== undefined && price !== null && price !== '') {
      finalPrice = parseFloat(price);
      if (isNaN(finalPrice) || finalPrice < 0) {
        return NextResponse.json(
          { error: 'Harga bundling harus berupa angka positif yang valid.' },
          { status: 400 }
        );
      }
    }

    const success = await updateBibPrice(eventId, bib_number.toString(), finalPrice);

    if (!success) {
      return NextResponse.json({ error: 'BIB number not found in this event' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'BIB bundle price updated successfully' });
  } catch (error: any) {
    console.error('Failed to update BIB bundle price:', error);
    return NextResponse.json(
      { error: 'Failed to update BIB price: ' + error.message },
      { status: 500 }
    );
  }
}
