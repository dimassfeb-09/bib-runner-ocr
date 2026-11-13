import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSettings } from 'src/services/settingsService';
import { getPhotosByIds, getPhotoBibMappings, getAllBibPhotosInEvent } from 'src/services/photoService';
import { getEventById, getBibPrice } from 'src/services/eventService';
import { createOrder } from 'src/services/orderService';
import { sendPaymentInvoice } from 'src/lib/mailer';

export async function POST(req: NextRequest) {
  try {
    const { email, photo_ids } = await req.json();

    if (!email || !photo_ids || !Array.isArray(photo_ids) || photo_ids.length === 0) {
      return NextResponse.json(
        { error: 'Email and photo_ids are required' },
        { status: 400 }
      );
    }

    // 0. Fetch global default settings
    const settingsMap = await getSettings();

    const defaultPhotoPrice = parseFloat(settingsMap['photo_price'] || '50000');
    const defaultBundlePrice = parseFloat(settingsMap['default_bundle_price'] || '100000');

    // 1. Fetch details of all purchased photos
    const photosFromDb = await getPhotosByIds(photo_ids);

    if (photosFromDb.length === 0) {
      return NextResponse.json(
        { error: 'No valid photos found for checkout' },
        { status: 400 }
      );
    }

    // 2. Fetch BIB mapping for these photos to identify bundling qualification
    const bibsFromDb = await getPhotoBibMappings(photo_ids);

    // Identify unique event_id + bib_number pairs present in the checkout items
    const eventBibPairs: { eventId: number; bibNumber: string }[] = [];
    const seenPairs = new Set<string>();

    bibsFromDb.forEach((row) => {
      const key = `${row.event_id}:${row.bib_number}`;
      if (!seenPairs.has(key)) {
        seenPairs.add(key);
        eventBibPairs.push({ eventId: row.event_id, bibNumber: row.bib_number });
      }
    });

    const bundledPhotoIds = new Set<number>();
    const bundleAppliedDetails: { eventId: number; bibNumber: string; price: number; photosCount: number }[] = [];

    // For each BIB found, check if the user is purchasing ALL photos associated with that BIB in the event
    for (const { eventId, bibNumber } of eventBibPairs) {
      const allBibPhotoIds = await getAllBibPhotosInEvent(eventId, bibNumber);

      // Only bundle if there's more than 1 photo total for this BIB
      if (allBibPhotoIds.length > 1) {
        const customerHasAll = allBibPhotoIds.every((id) => photo_ids.includes(id));
        if (customerHasAll) {
          // Mark all these photos as bundled
          allBibPhotoIds.forEach((id) => bundledPhotoIds.add(id));

          // Fetch custom bib bundle price, event bundle price, or fallback to default bundle price
          const customBibPrice = await getBibPrice(eventId, bibNumber);
          
          let appliedPrice = defaultBundlePrice;
          if (customBibPrice !== null) {
            appliedPrice = customBibPrice;
          } else {
            const event = await getEventById(eventId);
            if (event && event.bundle_price !== null) {
              appliedPrice = parseFloat(event.bundle_price as string);
            }
          }

          bundleAppliedDetails.push({
            eventId,
            bibNumber,
            price: appliedPrice,
            photosCount: allBibPhotoIds.length,
          });
        }
      }
    }

    // 3. Calculate total cost and compile Midtrans item list
    let totalAmount = 0;
    const itemDetails: any[] = [];

    // Add applied bundles
    bundleAppliedDetails.forEach((bundle) => {
      totalAmount += bundle.price;
      itemDetails.push({
        id: `BUNDLE-${bundle.eventId}-${bundle.bibNumber}`,
        price: bundle.price,
        quantity: 1,
        name: `Paket Hemat BIB #${bundle.bibNumber}`,
      });
    });

    // Add non-bundled photos
    photosFromDb.forEach((photo) => {
      if (!bundledPhotoIds.has(photo.id)) {
        const individualPrice = photo.price !== null && photo.price !== undefined
          ? parseFloat(photo.price as string)
          : defaultPhotoPrice;

        totalAmount += individualPrice;
        itemDetails.push({
          id: `PHOTO-${photo.id}`,
          price: individualPrice,
          quantity: 1,
          name: `Foto Lari #${photo.id}`,
        });
      }
    });
    
    // Generate unique Order ID
    const orderId = `BIB-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // 4. Save order to database (Status: pending)
    const order = await createOrder(orderId, email, totalAmount, photo_ids);

    // 5. Request Snap Token from Midtrans
    const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
    
    // Dynamically choose Midtrans API URL based on Server Key prefix (starts with 'SB-' for sandbox)
    const isSandbox = serverKey.startsWith('SB-');
    const midtransSnapUrl = isSandbox
      ? 'https://app.sandbox.midtrans.com/snap/v1/transactions'
      : 'https://app.midtrans.com/snap/v1/transactions';

    console.log(`[Midtrans] Creating transaction. Environment: ${isSandbox ? 'SANDBOX' : 'PRODUCTION'}`);

    // Basic Auth header
    const authHeader = `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`;

    // Gunakan NEXT_PUBLIC_APP_URL sebagai base URL untuk callback redirect;
    // fallback ke req.nextUrl.origin jika env var tidak tersedia.
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

    const midtransResponse = await fetch(midtransSnapUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: orderId,
          gross_amount: totalAmount,
        },
        customer_details: {
          email: email,
        },
        item_details: itemDetails,
        expiry: {
          unit: 'hour',
          duration: 24
        },
        callbacks: {
          finish: `${baseUrl}/download/${order.download_token}`,
          unfinish: `${baseUrl}/download/${order.download_token}`,
          error: `${baseUrl}/download/${order.download_token}`
        }
      }),
    });

    if (!midtransResponse.ok) {
      const errorText = await midtransResponse.text();
      console.error('Midtrans API Error Response:', errorText);
      throw new Error('Failed to create Midtrans transaction');
    }

    const midtransData = await midtransResponse.json();

    // Kirim email tagihan / invoice pembayaran (secara asinkron / non-blocking)
    sendPaymentInvoice(email, orderId, midtransData.redirect_url, itemDetails, totalAmount)
      .catch((err) => console.error('Gagal mengirim email tagihan:', err));

    // Return SNAP token and redirect URL
    return NextResponse.json({
      token: midtransData.token,
      redirect_url: midtransData.redirect_url,
      order_id: orderId,
    });

  } catch (error: any) {
    console.error('Checkout API error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 550 }
    );
  }
}
