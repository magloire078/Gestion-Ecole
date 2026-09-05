import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message, imageUrl } = await req.json();

    if (!message && !imageUrl) {
      return NextResponse.json(
        { error: "Un message ou une image est requis" },
        { status: 400 }
      );
    }

    const pageId = process.env.FACEBOOK_PAGE_ID;
    const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

    if (!pageId || !accessToken) {
      return NextResponse.json(
        { error: "Configuration Facebook manquante sur le serveur." },
        { status: 500 }
      );
    }

    const endpoint = imageUrl ? "photos" : "feed";
    const facebookApiUrl = `https://graph.facebook.com/v19.0/${pageId}/${endpoint}`;
    
    const payload: any = {
      access_token: accessToken,
    };
    
    if (message) payload.message = message;
    if (imageUrl) payload.url = imageUrl;

    const response = await fetch(facebookApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Erreur API Facebook:", data);
      return NextResponse.json(
        { error: data.error?.message || "Erreur lors de la publication sur Facebook." },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    console.error("Erreur de la route API Facebook:", error);
    return NextResponse.json(
      { error: "Une erreur inattendue s'est produite." },
      { status: 500 }
    );
  }
}
