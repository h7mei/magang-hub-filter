import type { FeatureCollection, Point } from "geojson";
import type MapLibreGL from "maplibre-gl";
import { Building2 } from "lucide-react";
import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { MapMarker, MarkerContent, useMap } from "@/components/ui/map";
import { cn } from "@/lib/utils";
import type { CompanyMapProperties } from "@/types";

type MapCompanyMarkersLayerProps = {
  data: FeatureCollection<Point, CompanyMapProperties>;
  selectedMarkerId?: string | null;
  clusterMaxZoom?: number;
  clusterRadius?: number;
  onCompanyClick?: (
    company: CompanyMapProperties,
    coordinates: [number, number],
  ) => void;
};

const CLUSTER_COLORS: [string, string, string] = ["#3b82f6", "#1d4ed8", "#1e3a8a"];
const CLUSTER_THRESHOLDS: [number, number] = [25, 100];

const failedLogoUrls = new Set<string>();
const loadedLogoUrls = new Set<string>();

function parseCompanyProperties(
  properties: MapLibreGL.GeoJSONFeature["properties"],
): CompanyMapProperties | null {
  if (!properties || typeof properties !== "object") return null;

  const companyName = properties.company_name;
  if (typeof companyName !== "string") return null;

  const longitude = Number(properties.longitude);
  const latitude = Number(properties.latitude);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;

  const markerId =
    typeof properties.marker_id === "string"
      ? properties.marker_id
      : `${companyName}@${longitude},${latitude}`;

  return {
    marker_id: markerId,
    company_name: companyName,
    company_logo_url:
      typeof properties.company_logo_url === "string" ? properties.company_logo_url : undefined,
    company_email:
      typeof properties.company_email === "string" ? properties.company_email : undefined,
    company_phone:
      typeof properties.company_phone === "string" ? properties.company_phone : undefined,
    location: typeof properties.location === "string" ? properties.location : undefined,
    latitude,
    longitude,
    position_count: Number(properties.position_count) || 0,
    total_quota: Number(properties.total_quota) || 0,
  };
}

function markerCoordinates(company: CompanyMapProperties): [number, number] {
  return [company.longitude ?? 0, company.latitude ?? 0];
}

function preloadLogoUrl(url: string) {
  if (!url || loadedLogoUrls.has(url) || failedLogoUrls.has(url)) return;

  const image = new Image();
  image.decoding = "async";
  image.onload = () => {
    loadedLogoUrls.add(url);
  };
  image.onerror = () => {
    failedLogoUrls.add(url);
  };
  image.src = url;
}

const CompanyLogoMarker = memo(function CompanyLogoMarker({
  company,
  selected,
}: {
  company: CompanyMapProperties;
  selected: boolean;
}) {
  const logoUrl = company.company_logo_url;
  const [failed, setFailed] = useState(() => Boolean(logoUrl && failedLogoUrls.has(logoUrl)));

  useEffect(() => {
    if (!logoUrl || failedLogoUrls.has(logoUrl)) {
      setFailed(true);
      return;
    }

    if (loadedLogoUrls.has(logoUrl)) {
      setFailed(false);
      return;
    }

    preloadLogoUrl(logoUrl);
  }, [logoUrl]);

  const showLogo = Boolean(logoUrl && !failed && !failedLogoUrls.has(logoUrl));

  return (
    <MarkerContent className="flex flex-col items-center">
      <div
        className={cn(
          "relative flex size-11 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white shadow-md transition-transform",
          selected && "scale-110 ring-2 ring-primary ring-offset-2",
        )}
      >
        {showLogo ? (
          <img
            src={logoUrl}
            alt={`${company.company_name} logo`}
            className="size-full object-contain p-1.5"
            loading="lazy"
            decoding="async"
            onLoad={() => {
              if (logoUrl) loadedLogoUrls.add(logoUrl);
            }}
            onError={() => {
              if (logoUrl) failedLogoUrls.add(logoUrl);
              setFailed(true);
            }}
          />
        ) : (
          <Building2 className="size-5 text-muted-foreground" />
        )}
      </div>
    </MarkerContent>
  );
});

function VisibleCompanyLogoMarkers({
  data,
  unclusteredLayerId,
  selectedMarkerId,
  onCompanyClick,
}: {
  data: FeatureCollection<Point, CompanyMapProperties>;
  unclusteredLayerId: string;
  selectedMarkerId?: string | null;
  onCompanyClick?: (
    company: CompanyMapProperties,
    coordinates: [number, number],
  ) => void;
}) {
  const { map, isLoaded } = useMap();
  const [visibleMarkers, setVisibleMarkers] = useState<
    Array<{ company: CompanyMapProperties; coordinates: [number, number] }>
  >([]);

  const markersById = useMemo(() => {
    const lookup = new Map<string, { company: CompanyMapProperties; coordinates: [number, number] }>();
    for (const feature of data.features) {
      if (feature.geometry.type !== "Point") continue;
      const company = feature.properties;
      if (!company?.marker_id || company.longitude == null || company.latitude == null) continue;
      lookup.set(company.marker_id, {
        company,
        coordinates: [company.longitude, company.latitude],
      });
    }
    return lookup;
  }, [data]);

  const refreshVisibleMarkers = useCallback(() => {
    if (!map || !map.getLayer(unclusteredLayerId)) return;

    const features = map.queryRenderedFeatures(undefined, { layers: [unclusteredLayerId] });
    const deduped = new Map<
      string,
      { company: CompanyMapProperties; coordinates: [number, number] }
    >();

    for (const feature of features) {
      const parsed = parseCompanyProperties(feature.properties);
      if (!parsed) continue;

      const fromData = markersById.get(parsed.marker_id ?? "");
      const company = fromData?.company ?? parsed;
      const coordinates = fromData?.coordinates ?? markerCoordinates(parsed);
      deduped.set(parsed.marker_id ?? parsed.company_name, { company, coordinates });

      if (company.company_logo_url) {
        preloadLogoUrl(company.company_logo_url);
      }
    }

    setVisibleMarkers([...deduped.values()]);
  }, [map, markersById, unclusteredLayerId]);

  useEffect(() => {
    if (!isLoaded || !map) return;

    refreshVisibleMarkers();
    map.on("moveend", refreshVisibleMarkers);
    map.on("zoomend", refreshVisibleMarkers);
    map.on("sourcedata", refreshVisibleMarkers);

    return () => {
      map.off("moveend", refreshVisibleMarkers);
      map.off("zoomend", refreshVisibleMarkers);
      map.off("sourcedata", refreshVisibleMarkers);
    };
  }, [isLoaded, map, refreshVisibleMarkers]);

  return (
    <>
      {visibleMarkers.map(({ company, coordinates }) => (
        <MapMarker
          key={company.marker_id ?? `${company.company_name}-${coordinates.join(",")}`}
          longitude={coordinates[0]}
          latitude={coordinates[1]}
          anchor="center"
          onClick={() => onCompanyClick?.(company, coordinates)}
        >
          <CompanyLogoMarker
            company={company}
            selected={selectedMarkerId === company.marker_id}
          />
        </MapMarker>
      ))}
    </>
  );
}

export function MapCompanyMarkersLayer({
  data,
  selectedMarkerId,
  clusterMaxZoom = 11,
  clusterRadius = 56,
  onCompanyClick,
}: MapCompanyMarkersLayerProps) {
  const { map, isLoaded } = useMap();
  const reactId = useId();
  const sourceId = `company-map-source-${reactId}`;
  const clusterLayerId = `company-map-clusters-${reactId}`;
  const clusterCountLayerId = `company-map-cluster-count-${reactId}`;
  const unclusteredLayerId = `company-map-unclustered-${reactId}`;

  const onCompanyClickRef = useRef(onCompanyClick);
  onCompanyClickRef.current = onCompanyClick;

  useEffect(() => {
    if (!isLoaded || !map) return;

    map.addSource(sourceId, {
      type: "geojson",
      data,
      cluster: true,
      clusterMaxZoom,
      clusterRadius,
      promoteId: "marker_id",
    });

    map.addLayer({
      id: clusterLayerId,
      type: "circle",
      source: sourceId,
      filter: ["has", "point_count"],
      paint: {
        "circle-color": [
          "step",
          ["get", "point_count"],
          CLUSTER_COLORS[0],
          CLUSTER_THRESHOLDS[0],
          CLUSTER_COLORS[1],
          CLUSTER_THRESHOLDS[1],
          CLUSTER_COLORS[2],
        ],
        "circle-radius": [
          "step",
          ["get", "point_count"],
          18,
          CLUSTER_THRESHOLDS[0],
          26,
          CLUSTER_THRESHOLDS[1],
          34,
        ],
        "circle-stroke-width": 0.75,
        "circle-stroke-color": "#fff",
        "circle-opacity": 0.9,
      },
    });

    map.addLayer({
      id: clusterCountLayerId,
      type: "symbol",
      source: sourceId,
      filter: ["has", "point_count"],
      layout: {
        "text-field": "{point_count_abbreviated}",
        "text-font": ["Open Sans Semibold"],
        "text-size": 11,
      },
      paint: {
        "text-color": "#fff",
      },
    });

    map.addLayer({
      id: unclusteredLayerId,
      type: "circle",
      source: sourceId,
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-radius": 18,
        "circle-opacity": 0,
      },
    });

    return () => {
      try {
        if (map.getLayer(clusterCountLayerId)) map.removeLayer(clusterCountLayerId);
        if (map.getLayer(unclusteredLayerId)) map.removeLayer(unclusteredLayerId);
        if (map.getLayer(clusterLayerId)) map.removeLayer(clusterLayerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {
        // ignore cleanup races
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, map, sourceId]);

  useEffect(() => {
    if (!isLoaded || !map) return;
    const source = map.getSource(sourceId) as MapLibreGL.GeoJSONSource | undefined;
    source?.setData(data);
  }, [data, isLoaded, map, sourceId]);

  useEffect(() => {
    if (!isLoaded || !map) return;

    const handleClusterClick = async (
      event: MapLibreGL.MapMouseEvent & { features?: MapLibreGL.MapGeoJSONFeature[] },
    ) => {
      const features = map.queryRenderedFeatures(event.point, { layers: [clusterLayerId] });
      if (!features.length) return;

      const feature = features[0];
      const clusterId = feature.properties?.cluster_id as number;
      const coordinates = (feature.geometry as Point).coordinates as [number, number];
      const source = map.getSource(sourceId) as MapLibreGL.GeoJSONSource;
      const zoom = await source.getClusterExpansionZoom(clusterId);
      map.easeTo({ center: coordinates, zoom });
    };

    const handlePointClick = (
      event: MapLibreGL.MapMouseEvent & { features?: MapLibreGL.MapGeoJSONFeature[] },
    ) => {
      const feature = event.features?.[0];
      if (!feature) return;

      const company = parseCompanyProperties(feature.properties);
      if (!company) return;

      const coordinates = markerCoordinates(company);
      onCompanyClickRef.current?.(company, coordinates);
    };

    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = "";
    };

    map.on("click", clusterLayerId, handleClusterClick);
    map.on("click", unclusteredLayerId, handlePointClick);
    map.on("mouseenter", clusterLayerId, handleMouseEnter);
    map.on("mouseleave", clusterLayerId, handleMouseLeave);
    map.on("mouseenter", unclusteredLayerId, handleMouseEnter);
    map.on("mouseleave", unclusteredLayerId, handleMouseLeave);

    return () => {
      map.off("click", clusterLayerId, handleClusterClick);
      map.off("click", unclusteredLayerId, handlePointClick);
      map.off("mouseenter", clusterLayerId, handleMouseEnter);
      map.off("mouseleave", clusterLayerId, handleMouseLeave);
      map.off("mouseenter", unclusteredLayerId, handleMouseEnter);
      map.off("mouseleave", unclusteredLayerId, handleMouseLeave);
    };
  }, [isLoaded, map, clusterLayerId, unclusteredLayerId, sourceId]);

  const layerReady = useMemo(() => isLoaded && Boolean(map), [isLoaded, map]);

  if (!layerReady) return null;

  return (
    <VisibleCompanyLogoMarkers
      data={data}
      unclusteredLayerId={unclusteredLayerId}
      selectedMarkerId={selectedMarkerId}
      onCompanyClick={onCompanyClick}
    />
  );
}
