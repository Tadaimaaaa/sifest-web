import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/sifest/supabase';

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from('media_partners')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, logo_url } = body;

    if (!name) {
      return NextResponse.json({ success: false, message: 'Name is required' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('media_partners')
      .insert([{ name, logo_url }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID is required' }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from('media_partners')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
