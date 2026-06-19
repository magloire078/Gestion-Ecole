import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'https://gerecole.com';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/dashboard/', '/admin/', '/api/', '/onboarding/', '/auth/'],
            },
        ],
        sitemap: `${BASE_URL}/sitemap.xml`,
    };
}
