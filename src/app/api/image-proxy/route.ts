import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  
  if (!url) {
    return new NextResponse('URL is required', { status: 400 });
  }

  try {
    let fileId = '';
    const matchD = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (matchD && matchD[1]) fileId = matchD[1];
    else {
      const matchId = url.match(/id=([a-zA-Z0-9_-]+)/);
      if (matchId && matchId[1]) fileId = matchId[1];
    }

    if (!fileId) {
      return new NextResponse('Invalid Google Drive URL', { status: 400 });
    }

    // Coba URL export view terlebih dahulu
    const driveUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
    
    let response = await fetch(driveUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });

    let contentType = response.headers.get('content-type') || '';

    // Jika uc?export=view gagal atau mengembalikan HTML (misal virus scan warning / consent page),
    // fallback ke endpoint thumbnail resmi Google Drive yang selalu mengirim gambar
    if (!response.ok || contentType.includes('text/html')) {
      const thumbUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
      response = await fetch(thumbUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }
      });
      contentType = response.headers.get('content-type') || 'image/jpeg';
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return new NextResponse('Error fetching image', { status: 500 });
  }
}
