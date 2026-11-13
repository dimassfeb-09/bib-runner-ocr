import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Buat response redirect ke halaman login admin
  const response = NextResponse.redirect(new URL('/admin/login', req.url));
  
  // Hapus cookie session admin
  response.cookies.delete('admin_session');
  
  console.log('🚪 Admin session cleared. Logged out successfully.');
  return response;
}
