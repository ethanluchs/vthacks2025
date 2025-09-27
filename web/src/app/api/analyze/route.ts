import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const backend = process.env.BACKEND_SERVICE_URL || 'http://localhost:8000';
  const contentType = req.headers.get('content-type') || '';
  const forwardUrl = `${backend}/analyze`;
  let forwardOptions: RequestInit = { method: 'POST' };

  if (contentType.includes('application/json')) {
    const json = await req.json();
    forwardOptions.headers = { 'Content-Type': 'application/json' };
    forwardOptions.body = JSON.stringify(json);
  } else {
    const formData = await req.formData();
    forwardOptions.body = formData as any;
  }

  const resp = await fetch(forwardUrl, forwardOptions);
  const text = await resp.text();
  try {
    return NextResponse.json(JSON.parse(text), { status: resp.status });
  } catch {
    return new NextResponse(text, { status: resp.status });
  }
}

