// File: src/app/api/n8n-webhook/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/client';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const SECRET = process.env.N8N_WEBHOOK_SECRET || 'change-me';

export async function POST(request: Request) {
  const token = request.headers.get('x-n8n-secret');
  if (!token || token !== SECRET) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const payload = await request.json();
    console.log('n8n webhook payload received');

    // Persist incoming webhook to Firestore for auditing and processing
    try {
      const col = collection(db, 'n8n_webhooks');
      await addDoc(col, {
        payload,
        receivedAt: serverTimestamp(),
      });
    } catch (writeErr) {
      console.error('Failed to write n8n payload to Firestore', writeErr);
      // continue — we still respond ok so n8n doesn't retry excessively
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('n8n webhook error', err);
    return new NextResponse('Bad Request', { status: 400 });
  }
}