
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Received MTN MoMo IPN:", body);

    // TODO:
    // 1. Verify the request's origin (MTN usually sends a signature).
    // 2. Check body.status. If it's 'SUCCESSFUL'.
    // 3. Use `body.externalId` to find the transaction in your database.
    // 4. Update the school's subscription status.
    
    // According to MTN docs, you must respond quickly with a 200 OK.
    return new Response(null, { status: 200 });
  } catch (error) {
    console.error("Error processing MTN MoMo IPN:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
