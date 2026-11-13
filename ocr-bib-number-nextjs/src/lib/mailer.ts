import nodemailer from 'nodemailer';

const gmailUser = process.env.GMAIL_USER;
const gmailPass = process.env.GMAIL_PASS;

// Inisialisasi SMTP Transporter menggunakan Gmail
export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: gmailUser,
    pass: gmailPass,
  },
});

/**
 * Mengirim email berisi magic link download ke pembeli (Guest)
 * @param toEmail Email pembeli
 * @param downloadToken Token UUID pembelian
 * @param orderId ID order dari sistem / Midtrans
 */
export async function sendDownloadLink(
  toEmail: string,
  downloadToken: string,
  orderId: string
) {
  // Ambil BASE URL web dari env, default ke localhost jika tidak diset
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const downloadUrl = `${baseUrl}/download/${downloadToken}`;

  const mailOptions = {
    from: `"Foto in Aja Support" <${gmailUser}>`,
    to: toEmail,
    subject: `🏃‍♂️ [Foto in Aja] Pembayaran Sukses! Foto Lari Anda Siap Diunduh`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; color: #1a202c;">
        <h2 style="color: #2b6cb0; text-align: center; margin-bottom: 24px;">Terima Kasih Atas Pembelian Anda! 🏃‍♀️⚡</h2>
        
        <p>Halo,</p>
        <p>Pembayaran untuk pesanan Anda dengan Order ID <strong>${orderId}</strong> telah berhasil dikonfirmasi oleh sistem kami.</p>
        <p>Anda sekarang dapat mengakses dan mengunduh foto-foto resolusi tinggi tanpa watermark milik Anda kapan saja dengan mengeklik tombol di bawah ini:</p>
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="${downloadUrl}" style="background-color: #3182ce; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px -1px rgba(49, 130, 206, 0.4);">
            Download Foto Saya
          </a>
        </div>
        
        <p style="font-size: 13px; color: #718096; line-height: 1.6;">
          ⚠️ <strong>Catatan Keamanan:</strong> Jangan bagikan link di atas ke orang lain. Siapapun yang memiliki link tersebut dapat melihat dan mendownload foto yang Anda beli.
        </p>
        
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        
        <p style="font-size: 12px; color: #a0aec0; text-align: center; margin-top: 24px;">
          Jika tombol tidak berfungsi, salin dan tempel URL berikut ke browser Anda:<br>
          <a href="${downloadUrl}" style="color: #3182ce;">${downloadUrl}</a>
        </p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ Email download link dikirim ke ${toEmail}. MessageId: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('❌ Gagal mengirim email download link:', error);
    throw error;
  }
}

/**
 * Mengirim email berisi tagihan pembayaran (invoice) dan link pembayaran Midtrans ke pembeli
 * @param toEmail Email pembeli
 * @param orderId ID order dari sistem
 * @param paymentUrl URL pembayaran Midtrans (redirect_url)
 * @param items List item yang dibeli
 * @param totalAmount Total nominal yang harus dibayar
 */
export async function sendPaymentInvoice(
  toEmail: string,
  orderId: string,
  paymentUrl: string,
  items: { name: string; price: number; quantity: number }[],
  totalAmount: number
) {
  const formattedTotal = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(totalAmount);

  // Batas kedaluwarsa 24 jam (default Midtrans)
  const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  }) + ' WIB';
  const expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const itemsHtml = items.map(item => `
    <tr style="border-bottom: 1px solid #edf2f7;">
      <td style="padding: 12px 0; font-size: 14px; color: #4a5568;">${item.name}</td>
      <td style="padding: 12px 0; font-size: 14px; color: #4a5568; text-align: right;">
        ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.price)}
      </td>
    </tr>
  `).join('');

  const mailOptions = {
    from: `"Foto in Aja Billing" <${gmailUser}>`,
    to: toEmail,
    subject: `⚡ [Foto in Aja] Tagihan Pembayaran #${orderId}`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; color: #2d3748; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <!-- Header / Logo -->
        <div style="text-align: center; border-bottom: 2px solid #ebf8ff; padding-bottom: 20px; margin-bottom: 24px;">
          <h2 style="color: #3182ce; margin: 0; font-size: 24px;">Foto in Aja</h2>
          <p style="color: #718096; margin: 4px 0 0 0; font-size: 14px;">Tagihan Pembayaran Anda</p>
        </div>

        <p>Halo,</p>
        <p>Terima kasih telah memilih foto lari Anda! Transaksi baru telah dibuat dengan detail di bawah ini. Silakan selesaikan pembayaran sebelum masa berlaku habis.</p>

        <!-- Box Informasi Tagihan -->
        <div style="background: linear-gradient(135deg, #ebf8ff 0%, #e6fffa 100%); border: 1px solid #bee3f8; border-radius: 8px; padding: 16px; margin: 24px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="color: #4a5568; padding: 4px 0;"><strong>No. Tagihan:</strong></td>
              <td style="text-align: right; color: #2d3748; padding: 4px 0;"><strong>${orderId}</strong></td>
            </tr>
            <tr>
              <td style="color: #4a5568; padding: 4px 0;"><strong>Total Pembayaran:</strong></td>
              <td style="text-align: right; color: #e53e3e; font-size: 16px; font-weight: bold; padding: 4px 0;">${formattedTotal}</td>
            </tr>
            <tr>
              <td style="color: #4a5568; padding: 4px 0;"><strong>Batas Waktu:</strong></td>
              <td style="text-align: right; color: #dd6b20; font-weight: bold; padding: 4px 0;">${expiryDate}, ${expiryTime} (24 Jam)</td>
            </tr>
          </table>
        </div>

        <!-- Rincian Item -->
        <h3 style="color: #2d3748; font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px;">Rincian Pembelian</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <thead>
            <tr style="border-bottom: 2px solid #e2e8f0;">
              <th style="text-align: left; padding-bottom: 8px; font-size: 12px; color: #718096; text-transform: uppercase;">Item</th>
              <th style="text-align: right; padding-bottom: 8px; font-size: 12px; color: #718096; text-transform: uppercase;">Harga</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <!-- Tombol Bayar -->
        <div style="text-align: center; margin: 36px 0 20px 0;">
          <a href="${paymentUrl}" style="background-color: #3182ce; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 10px rgba(49, 130, 206, 0.3);">
            Lanjutkan Pembayaran
          </a>
        </div>
        <p style="text-align: center; font-size: 12px; color: #718096; margin-top: 0;">
          (Mendukung QRIS, GoPay, OVO, Virtual Account, & Transfer Bank)
        </p>

        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0 20px 0;" />
        
        <p style="font-size: 12px; color: #a0aec0; text-align: center; line-height: 1.5;">
          Email ini dikirim secara otomatis oleh sistem kami. Jika Anda sudah melakukan pembayaran, Anda akan menerima email kedua berisi tautan unduhan foto Anda.<br>
          <br>
          Butuh bantuan? Silakan hubungi kami di <a href="mailto:${gmailUser}" style="color: #3182ce; text-decoration: none;">${gmailUser}</a>
        </p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ Email tagihan (invoice) dikirim ke ${toEmail}. MessageId: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('❌ Gagal mengirim email tagihan:', error);
  }
}
