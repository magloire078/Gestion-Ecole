import { NextResponse } from 'next/server';

/**
 * CORS pour les routes appelées depuis l'application mobile.
 *
 * Sur le web, l'application et ses routes API partagent la même origine : CORS ne joue
 * aucun rôle. Dans la WebView Capacitor en revanche, la page est servie depuis une origine
 * locale et les appels vers le serveur deviennent inter-origines — sans ces en-têtes, le
 * navigateur les bloque avant même que la requête n'atteigne le serveur.
 *
 * À réserver aux routes réellement appelées par l'application. Les webhooks des
 * prestataires de paiement sont appelés de serveur à serveur, jamais par un navigateur :
 * leur ouvrir CORS élargirait la surface d'attaque sans aucun bénéfice.
 */

/** Origines des WebViews Capacitor : `https://localhost` sur Android, `capacitor://localhost` sur iOS. */
const CAPACITOR_ORIGINS = [
  'capacitor://localhost',
  'ionic://localhost',
  'https://localhost',
  'http://localhost',
];

function allowedOrigins(): string[] {
  const configured = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
  return [...CAPACITOR_ORIGINS, ...configured];
}

/**
 * N'autorise que les origines connues, et renvoie l'origine exacte plutôt que `*` : les
 * requêtes de l'application portent un jeton d'authentification, et `*` est incompatible
 * avec l'envoi d'identifiants.
 */
function resolveOrigin(req: Request): string | null {
  const origin = req.headers.get('origin');
  if (!origin) return null;
  return allowedOrigins().includes(origin) ? origin : null;
}

function applyCors(req: Request, headers: Headers): void {
  const origin = resolveOrigin(req);
  if (!origin) return;

  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  headers.set('Access-Control-Max-Age', '86400');
  // L'en-tête dépend de l'origine appelante : sans `Vary`, un cache intermédiaire pourrait
  // servir à une origine la réponse autorisée pour une autre.
  headers.append('Vary', 'Origin');
}

/** Réponse à la requête préalable (preflight) envoyée par le navigateur. */
export function corsPreflight(req: Request): NextResponse {
  const response = new NextResponse(null, { status: 204 });
  applyCors(req, response.headers);
  return response;
}

/**
 * Enveloppe un gestionnaire de route pour ajouter les en-têtes CORS à sa réponse, quel
 * que soit son chemin de sortie — y compris les réponses d'erreur, qui doivent elles aussi
 * être lisibles par l'application.
 */
export function withCors<Req extends Request, Ctx>(
  handler: (req: Req, ctx: Ctx) => Promise<Response>,
): (req: Req, ctx: Ctx) => Promise<Response> {
  return async (req, ctx) => {
    const response = await handler(req, ctx);
    applyCors(req, response.headers);
    return response;
  };
}
