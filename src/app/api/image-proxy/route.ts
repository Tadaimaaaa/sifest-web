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

    // Ambil resolusi Full HD (2500px) langsung dari Google CDN resmi (lh3.googleusercontent.com)
    const lh3Url = `https://lh3.googleusercontent.com/d/${fileId}=w2500`;
    let response = await fetch(lh3Url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });

    // Fallback ke Google Drive thumbnail w2500 jika endpoint utama ada kendala
    if (!response.ok) {
      const thumbUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w2500`;
      response = await fetch(thumbUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }
      });
    }

    // Fallback terakhir: uc?export=download
    if (!response.ok) {
      const driveUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      response = await fetch(driveUrl);
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return new NextResponse('Error fetching image', { status: 500 });
  }
}
