import { NextRequest, NextResponse } from "next/server";
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
} from "@/lib/ordering-data";

export const dynamic = "force-dynamic";

/** Public + dashboard: feature flags + tables/zones for guest picker */
export async function GET(req: NextRequest) {
  const brand = await readBrand();
  const features = normalizeOrderingFeatures(brand.extensions?.ordering);
  const enabled = isOrderingEnabled(features);
  const settings = await getOrderingSettings();

  if (!enabled) {
    return NextResponse.json(
      { features, settings, tables: [], zones: [], stationRouting: {} },
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

  const url = new URL(req.url);
  const forGuest = url.searchParams.get("guest") === "1";

  return NextResponse.json(
    {
      features,
      settings,
      tables: forGuest
        ? tables.filter((t) => t.active)
        : tables,
      zones: forGuest
        ? zones.filter((z) => z.active)
        : zones,
      stationRouting: forGuest ? undefined : stationRouting,
      channels: {
        table: hasTableOrdering(features),
        delivery: hasDeliveryOrdering(features),
      },
    },
    { headers: noStoreHeaders() }
  );
}
