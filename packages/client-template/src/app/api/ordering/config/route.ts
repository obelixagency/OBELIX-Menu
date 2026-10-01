import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { readBrand } from "@/lib/brand";
import {
  hasDeliveryOrdering,
  hasTableOrdering,
  isOrderingEnabled,
  normalizeOrderingFeatures,
} from "@/lib/extensions/ordering";
import {
  getOrderingSettings,
  getStationRouting,
  listTables,
  listZones,
  noStoreHeaders,
  seedDefaultZonesIfEmpty,
  updateOrderingSettings,
} from "@/lib/ordering-data";
import { paymentsPublicSummary } from "@/lib/payments";

export const dynamic = "force-dynamic";

function publicAlerts(
  alerts: Awaited<ReturnType<typeof getOrderingSettings>>["alerts"],
  full: boolean
) {
  if (!alerts) return undefined;
  if (full) return alerts;
  return {
    alertOnDelivery: alerts.alertOnDelivery,
    alertOnDineIn: alerts.alertOnDineIn,
    alertOnPos: Boolean(alerts.alertOnPos),
    whatsappPhone: alerts.whatsappPhone,
    callMeBotApiKey: "",
    webhookUrl: "",
    configured: Boolean(
      alerts.whatsappPhone || alerts.callMeBotApiKey || alerts.webhookUrl
    ),
  };
}

/** Public + dashboard: feature flags + tables/zones for guest picker */
export async function GET(req: NextRequest) {
  const brand = await readBrand();
  const features = normalizeOrderingFeatures(brand.extensions?.ordering);
  const enabled = isOrderingEnabled(features);
  const settings = await getOrderingSettings();
  const authed = await isAuthenticated();
  const url = new URL(req.url);
  const forGuest = url.searchParams.get("guest") === "1" || !authed;

  if (!enabled) {
    return NextResponse.json(
      {
        features,
        settings: {
          ...settings,
          alerts: publicAlerts(settings.alerts, !forGuest),
        },
        payments: paymentsPublicSummary(brand.extensions?.payments),
        tables: [],
        zones: [],
        stationRouting: {},
      },
      { headers: noStoreHeaders() }
    );
  }

  if (features.zonesIndoorOutdoor && features.tableOrderingEnabled) {
    await seedDefaultZonesIfEmpty();
  }

  const [tables, zones, stationRouting] = await Promise.all([
    listTables(),
    listZones(),
    getStationRouting(),
  ]);

  return NextResponse.json(
    {
      features,
      settings: {
        ...settings,
        alerts: publicAlerts(settings.alerts, !forGuest),
      },
      payments: paymentsPublicSummary(brand.extensions?.payments),
      tables: forGuest ? tables.filter((t) => t.active) : tables,
      zones: forGuest ? zones.filter((z) => z.active) : zones,
      stationRouting: forGuest ? undefined : stationRouting,
      channels: {
        table: hasTableOrdering(features),
        delivery: hasDeliveryOrdering(features),
        pickup: features.pickupEnabled,
      },
    },
    { headers: noStoreHeaders() }
  );
}

/** Owner: update alert / soft ordering settings */
export async function PATCH(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: noStoreHeaders() }
    );
  }
  try {
    const body = await req.json();
    const patch: Parameters<typeof updateOrderingSettings>[0] = {};
    if (typeof body.soundEnabled === "boolean") {
      patch.soundEnabled = body.soundEnabled;
    }
    if (typeof body.guestNoteEnabled === "boolean") {
      patch.guestNoteEnabled = body.guestNoteEnabled;
    }
    if (body.alerts && typeof body.alerts === "object") {
      patch.alerts = body.alerts;
    }
    if (body.deliveryMinOrder !== undefined) {
      patch.deliveryMinOrder = Number(body.deliveryMinOrder) || 0;
    }
    if (Array.isArray(body.deliveryAreas)) {
      patch.deliveryAreas = body.deliveryAreas;
    }
    if (typeof body.loyaltyEnabled === "boolean") {
      patch.loyaltyEnabled = body.loyaltyEnabled;
    }
    if (body.stampsForReward !== undefined) {
      patch.stampsForReward = Number(body.stampsForReward) || 10;
    }
    if (body.seasonalNote !== undefined) {
      patch.seasonalNote = String(body.seasonalNote);
    }
    if (body.seasonalNoteEn !== undefined) {
      patch.seasonalNoteEn = String(body.seasonalNoteEn);
    }
    const settings = await updateOrderingSettings(patch);
    return NextResponse.json({ settings }, { headers: noStoreHeaders() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    return NextResponse.json(
      { error: message },
      { status: 400, headers: noStoreHeaders() }
    );
  }
}
