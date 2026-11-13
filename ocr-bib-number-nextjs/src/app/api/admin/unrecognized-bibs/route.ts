import { NextRequest, NextResponse } from 'next/server';
import { 
  getPendingUnrecognizedBibs, 
  getUnrecognizedBibById, 
  acceptUnrecognizedBib, 
  rejectUnrecognizedBib 
} from 'src/services/unrecognizedBibsService';

// Helper to check admin session
function isAdmin(req: NextRequest): boolean {
  const sessionCookie = req.cookies.get('admin_session');
  return !!sessionCookie;
}

// GET: List all pending unrecognized bibs for moderation
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const items = await getPendingUnrecognizedBibs();

    return NextResponse.json({
      success: true,
      items,
    });
  } catch (error: any) {
    console.error('GET Unrecognized BIBs Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch unrecognized bibs: ' + error.message },
      { status: 500 }
    );
  }
}

// POST: Accept or Reject moderation action
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, action, edited_number } = await req.json();

    if (!id || !action || !['accept', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid parameters. id, action ("accept" or "reject") are required' },
        { status: 400 }
      );
    }

    // 1. Ambil detail unrecognized_bib dan event_id
    const record = await getUnrecognizedBibById(id);

    if (!record) {
      return NextResponse.json(
        { error: 'Unrecognized BIB record not found' },
        { status: 404 }
      );
    }

    const finalNumber = (edited_number || record.suggested_number).toString().trim();

    if (action === 'accept') {
      if (!finalNumber) {
        return NextResponse.json({ error: 'BIB number cannot be empty' }, { status: 400 });
      }

      await acceptUnrecognizedBib(id, finalNumber, record.photo_id, record.event_id);
      console.log(`✅ Unrecognized BIB #${id} ACCEPTED as BIB #${finalNumber} for Photo #${record.photo_id}`);
    } else {
      // action === 'reject'
      await rejectUnrecognizedBib(id);
      console.log(`❌ Unrecognized BIB #${id} REJECTED`);
    }

    return NextResponse.json({
      success: true,
      message: `BIB has been successfully ${action}ed`,
    });

  } catch (error: any) {
    console.error('POST Unrecognized Action Error:', error);
    return NextResponse.json(
      { error: 'Failed to process moderation action: ' + error.message },
      { status: 500 }
    );
  }
}
