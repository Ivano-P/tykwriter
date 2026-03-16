import { NextResponse } from 'next/server';
import { MistralAiProService } from '@/services/MistralAiProService';

export async function GET() {
  try {
    const result = await MistralAiProService.checkSpelling("je tes en local. putain c'est vraimment un gro conard.");
    return NextResponse.json({ result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
