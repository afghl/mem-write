import { NextResponse } from 'next/server';

export async function GET() {
  // Simulate checking database connections
  // In a real app, you would await prisma.$connect() or similar
  
  // Adding artificial delay to simulate network latency
  await new Promise(resolve => setTimeout(resolve, 800));

  return NextResponse.json({ 
    status: "ok", 
    postgres: "connected (mock)", 
    vectorDB: "connected (mock)",
    timestamp: new Date().toISOString()
  });
}