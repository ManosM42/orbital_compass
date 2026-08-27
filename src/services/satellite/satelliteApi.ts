/**
 * Public data API for the client: thin server-function wrappers around the
 * server-only provider layer. No credentials or provider URLs reach the browser.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type {
  CatalogIndexPayload,
  IssCrewResult,
  TleFetchResult,
  TleGroup,
} from "./satelliteTypes";

const groupSchema = z.object({
  group: z.enum(["stations", "starlink", "weather", "gnss", "science", "resource"]),
  limit: z.number().int().positive().max(2000).optional(),
});

const idsSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(200),
});

export const fetchTleGroup = createServerFn({ method: "GET" })
  .inputValidator((input: { group: TleGroup; limit?: number }) => groupSchema.parse(input))
  .handler(async ({ data }): Promise<TleFetchResult> => {
    const { getGroup } = await import("./satelliteProviders.server");
    return getGroup(data.group, data.limit);
  });

export const fetchIssCrew = createServerFn({ method: "GET" }).handler(
  async (): Promise<IssCrewResult> => {
    const { getIssCrew } = await import("./satelliteProviders.server");
    return getIssCrew();
  },
);

/** Identifiers for the whole retrievable catalog — no positions, no TLEs. */
export const fetchCatalogIndex = createServerFn({ method: "GET" }).handler(
  async (): Promise<CatalogIndexPayload> => {
    const { getCatalogIndex } = await import("./satelliteProviders.server");
    return getCatalogIndex();
  },
);

/** Full element sets for explicitly requested objects (search selection). */
export const fetchSatelliteRecords = createServerFn({ method: "GET" })
  .inputValidator((input: { ids: number[] }) => idsSchema.parse(input))
  .handler(async ({ data }): Promise<TleFetchResult> => {
    const { getRecordsByIds } = await import("./satelliteProviders.server");
    return getRecordsByIds(data.ids);
  });
