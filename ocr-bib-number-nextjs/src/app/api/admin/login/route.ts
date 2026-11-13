import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword } from 'src/lib/auth';
import { getAdminByUsername } from 'src/services/authService';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Cari admin di database
    const admin = await getAdminByUsername(username);

    if (!admin || !verifyPassword(password, admin.password_hash)) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Login Sukses. Buat response & set cookie session.
    // Di aplikasi produksi, gunakan JWT token yang di-sign secara aman.
    const response = NextResponse.json(
      { success: true, message: 'Login successful' },
      { status: 200 }
    );

    // Set HTTP-Only Cookie untuk session
    response.cookies.set({
      name: 'admin_session',
      value: JSON.stringify({ id: admin.id, username: admin.username }),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 1 hari
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
