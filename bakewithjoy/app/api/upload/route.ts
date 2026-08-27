import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename') || 'receipt.jpg';
  
  if (!request.body) return NextResponse.json({ error: 'No file' }, { status: 400 });

  // This safely uploads the image to Vercel and makes it public so you can see it
  const blob = await put(filename, request.body, { access: 'public' });
  return NextResponse.json(blob);
}