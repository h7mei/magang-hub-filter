import type MapLibreGL from "maplibre-gl";

export const FALLBACK_LOGO_ICON_ID = "company-logo-fallback";

const logoLoadPromises = new Map<string, Promise<boolean>>();
const failedLogoUrls = new Set<string>();

export function logoImageId(url: string): string {
  let hash = 0;
  for (let index = 0; index < url.length; index += 1) {
    hash = (hash << 5) - hash + url.charCodeAt(index);
    hash |= 0;
  }
  return `company-logo-${Math.abs(hash)}`;
}

export function createFallbackLogoImage(size = 48): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to create fallback logo canvas");
  }

  context.fillStyle = "#ffffff";
  context.beginPath();
  context.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = "#cbd5e1";
  context.lineWidth = 2;
  context.stroke();

  context.fillStyle = "#64748b";
  context.font = "bold 18px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("Co", size / 2, size / 2);

  return context.getImageData(0, 0, size, size);
}

export function ensureFallbackLogoIcon(map: MapLibreGL.Map) {
  if (map.hasImage(FALLBACK_LOGO_ICON_ID)) return;
  map.addImage(FALLBACK_LOGO_ICON_ID, createFallbackLogoImage(), { pixelRatio: 2 });
}

export async function loadLogoIcon(map: MapLibreGL.Map, url: string, iconId: string): Promise<boolean> {
  if (map.hasImage(iconId)) return true;
  if (failedLogoUrls.has(url)) return false;

  const cacheKey = `${iconId}:${url}`;
  const existing = logoLoadPromises.get(cacheKey);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const image = await map.loadImage(url);
      if (!map.hasImage(iconId)) {
        map.addImage(iconId, image.data, { pixelRatio: 2 });
      }
      return true;
    } catch {
      failedLogoUrls.add(url);
      return false;
    } finally {
      logoLoadPromises.delete(cacheKey);
    }
  })();

  logoLoadPromises.set(cacheKey, promise);
  return promise;
}

export async function preloadVisibleCompanyLogos(
  map: MapLibreGL.Map,
  options: {
    sourceId: string;
    layerId: string;
  },
): Promise<void> {
  ensureFallbackLogoIcon(map);
  if (!map.getLayer(options.layerId)) return;

  const features = map.queryRenderedFeatures(undefined, { layers: [options.layerId] });
  const pending = new Map<string, { url: string; markerIds: string[] }>();

  for (const feature of features) {
    const url = feature.properties?.company_logo_url;
    const markerId = feature.properties?.marker_id;
    if (typeof url !== "string" || !url || typeof markerId !== "string") continue;

    const iconId = logoImageId(url);
    if (map.hasImage(iconId)) {
      map.setFeatureState({ source: options.sourceId, id: markerId }, { logo_loaded: true });
      continue;
    }
    if (failedLogoUrls.has(url)) continue;

    const bucket = pending.get(iconId) ?? { url, markerIds: [] };
    bucket.markerIds.push(markerId);
    pending.set(iconId, bucket);
  }

  if (pending.size === 0) return;

  await Promise.all(
    [...pending.entries()].map(async ([iconId, { url, markerIds }]) => {
      const loaded = await loadLogoIcon(map, url, iconId);
      if (!loaded) return;

      for (const markerId of markerIds) {
        try {
          map.setFeatureState({ source: options.sourceId, id: markerId }, { logo_loaded: true });
        } catch {
          // Feature may have been removed between query and load.
        }
      }
    }),
  );

  map.triggerRepaint();
}
