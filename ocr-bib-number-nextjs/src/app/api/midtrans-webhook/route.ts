import { NextRequest, NextResponse } from 'next/server';
import { sendDownloadLink } from 'src/lib/mailer';
import crypto from 'crypto';
import { updatePaymentStatus } from 'src/services/orderService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Received Midtrans Webhook:', body);

    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
    } = body;

    // 1. Verifikasi Signature secara manual (Keamanan)
    const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
    const rawSignatureString = `${order_id}${status_code}${gross_amount}${serverKey}`;
    const hashedSignature = crypto
      .createHash('sha512')
      .update(rawSignatureString)
      .digest('hex');

    if (hashedSignature !== signature_key) {
      console.warn('❌ Invalid Midtrans Signature. Potential fraud attempt.');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log(`✅ Webhook signature verified for Order: ${order_id}`);

    // 2. Tentukan status pembayaran
    let mappedStatus = 'pending';
    if (
      transaction_status === 'capture' ||
      transaction_status === 'settlement'
    ) {
      mappedStatus = 'settlement';
    } else if (
      transaction_status === 'deny' ||
      transaction_status === 'cancel' ||
      transaction_status === 'expire'
    ) {
      mappedStatus = transaction_status;
    }

    // 3. Update status pembayaran di database
    const order = await updatePaymentStatus(order_id, mappedStatus);

    if (!order) {
      console.error(`❌ Order ${order_id} not found in database.`);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 4. Jika sukses (settlement), kirim email magic download link ke pembeli
    if (mappedStatus === 'settlement') {
      console.log(`🎉 Order ${order_id} SUCCESS. Sending magic link email...`);
      await sendDownloadLink(
        order.buyer_email,
        order.download_token,
        order.id
      );
    }

    return NextResponse.json({ success: true, status: mappedStatus });
  } catch (error: any) {
    console.error('Midtrans Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
