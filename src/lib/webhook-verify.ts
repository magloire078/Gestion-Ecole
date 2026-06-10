import crypto from 'crypto';

/**
 * Vérifie une signature HMAC-SHA256 sur le corps brut d'une requête.
 * Retourne true si le secret n'est pas configuré (mode dégradé) afin de ne pas
 * bloquer les environnements de dev — la prod DOIT toujours définir le secret.
 */
export function verifyHmacSignature(
    rawBody: string,
    signatureHeader: string | null | undefined,
    secret: string | undefined,
    options: { algorithm?: 'sha256' | 'sha512'; encoding?: 'hex' | 'base64' } = {}
): { valid: boolean; reason?: string } {
    if (!secret) {
        console.warn("[WebhookVerify] Aucun secret configuré — vérification désactivée (mode dégradé).");
        return { valid: true, reason: 'no_secret_configured' };
    }
    if (!signatureHeader) {
        return { valid: false, reason: 'missing_signature_header' };
    }

    const algorithm = options.algorithm ?? 'sha256';
    const encoding = options.encoding ?? 'hex';
    const computed = crypto.createHmac(algorithm, secret).update(rawBody).digest(encoding);

    try {
        const a = Buffer.from(computed);
        const b = Buffer.from(signatureHeader.trim());
        if (a.length !== b.length) return { valid: false, reason: 'length_mismatch' };
        return { valid: crypto.timingSafeEqual(a, b), reason: 'computed' };
    } catch {
        return { valid: false, reason: 'comparison_error' };
    }
}

/**
 * Vérifie une signature HMAC sur `{timestamp}.{payload}`. Pattern utilisé
 * notamment par Genius Pay (et plusieurs autres PSP).
 *
 * En plus de la signature, on rejette les timestamps trop anciens
 * (replay attack) — tolérance par défaut: 5 minutes.
 */
export function verifyTimestampedHmac(
    rawBody: string,
    signatureHeader: string | null | undefined,
    timestampHeader: string | null | undefined,
    secret: string | undefined,
    options: { algorithm?: 'sha256' | 'sha512'; encoding?: 'hex' | 'base64'; toleranceSeconds?: number } = {}
): { valid: boolean; reason?: string } {
    if (!secret) {
        console.warn("[WebhookVerify] Aucun secret configuré — vérification désactivée (mode dégradé).");
        return { valid: true, reason: 'no_secret_configured' };
    }
    if (!signatureHeader || !timestampHeader) {
        return { valid: false, reason: 'missing_signature_or_timestamp' };
    }

    const tsNum = Number.parseInt(timestampHeader, 10);
    if (!Number.isFinite(tsNum)) {
        return { valid: false, reason: 'invalid_timestamp' };
    }
    const tolerance = options.toleranceSeconds ?? 5 * 60;
    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - tsNum) > tolerance) {
        return { valid: false, reason: 'timestamp_outside_tolerance' };
    }

    const algorithm = options.algorithm ?? 'sha256';
    const encoding = options.encoding ?? 'hex';
    const signedPayload = `${timestampHeader}.${rawBody}`;
    const computed = crypto.createHmac(algorithm, secret).update(signedPayload).digest(encoding);

    try {
        const a = Buffer.from(computed);
        const b = Buffer.from(signatureHeader.trim());
        if (a.length !== b.length) return { valid: false, reason: 'length_mismatch' };
        return { valid: crypto.timingSafeEqual(a, b), reason: 'computed' };
    } catch {
        return { valid: false, reason: 'comparison_error' };
    }
}

/**
 * Vérifie l'égalité d'un secret partagé (utilisé par certains PSP qui envoient
 * une clé d'API directement dans le corps ou un header).
 */
export function verifySharedSecret(
    received: string | null | undefined,
    expected: string | undefined
): boolean {
    if (!expected) {
        console.warn("[WebhookVerify] Aucun secret partagé configuré — vérification désactivée.");
        return true;
    }
    if (!received) return false;
    try {
        const a = Buffer.from(received);
        const b = Buffer.from(expected);
        if (a.length !== b.length) return false;
        return crypto.timingSafeEqual(a, b);
    } catch {
        return false;
    }
}
