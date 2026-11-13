import { NextRequest, NextResponse } from 'next/server';
import { getSettings, updateSetting } from 'src/services/settingsService';

function isAdmin(req: NextRequest): boolean {
  const sessionCookie = req.cookies.get('admin_session');
  return !!sessionCookie;
}

// GET: Ambil daftar semua pengaturan
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const config = await getSettings();
    return NextResponse.json(config);
  } catch (error: any) {
    console.error('Failed to get settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings: ' + error.message },
      { status: 550 }
    );
  }
}

// POST: Perbarui nilai pengaturan
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { key, value } = await req.json();

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'Key and value parameters are required' },
        { status: 400 }
      );
    }

    // Insert atau update pengaturan di database menggunakan UPSERT
    await updateSetting(key, value.toString());

    console.log(`⚙️ Config updated - Key: ${key}, New Value: ${value}`);
    return NextResponse.json({ success: true, key, value });
  } catch (error: any) {
    console.error('Failed to save setting:', error);
    return NextResponse.json(
      { error: 'Failed to save setting: ' + error.message },
      { status: 550 }
    );
  }
}
