import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ihpgoxdgdhxnnpppasab.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_oqTxtR39oWOy8sgYSAgWdA_b4NPQ0Rb';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

const DB_SLUG = 'panitia_face_biometrics_db';

// Helper: ambil seluruh data wajah dari database
async function getStoredFaces(): Promise<Record<string, any>> {
  try {
    const { data, error } = await supabase
      .from('event_brackets')
      .select('bracket_data')
      .eq('event_slug', DB_SLUG)
      .maybeSingle();

    if (error || !data || !data.bracket_data) {
      return {};
    }
    return data.bracket_data.faces || {};
  } catch (e) {
    console.error('getStoredFaces error:', e);
    return {};
  }
}

// Helper: simpan kembali seluruh data wajah ke database
async function saveStoredFaces(faces: Record<string, any>) {
  return await supabase
    .from('event_brackets')
    .upsert({
      event_slug: DB_SLUG,
      bracket_data: { faces },
      updated_at: new Date().toISOString()
    }, { onConflict: 'event_slug' });
}

// GET: Ambil daftar profil wajah yang sudah terdaftar di database
export async function GET() {
  try {
    const faces = await getStoredFaces();
    return NextResponse.json({
      success: true,
      count: Object.keys(faces).length,
      faces
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Daftarkan atau perbarui wajah panitia ke database
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, name, nim, photo, vector } = body;

    if (!userId) {
      return NextResponse.json({ success: false, message: 'userId is required' }, { status: 400 });
    }

    const currentFaces = await getStoredFaces();
    currentFaces[userId] = {
      userId,
      name: name || '',
      nim: nim || '',
      photo: photo || '',
      vector: Array.isArray(vector) ? vector : [],
      updatedAt: new Date().toISOString()
    };

    const { error } = await saveStoredFaces(currentFaces);
    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Wajah berhasil disimpan ke database',
      count: Object.keys(currentFaces).length
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

    const currentFaces = await getStoredFaces();
    delete currentFaces[userId];

    const { error } = await saveStoredFaces(currentFaces);
    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Wajah berhasil dihapus dari database',
      count: Object.keys(currentFaces).length
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
