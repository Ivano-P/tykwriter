import { NextResponse } from 'next/server';
import { OllamaService } from '@/services/OllamaService';

export async function GET() {
  try {
    const result = await OllamaService.checkSpelling("je tes en local. putain c'est vraimment un gro conard.");
    return NextResponse.json({ result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
