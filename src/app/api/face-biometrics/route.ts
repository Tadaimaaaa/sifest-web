import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ihpgoxdgdhxnnpppasab.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_oqTxtR39oWOy8sgYSAgWdA_b4NPQ0Rb';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

const DB_SLUG = 'panitia_face_biometrics_db';

// Helper: ambil seluruh data biometrik & sesi dari database
async function getStoredData(): Promise<{ faces: Record<string, any>; sessionStates: Record<string, any> }> {
  try {
    const { data, error } = await supabase
      .from('event_brackets')
      .select('bracket_data')
      .eq('event_slug', DB_SLUG)
      .maybeSingle();

    if (error || !data || !data.bracket_data) {
      return { faces: {}, sessionStates: {} };
    }
    return {
      faces: data.bracket_data.faces || {},
      sessionStates: data.bracket_data.sessionStates || {}
    };
  } catch (e) {
    console.error('getStoredData error:', e);
    return { faces: {}, sessionStates: {} };
  }
}

// Helper: simpan kembali seluruh data ke database
async function saveStoredData(faces: Record<string, any>, sessionStates: Record<string, any>) {
  return await supabase
    .from('event_brackets')
    .upsert({
      event_slug: DB_SLUG,
      bracket_data: { faces, sessionStates },
      updated_at: new Date().toISOString()
    }, { onConflict: 'event_slug' });
}

// GET: Ambil daftar profil wajah & status sesi presensi dari database
export async function GET() {
  try {
    const { faces, sessionStates } = await getStoredData();
    return NextResponse.json({
      success: true,
      count: Object.keys(faces).length,
      faces,
      sessionStates
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Daftarkan wajah ATAU perbarui status sesi presensi
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Mode A: Update Status Sesi (Start / Tutup Sesi)
    if (body.type === 'session_state') {
      const { sessionKey, status, startedAt, closedAt } = body;
      if (!sessionKey) {
        return NextResponse.json({ success: false, message: 'sessionKey is required' }, { status: 400 });
      }

      const { faces, sessionStates } = await getStoredData();
      sessionStates[sessionKey] = {
        sessionKey,
        status: status || 'IDLE',
        startedAt: startedAt || null,
        closedAt: closedAt || null,
        updatedAt: new Date().toISOString()
      };

      const { error } = await saveStoredData(faces, sessionStates);
      if (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Status sesi berhasil disimpan',
        sessionState: sessionStates[sessionKey]
      });
    }

    // Mode B: Simpan Wajah Panitia
    const { userId, name, nim, photo, vector } = body;
    if (!userId) {
      return NextResponse.json({ success: false, message: 'userId is required' }, { status: 400 });
    }

    const { faces, sessionStates } = await getStoredData();
    faces[userId] = {
      userId,
      name: name || '',
      nim: nim || '',
      photo: photo || '',
      vector: Array.isArray(vector) ? vector : [],
      updatedAt: new Date().toISOString()
    };

    const { error } = await saveStoredData(faces, sessionStates);
    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Wajah berhasil disimpan ke database',
      count: Object.keys(faces).length
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Hapus data wajah panitia dari database
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let userId = searchParams.get('userId');

    if (!userId) {
      try {
        const body = await req.json();
        userId = body.userId;
      } catch (e) {}
    }

    if (!userId) {
      return NextResponse.json({ success: false, message: 'userId is required' }, { status: 400 });
    }

    const { faces, sessionStates } = await getStoredData();
    delete faces[userId];

    const { error } = await saveStoredData(faces, sessionStates);
    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Wajah berhasil dihapus dari database',
      count: Object.keys(faces).length
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
