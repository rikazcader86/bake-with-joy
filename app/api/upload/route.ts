import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename') || 'receipt.jpg';
  
  if (!request.body) return NextResponse.json({ error: 'No file' }, { status: 400 });

  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(filename, request.body, { access: 'public' });
      return NextResponse.json(blob);
    }
  } catch (err) {
    console.warn('[AI Studio] Vercel blob upload failed, falling back to data URL:', err);
  }

  // Fallback: Convert stream to base64 data URL so uploads work seamlessly in development
  try {
    const arrayBuffer = await request.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = filename.endsWith('.png') ? 'image/png' : filename.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
    const base64 = `data:${mimeType};base64,${buffer.toString('base64')}`;
    return NextResponse.json({ url: base64, pathname: filename });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process file';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}