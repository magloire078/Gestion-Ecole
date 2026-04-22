/**
 * Diagnostic: validate Cloudinary credentials configured in .env.local.
 *
 * Usage:
 *   npx tsx scripts/test-cloudinary.ts
 *
 * Checks:
 *   1. All three CLOUDINARY_* env vars are present
 *   2. cloudinary.api.ping() returns {status: 'ok'} → creds valid
 *   3. api_sign_request() produces a non-empty signature → signing path OK
 */
import { loadEnvConfig } from '@next/env';
import { v2 as cloudinary } from 'cloudinary';

loadEnvConfig(process.cwd());

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  console.error('❌ Missing env vars. Expected in .env.local:');
  console.error('   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME');
  console.error('   CLOUDINARY_API_KEY');
  console.error('   CLOUDINARY_API_SECRET');
  console.error(`   Got: cloud=${cloudName ?? '(missing)'}, key=${apiKey ? 'present' : '(missing)'}, secret=${apiSecret ? 'present' : '(missing)'}`);
  process.exit(1);
}

cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

async function main() {
  console.log(`→ Cloud: ${cloudName}`);
  console.log(`→ API Key: ${apiKey}`);
  console.log('→ Pinging Cloudinary API...');

  try {
    const pingResult = await cloudinary.api.ping();
    console.log(`✓ PING OK: ${JSON.stringify(pingResult)}`);
  } catch (err: any) {
    const httpCode = err.error?.http_code ?? err.http_code;
    const message = err.error?.message ?? err.message ?? String(err);
    console.error(`❌ PING FAIL (http ${httpCode ?? '?'}): ${message}`);
    if (httpCode === 401) console.error('   → Most likely: wrong API Secret');
    if (httpCode === 403) console.error('   → Most likely: API Key disabled or missing permissions');
    process.exit(1);
  }

  console.log('→ Generating a test signature...');
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder: 'ecoles/test-signing' },
    apiSecret!,
  );
  if (!signature || typeof signature !== 'string' || signature.length < 20) {
    console.error(`❌ Signature generation failed: got ${JSON.stringify(signature)}`);
    process.exit(1);
  }
  console.log(`✓ Signature OK (${signature.length} chars): ${signature.slice(0, 10)}...`);

  console.log('');
  console.log('✓ All checks passed. Cloudinary is ready.');
}

main().catch((e) => {
  console.error('Unhandled error:', e);
  process.exit(1);
});
