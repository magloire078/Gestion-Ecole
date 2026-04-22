import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/firebase/admin';
import { signUpload, SignedUploadParams } from '@/lib/cloudinary-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Issues a Cloudinary upload signature to authenticated clients only.
 * Body: { folder: string, publicId?: string, resourceType?: 'image'|'raw'|'auto' }
 *
 * The folder is enforced to start with 'ecoles/' so that a compromised
 * client cannot upload outside of the school namespace (e.g. overwrite
 * another tenant's assets or pollute the root).
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });
  }
  const idToken = authHeader.slice(7);

  try {
    await getAdminAuth().verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: 'Invalid auth token' }, { status: 401 });
  }

  const body = (await req.json()) as Partial<SignedUploadParams>;
  if (!body.folder || typeof body.folder !== 'string') {
    return NextResponse.json({ error: 'folder required' }, { status: 400 });
  }
  if (!body.folder.startsWith('ecoles/') && !body.folder.startsWith('temp/')) {
    return NextResponse.json(
      { error: 'folder must start with ecoles/ or temp/' },
      { status: 400 },
    );
  }

  const signed = signUpload({
    folder: body.folder,
    publicId: body.publicId,
    resourceType: body.resourceType,
  });

  return NextResponse.json(signed);
}
