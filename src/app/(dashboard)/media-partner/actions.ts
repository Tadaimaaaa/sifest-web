'use server';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function uploadLogo(formData: FormData) {
  try {
    const file = formData.get('file') as File;
    if (!file) return { success: false, message: 'No file' };

    // Ensure bucket exists
    await supabase.storage.createBucket('media_partners', { public: true }).catch(() => {});

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    // Convert File to Buffer/ArrayBuffer for Supabase
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data, error } = await supabase.storage
      .from('media_partners')
      .upload(fileName, buffer, {
        contentType: file.type,
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('media_partners')
      .getPublicUrl(fileName);

    return { success: true, url: publicUrl };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}
