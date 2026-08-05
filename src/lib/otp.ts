import { createHash, randomInt, timingSafeEqual } from 'crypto';
import { getAdminDb } from '@/firebase/admin';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';

/**
 * Codes à usage unique pour la création de compte par numéro de téléphone.
 *
 * Ce module ne s'exécute que côté serveur : il utilise l'Admin SDK, qui contourne les
 * règles Firestore. La collection `otp_requests` doit rester totalement fermée au client
 * (voir `firestore.rules`) — un code lisible depuis le navigateur annulerait tout
 * l'intérêt de la vérification.
 */

const COLLECTION = 'otp_requests';

/** Durée de validité d'un code. Assez court pour limiter la fenêtre d'attaque. */
const CODE_TTL_MS = 10 * 60 * 1000;

/** Nombre d'essais avant invalidation définitive du code. */
const MAX_ATTEMPTS = 5;

/** Délai minimal entre deux envois vers un même numéro. */
const RESEND_COOLDOWN_MS = 60 * 1000;

/** Nombre maximal de codes envoyés à un même numéro par heure. */
const MAX_SENDS_PER_HOUR = 5;

/** Indicatif appliqué aux numéros saisis en format national. Côte d'Ivoire par défaut. */
const DEFAULT_COUNTRY_CODE = process.env.DEFAULT_PHONE_COUNTRY_CODE?.trim() || '+225';

export type StartOutcome =
  | { ok: true; phone: string; code: string; expiresAt: Date }
  | { ok: false; reason: 'invalid_phone' | 'cooldown' | 'rate_limited'; retryAfterSeconds?: number };

export type VerifyOutcome =
  | { ok: true; phone: string }
  | { ok: false; reason: 'invalid_phone' | 'not_found' | 'expired' | 'too_many_attempts' | 'mismatch' };

/**
 * Normalise un numéro au format E.164 (`+225XXXXXXXXXX`).
 *
 * Indispensable avant toute empreinte ou tout stockage : sans cela, `07 12 34 56 78`,
 * `+225 07 12 34 56 78` et `0022507123456 78` produiraient trois comptes distincts pour
 * la même personne.
 *
 * Renvoie `null` si le numéro ne peut pas être interprété — on préfère refuser que
 * deviner.
 */
export function normalizePhone(raw: string): string | null {
  if (!raw) return null;

  // On ne conserve que les chiffres et un éventuel « + » de tête.
  const trimmed = raw.trim().replace(/[\s.\-()]/g, '');
  let digits = trimmed.startsWith('+') ? `+${trimmed.slice(1).replace(/\D/g, '')}` : trimmed.replace(/\D/g, '');

  if (!digits) return null;

  if (digits.startsWith('+')) {
    // Déjà international.
  } else if (digits.startsWith('00')) {
    digits = `+${digits.slice(2)}`;
  } else {
    // Format national : on retire le zéro de tête éventuel avant d'ajouter l'indicatif.
    digits = `${DEFAULT_COUNTRY_CODE}${digits.replace(/^0+/, '')}`;
  }

  // E.164 : 8 à 15 chiffres après le « + ».
  const national = digits.slice(1);
  if (national.length < 8 || national.length > 15) return null;

  return digits;
}

/** Empreinte du numéro, utilisée comme identifiant de document : on ne stocke jamais le numéro en clair comme clé. */
function phoneKey(phone: string): string {
  return createHash('sha256').update(`phone:${secret()}:${phone}`).digest('hex');
}

/** Empreinte du code. Le code lui-même n'est jamais persisté. */
function hashCode(phone: string, code: string): string {
  return createHash('sha256').update(`${secret()}:${phone}:${code}`).digest('hex');
}

function secret(): string {
  const value = process.env.OTP_HASH_SECRET?.trim();
  if (!value) {
    // Un sel absent rendrait les empreintes attaquables par table précalculée : six
    // chiffres se cassent instantanément sans sel.
    throw new Error('OTP_HASH_SECRET est requis pour la création de compte par téléphone.');
  }
  return value;
}

/** Comparaison à temps constant, pour ne pas révéler la position du premier caractère faux. */
function safeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Code à 6 chiffres tiré d'une source cryptographique — `Math.random()` serait prédictible. */
function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

interface OtpRecord {
  codeHash: string;
  expiresAt: FirebaseFirestore.Timestamp;
  attempts: number;
  sendCount: number;
  windowStartedAt: FirebaseFirestore.Timestamp;
  lastSentAt: FirebaseFirestore.Timestamp;
}

/**
 * Prépare un code pour ce numéro et renvoie le code en clair **à l'appelant serveur
 * uniquement**, afin qu'il l'achemine. Il ne doit jamais franchir la frontière HTTP.
 */
export async function startVerification(rawPhone: string): Promise<StartOutcome> {
  const phone = normalizePhone(rawPhone);
  if (!phone) return { ok: false, reason: 'invalid_phone' };

  const db: Firestore = getAdminDb();
  const ref = db.collection(COLLECTION).doc(phoneKey(phone));
  const snap = await ref.get();
  const now = Date.now();

  let sendCount = 0;
  let windowStartedAt = now;

  if (snap.exists) {
    const record = snap.data() as OtpRecord;
    const lastSent = record.lastSentAt?.toMillis?.() ?? 0;

    if (now - lastSent < RESEND_COOLDOWN_MS) {
      return {
        ok: false,
        reason: 'cooldown',
        retryAfterSeconds: Math.ceil((RESEND_COOLDOWN_MS - (now - lastSent)) / 1000),
      };
    }

    const windowStart = record.windowStartedAt?.toMillis?.() ?? 0;
    const withinWindow = now - windowStart < 60 * 60 * 1000;
    sendCount = withinWindow ? (record.sendCount ?? 0) : 0;
    windowStartedAt = withinWindow ? windowStart : now;

    // Sans ce plafond, un attaquant ferait payer à l'école autant de SMS qu'il veut.
    if (sendCount >= MAX_SENDS_PER_HOUR) {
      return {
        ok: false,
        reason: 'rate_limited',
        retryAfterSeconds: Math.ceil((windowStart + 60 * 60 * 1000 - now) / 1000),
      };
    }
  }

  const code = generateCode();
  const expiresAt = new Date(now + CODE_TTL_MS);

  await ref.set({
    codeHash: hashCode(phone, code),
    expiresAt,
    attempts: 0,
    sendCount: sendCount + 1,
    windowStartedAt: new Date(windowStartedAt),
    lastSentAt: FieldValue.serverTimestamp(),
  });

  return { ok: true, phone, code, expiresAt };
}

/** Vérifie un code et le consomme. Un code valide ne peut servir qu'une fois. */
export async function verifyCode(rawPhone: string, code: string): Promise<VerifyOutcome> {
  const phone = normalizePhone(rawPhone);
  if (!phone) return { ok: false, reason: 'invalid_phone' };

  const db: Firestore = getAdminDb();
  const ref = db.collection(COLLECTION).doc(phoneKey(phone));
  const snap = await ref.get();

  if (!snap.exists) return { ok: false, reason: 'not_found' };

  const record = snap.data() as OtpRecord;

  if ((record.expiresAt?.toMillis?.() ?? 0) < Date.now()) {
    await ref.delete();
    return { ok: false, reason: 'expired' };
  }

  if ((record.attempts ?? 0) >= MAX_ATTEMPTS) {
    await ref.delete();
    return { ok: false, reason: 'too_many_attempts' };
  }

  if (!safeEquals(record.codeHash, hashCode(phone, String(code ?? '').trim()))) {
    await ref.update({ attempts: FieldValue.increment(1) });
    return { ok: false, reason: 'mismatch' };
  }

  // Consommation : le code ne doit pas pouvoir être rejoué.
  await ref.delete();
  return { ok: true, phone };
}
