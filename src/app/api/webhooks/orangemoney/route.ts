
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Received Orange Money IPN:", body);

    // TODO: 
    // 1. Validate the signature (if provided by Orange) to ensure the request is authentic.
    // 2. Check the payment status in the body.
    // 3. If status is 'SUCCESS', find the corresponding order/school in your database using `body.order_id`.
    // 4. Update the subscription status for that school.

    return NextResponse.json({ message: "Notification received" }, { status: 200 });
  } catch (error) {
    console.error("Error processing Orange Money IPN:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
