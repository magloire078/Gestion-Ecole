import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Sends an SMS to a recipient and logs it under the school's Firestore collection.
 * 
 * Supports Twilio if environment variables are configured:
 * - TWILIO_ACCOUNT_SID
 * - TWILIO_AUTH_TOKEN
 * - TWILIO_PHONE_NUMBER
 * 
 * Otherwise, falls back to logging to the console and Firestore.
 */
export async function sendSMS(to: string, message: string, schoolId: string): Promise<boolean> {
  console.log(`[SMSService] Attempting to send SMS to: ${to}, message: "${message}", school: ${schoolId}`);

  let status: 'SUCCESS' | 'FAILED' = 'SUCCESS';
  let errorDetails = '';

  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_PHONE_NUMBER?.trim();

  if (accountSid && authToken && from) {
    try {
      const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      
      const params = new URLSearchParams();
      params.append('To', to);
      params.append('From', from);
      params.append('Body', message);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        status = 'FAILED';
        errorDetails = data.message || `HTTP ${response.status}`;
        console.error(`[SMSService] Twilio error: ${errorDetails}`);
      } else {
        console.log(`[SMSService] SMS successfully sent via Twilio. Message SID: ${data.sid}`);
      }
    } catch (err: any) {
      status = 'FAILED';
      errorDetails = err.message || String(err);
      console.error('[SMSService] Exception during SMS send:', err);
    }
  } else {
    console.warn('[SMSService] Twilio credentials missing. SMS simulated (logged to console and Firestore).');
  }

  // Log in Firestore
  try {
    const logRef = getAdminDb().collection(`ecoles/${schoolId}/sms_logs`).doc();
    await logRef.set({
      id: logRef.id,
      to,
      message,
      sentAt: FieldValue.serverTimestamp(),
      status,
      provider: accountSid ? 'Twilio' : 'Simulated/Console',
      error: errorDetails || null,
    });
  } catch (dbErr) {
    console.error('[SMSService] Error writing SMS log to Firestore:', dbErr);
  }

  return status === 'SUCCESS';
}
