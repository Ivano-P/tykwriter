import { NextResponse } from 'next/server';
import { MistralAiProService } from '@/services/MistralAiProService';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Invalid text provided.' }, { status: 400 });
    }

    const correctedText = await MistralAiProService.autoCheckSpellingAndFormat(text);
    return NextResponse.json({ correctedText });
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return NextResponse.json({ error: 'Request was aborted.' }, { status: 499 });
    }
    console.error('Error in /api/assistant:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
