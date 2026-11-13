import { NextRequest, NextResponse } from 'next/server';
import { getOrderById, updatePaymentStatus } from 'src/services/orderService';

export async function POST(req: NextRequest) {
  try {
    const { email, order_id } = await req.json();

    if (!email || !order_id) {
      return NextResponse.json(
        { error: 'Email and order_id are required' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOrderId = order_id.trim().toUpperCase();

    // Cari order di database yang cocok dengan Email & Order ID
    const order = await getOrderById(cleanOrderId);

    if (!order || order.buyer_email.toLowerCase() !== cleanEmail) {
      return NextResponse.json(
        { error: 'Order ID atau Email salah. Data tidak ditemukan.' },
        { status: 404 }
      );
    }

    // Jika pending, lakukan sinkronisasi status langsung dengan Midtrans API (solusi untuk Localhost Webhook)
    if (order.payment_status === 'pending') {
      try {
        const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
        const authHeader = `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`;
        
        // Dynamically choose Midtrans Status API URL based on Server Key prefix (starts with 'SB-' for sandbox)
        const isSandbox = serverKey.startsWith('SB-');
        const statusUrl = isSandbox
          ? `https://api.sandbox.midtrans.com/v2/${order.id}/status`
          : `https://api.midtrans.com/v2/${order.id}/status`;
        
        const midtransRes = await fetch(statusUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': authHeader,
          },
          cache: 'no-store'
        });

        if (midtransRes.ok) {
          const midtransStatus = await midtransRes.json();
          const tStatus = midtransStatus.transaction_status;
          
          if (tStatus === 'settlement' || tStatus === 'capture') {
            await updatePaymentStatus(order.id, 'settlement');
            order.payment_status = 'settlement';
            
            // Kirim email notifikasi link download secara asinkron
            try {
              const { sendDownloadLink } = await import('src/lib/mailer');
              await sendDownloadLink(order.buyer_email, order.download_token, order.id);
            } catch (mailErr) {
              console.error('Gagal mengirim email saat active-sync:', mailErr);
            }
          } else if (['deny', 'cancel', 'expire'].includes(tStatus)) {
            await updatePaymentStatus(order.id, tStatus);
            order.payment_status = tStatus;
          }
        }
      } catch (err) {
        console.error('Error syncing order status in check-order API:', err);
      }
    }

    return NextResponse.json({
      success: true,
      order_id: order.id,
      payment_status: order.payment_status,
      download_token: order.download_token,
      total_amount: order.total_amount,
      created_at: order.created_at,
    });

  } catch (error: any) {
    console.error('Check Order API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
