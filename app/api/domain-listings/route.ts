import { NextRequest, NextResponse } from "next/server";

let cachedToken: { token: string; expires: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires) return cachedToken.token;

  const res = await fetch("https://auth.domain.com.au/v1/connect/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.DOMAIN_CLIENT_ID!,
      client_secret: process.env.DOMAIN_CLIENT_SECRET!,
      scope: "api_listings_read api_agencies_read",
    }),
  });

  if (!res.ok) throw new Error("Domain auth failed");
  const data = await res.json();
  cachedToken = { token: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedToken.token;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const suburb  = searchParams.get("suburb")  ?? "";
  const state   = searchParams.get("state")   ?? "";
  const postcode = searchParams.get("postcode") ?? "";

  if (!suburb && !postcode) {
    return NextResponse.json({ listings: [] });
  }

  try {
    const token = await getAccessToken();

    const body = {
      listingType: "Sale",
      propertyTypes: ["House", "Townhouse", "Unit Apartment", "Land"],
      locations: [{
        state: state || undefined,
        suburb: suburb || undefined,
        postCode: postcode || undefined,
        includeSurroundingSuburbs: false,
      }],
      pageSize: 50,
      sort: { sortKey: "DateListed", direction: "Descending" },
    };

    const res = await fetch("https://api.domain.com.au/v1/listings/residential/_search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Domain listings error:", res.status, err);
      return NextResponse.json({ listings: [], error: err }, { status: res.status });
    }

    const data = await res.json();
    console.log("Domain response count:", data?.length, "suburb:", suburb, "state:", state);

    // Extract what we need for the map pins
    const listings = (data ?? [])
      .filter((item: { listing?: { geoLocation?: { latitude?: number; longitude?: number } } }) =>
        item.listing?.geoLocation?.latitude
      )
      .map((item: {
        listing: {
          id: number;
          displayableAddress?: string;
          suburb?: string;
          state?: string;
          postCode?: string;
          price?: { displayPrice?: string };
          bedrooms?: number;
          bathrooms?: number;
          carspaces?: number;
          landAreaSqm?: number;
          propertyTypes?: string[];
          media?: { url?: string; category?: string }[];
          geoLocation?: { latitude: number; longitude: number };
          headline?: string;
          priceDetails?: { displayPrice?: string };
        }
      }) => {
        const l = item.listing;
        const photo = l.media?.find((m: { category?: string }) => m.category === "Image")?.url;
        return {
          id: l.id,
          address: l.displayableAddress ?? "",
          suburb: l.suburb ?? "",
          state: l.state ?? "",
          postcode: l.postCode ?? "",
          lat: l.geoLocation!.latitude,
          lng: l.geoLocation!.longitude,
          price: l.priceDetails?.displayPrice ?? "Contact agent",
          bedrooms: l.bedrooms,
          bathrooms: l.bathrooms,
          carspaces: l.carspaces,
          landSize: l.landAreaSqm,
          propertyType: l.propertyTypes?.[0] ?? "",
          photo,
          headline: l.headline ?? "",
          url: `https://www.domain.com.au/${l.id}`,
        };
      });

    return NextResponse.json({ listings });
  } catch (err) {
    console.error("Domain API error:", err);
    return NextResponse.json({ listings: [], error: "Failed to fetch listings" }, { status: 500 });
  }
}
