const PAYDUNYA_API_URL = "https://app.paydunya.com/api/v1/checkout-invoice/create";
const PAYDUNYA_MASTER_KEY = process.env.PAYDUNYA_MASTER_KEY;
const PAYDUNYA_PUBLIC_KEY = process.env.PAYDUNYA_PUBLIC_KEY;
const PAYDUNYA_PRIVATE_KEY = process.env.PAYDUNYA_PRIVATE_KEY;
const PAYDUNYA_TOKEN = process.env.PAYDUNYA_TOKEN;

interface PayDunyaInvoiceData {
    total_amount: number;
    description: string;
    custom_data: { [key: string]: any };
    return_url: string;
    cancel_url: string;
    callback_url: string;
}

export async function createPayDunyaCheckout(data: PayDunyaInvoiceData): Promise<{ url: string | null, error: string | null }> {
    if (!PAYDUNYA_MASTER_KEY || !PAYDUNYA_PUBLIC_KEY || !PAYDUNYA_PRIVATE_KEY || !PAYDUNYA_TOKEN) {
        console.error("PayDunya API credentials are not configured.");
        return { url: null, error: "Configuration de paiement manquante sur le serveur." };
    }

    const payload = {
        invoice: {
            items: {
                item_0: {
                    name: data.description,
                    quantity: 1,
                    unit_price: data.total_amount.toString(),
                    total_price: data.total_amount.toString(),
                    description: data.description,
                }
            },
            total_amount: data.total_amount,
            description: data.description,
        },
        store: {
            name: "GèreEcole",
            website_url: process.env.NEXT_PUBLIC_BASE_URL || "https://www.gerecole.com",
        },
        custom_data: data.custom_data,
        actions: {
            return_url: data.return_url,
            cancel_url: data.cancel_url,
            callback_url: data.callback_url,
        }
    };

    try {
        const response = await fetch(PAYDUNYA_API_URL, {
            method: 'POST',
            headers: {
                'PAYDUNYA-MASTER-KEY': PAYDUNYA_MASTER_KEY,
                'PAYDUNYA-PUBLIC-KEY': PAYDUNYA_PUBLIC_KEY,
                'PAYDUNYA-PRIVATE-KEY': PAYDUNYA_PRIVATE_KEY,
                'PAYDUNYA-TOKEN': PAYDUNYA_TOKEN,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (result.response_code === '00') {
            return { url: result.response_text, error: null };
        } else {
            console.error("Erreur API PayDunya:", result);
            return { url: null, error: result.response_text || "Une erreur est survenue avec PayDunya." };
        }

    } catch (error) {
        console.error("Erreur lors de la création du checkout PayDunya:", error);
        return { url: null, error: "Erreur système lors de la communication avec PayDunya." };
    }
}
