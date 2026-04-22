import fs from "fs";
import path from "path";

interface ZoneFeature {
  properties: {
    School_Name: string;
    ENTITY_CODE: number;
    Year_Level: string;
  };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
}

export interface SchoolZone {
  name: string;
  entityCode: number;
  yearLevel: string;
}

let _primaryZones: ZoneFeature[] | null = null;
let _secondaryZones: ZoneFeature[] | null = null;

function loadFeatures(filename: string): ZoneFeature[] {
  const file = path.join(process.cwd(), "data", filename);
  if (!fs.existsSync(file)) return [];
  const data = JSON.parse(fs.readFileSync(file, "utf-8"));
  return data.features ?? [];
}

function getPrimaryZones(): ZoneFeature[] {
  if (!_primaryZones) _primaryZones = loadFeatures("school_zones_primary.geojson");
  return _primaryZones;
}

function getSecondaryZones(): ZoneFeature[] {
  if (!_secondaryZones) _secondaryZones = loadFeatures("school_zones_secondary.geojson");
  return _secondaryZones;
}

// Ray-casting point-in-polygon (ring is array of [lng, lat] pairs)
function pointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function pointInPolygon(lng: number, lat: number, rings: number[][][]): boolean {
  if (!pointInRing(lng, lat, rings[0])) return false;
  for (let i = 1; i < rings.length; i++) {
    if (pointInRing(lng, lat, rings[i])) return false; // inside a hole
  }
  return true;
}

function pointInGeometry(lng: number, lat: number, geom: ZoneFeature["geometry"]): boolean {
  if (geom.type === "Polygon") {
    return pointInPolygon(lng, lat, geom.coordinates as number[][][]);
  }
  if (geom.type === "MultiPolygon") {
    for (const rings of geom.coordinates as number[][][][]) {
      if (pointInPolygon(lng, lat, rings)) return true;
    }
  }
  return false;
}

export function lookupCatchment(lat: number, lng: number): {
  primary: SchoolZone | null;
  secondary: SchoolZone | null;
} {
  let primary: SchoolZone | null = null;
  let secondary: SchoolZone | null = null;

  try {
    for (const f of getPrimaryZones()) {
      if (pointInGeometry(lng, lat, f.geometry)) {
        primary = {
          name: f.properties.School_Name,
          entityCode: f.properties.ENTITY_CODE,
          yearLevel: f.properties.Year_Level,
        };
        break;
      }
    }
  } catch { /* zone data unavailable */ }

  try {
    for (const f of getSecondaryZones()) {
      if (pointInGeometry(lng, lat, f.geometry)) {
        secondary = {
          name: f.properties.School_Name,
          entityCode: f.properties.ENTITY_CODE,
          yearLevel: f.properties.Year_Level,
        };
        break;
      }
    }
  } catch { /* zone data unavailable */ }

  return { primary, secondary };
}
