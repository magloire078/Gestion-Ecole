import axios from 'axios';

/**
 * Intégration Facebook Pages API (Graph API).
 * Permet de publier du contenu sur NOTRE Page depuis GèreEcole.
 *
 * Prérequis (côté Meta, hors code) :
 *  - Une App Facebook avec les autorisations pages_show_list,
 *    pages_read_engagement et pages_manage_posts, VALIDÉES via le Contrôle app.
 *  - Un token d'accès de Page longue durée (voir le guide de configuration).
 *
 * Variables d'environnement :
 *  - FACEBOOK_PAGE_ID            : identifiant numérique de la Page.
 *  - FACEBOOK_PAGE_ACCESS_TOKEN  : token d'accès de Page (longue durée).
 *  - FACEBOOK_GRAPH_VERSION      : version de l'API (défaut v21.0).
 *
 * Doc : https://developers.facebook.com/documentation/pages-api
 */

const GRAPH_VERSION = process.env.FACEBOOK_GRAPH_VERSION || 'v21.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
const PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

export interface FacebookTextPost {
    message: string;
    /** URL à joindre (aperçu de lien). */
    link?: string;
    /**
     * Horodatage Unix (secondes) pour PROGRAMMER la publication.
     * Doit être compris entre 10 minutes et 30 jours dans le futur.
     * Si fourni, la publication est créée en mode non publié + programmée.
     */
    scheduledPublishTime?: number;
}

export interface FacebookPhotoPost {
    /** Légende de la photo. */
    message?: string;
    /** URL publique de l'image à publier. */
    photoUrl: string;
}

function assertConfig() {
    if (!PAGE_ID || !PAGE_ACCESS_TOKEN) {
        throw new Error(
            "Facebook Pages non configuré : définissez FACEBOOK_PAGE_ID et FACEBOOK_PAGE_ACCESS_TOKEN."
        );
    }
}

function toFriendlyError(error: any, fallback: string): Error {
    const apiError = error?.response?.data?.error;
    // Facebook renvoie { error: { message, type, code, error_subcode, fbtrace_id } }
    const msg = apiError?.message || error?.message || fallback;
    const code = apiError?.code ? ` (code ${apiError.code}${apiError.error_subcode ? '/' + apiError.error_subcode : ''})` : '';
    console.error('[FacebookPages] Erreur Graph API:', apiError || error?.message || error);
    return new Error(`${msg}${code}`);
}

/**
 * Publie (ou programme) une publication texte sur la Page.
 * POST /{page-id}/feed — autorisation pages_manage_posts.
 * Retourne { id: "<pageId>_<postId>" }.
 */
export async function publishTextPost(input: FacebookTextPost): Promise<{ id: string }> {
    assertConfig();
    if (!input.message?.trim() && !input.link?.trim()) {
        throw new Error('Une publication doit contenir un message ou un lien.');
    }

    const body: Record<string, any> = {
        access_token: PAGE_ACCESS_TOKEN,
    };
    if (input.message?.trim()) body.message = input.message.trim();
    if (input.link?.trim()) body.link = input.link.trim();

    if (input.scheduledPublishTime) {
        // Programmation : la publication reste non publiée jusqu'à l'heure prévue.
        body.published = false;
        body.scheduled_publish_time = input.scheduledPublishTime;
    }

    try {
        const { data } = await axios.post(`${GRAPH_BASE}/${PAGE_ID}/feed`, body);
        return data;
    } catch (error: any) {
        throw toFriendlyError(error, 'Échec de la publication Facebook.');
    }
}

/**
 * Publie une photo (avec légende optionnelle) sur la Page.
 * POST /{page-id}/photos — autorisation pages_manage_posts.
 */
export async function publishPhotoPost(input: FacebookPhotoPost): Promise<{ id: string; post_id?: string }> {
    assertConfig();
    if (!input.photoUrl?.trim()) {
        throw new Error("L'URL de la photo est requise.");
    }

    const body: Record<string, any> = {
        url: input.photoUrl.trim(),
        access_token: PAGE_ACCESS_TOKEN,
    };
    if (input.message?.trim()) body.caption = input.message.trim();

    try {
        const { data } = await axios.post(`${GRAPH_BASE}/${PAGE_ID}/photos`, body);
        return data;
    } catch (error: any) {
        throw toFriendlyError(error, 'Échec de la publication de la photo Facebook.');
    }
}

/**
 * Récupère les informations de base de la Page — utile pour vérifier que le
 * token et l'ID sont valides avant de publier.
 * GET /{page-id}?fields=id,name,fan_count,about
 */
export async function getPageInfo(): Promise<any> {
    assertConfig();
    try {
        const { data } = await axios.get(`${GRAPH_BASE}/${PAGE_ID}`, {
            params: { fields: 'id,name,fan_count,about', access_token: PAGE_ACCESS_TOKEN },
        });
        return data;
    } catch (error: any) {
        throw toFriendlyError(error, 'Impossible de lire les informations de la Page Facebook.');
    }
}
