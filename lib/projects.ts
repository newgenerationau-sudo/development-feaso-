export interface Project {
  id: string;
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  lat: number;
  lng: number;
  price: number;
  type: "Subdivision" | "Dual Occupancy" | "Multi-Unit" | "Townhouse" | "Apartment";
  description: string;
  bedrooms?: number;
  landSize?: number;
  units?: number;
  reportFile?: string; // private PDF filename
  reportDate?: string;
  isReal?: boolean;    // real report available for purchase
}

// ── REAL REPORTS (available for purchase) ──────────────────────────────────
export const REAL_PROJECTS: Project[] = [
  {
    id: "real-001",
    address: "8-10 Barkly Street",
    suburb: "Box Hill",
    state: "VIC",
    postcode: "3128",
    lat: -37.8193,
    lng: 145.1228,
    price: 50,
    type: "Multi-Unit",
    description: "Proposed 12-unit development on a 1,865m² double allotment. Units ranging from 200–210m² each. Preliminary massing study completed by ST Architects.",
    landSize: 1865,
    units: 12,
    reportFile: "8-10 BARKLY STREET BOX HILL 250730.pdf",
    reportDate: "30 Jul 2025",
    isReal: true,
  },
  {
    id: "real-002",
    address: "4-6 Morris West Circuit",
    suburb: "Lynbrook",
    state: "VIC",
    postcode: "3975",
    lat: -38.0593,
    lng: 145.2568,
    price: 50,
    type: "Multi-Unit",
    description: "Proposed 9-unit development on a 1,914m² site. All units 200m². Excellent yield potential in growing south-east Melbourne corridor.",
    landSize: 1914,
    units: 9,
    reportFile: "4-6S MORRIS WEST CIRCUIT LYNBROOK 250728.pdf",
    reportDate: "28 Jul 2025",
    isReal: true,
  },
  {
    id: "real-003",
    address: "23 Pamay Road",
    suburb: "Mount Waverley",
    state: "VIC",
    postcode: "3149",
    lat: -37.8698,
    lng: 145.1189,
    price: 50,
    type: "Multi-Unit",
    description: "Proposed 3-unit development on a 979m² block. Units of 240m², 240m², and 270m². Subject to council approval and trees removal assessment.",
    landSize: 979,
    units: 3,
    reportFile: "23 PAMAY ROAD MOUNT WAVERLEY 250701.pdf",
    reportDate: "1 Jul 2025",
    isReal: true,
  },
  {
    id: "real-004",
    address: "20 Toolang Court",
    suburb: "Mount Waverley",
    state: "VIC",
    postcode: "3149",
    lat: -37.8747,
    lng: 145.1247,
    price: 50,
    type: "Dual Occupancy",
    description: "Proposed 2-unit development on a 730m² court block. Two generous units of 380m² each. Subject to council approval and site survey.",
    landSize: 731,
    units: 2,
    reportFile: "20 TOOLANG COURT MOUNT WAVERLEY 250707.pdf",
    reportDate: "7 Jul 2025",
    isReal: true,
  },
  {
    id: "real-005",
    address: "21 Gracedale Avenue",
    suburb: "Ringwood East",
    state: "VIC",
    postcode: "3135",
    lat: -37.8208,
    lng: 145.2372,
    price: 50,
    type: "Multi-Unit",
    description: "Proposed 3-unit development on a 995m² block. Units of 300m², 220m², and 220m². Subject to council approval and title restriction review.",
    landSize: 996,
    units: 3,
    reportFile: "21 GRACEDALE AVENUE RINGWOOD EAST 250626.pdf",
    reportDate: "26 Jun 2025",
    isReal: true,
  },
];

// ── ADDITIONAL EXAMPLE PROJECTS ────────────────────────────────────────────
export const EXAMPLE_PROJECTS: Project[] = [
  {
    id: "proj-006",
    address: "56 Brunswick Street",
    suburb: "Fitzroy",
    state: "VIC",
    postcode: "3065",
    lat: -37.7988,
    lng: 144.9784,
    price: 50,
    type: "Subdivision",
    description: "Generous 1,100m² block in Fitzroy. Subdivision potential into two titles with secondary dwelling.",
    landSize: 1100,
    isReal: false,
  },
  {
    id: "proj-007",
    address: "100 Pitt Street",
    suburb: "Sydney",
    state: "NSW",
    postcode: "2000",
    lat: -33.8688,
    lng: 151.2093,
    price: 50,
    type: "Apartment",
    description: "Premium CBD site. Pre-DA consultation completed. Potential for 18-storey residential tower.",
    landSize: 480,
    isReal: false,
  },
  {
    id: "proj-008",
    address: "88 Queen Street",
    suburb: "Brisbane City",
    state: "QLD",
    postcode: "4000",
    lat: -27.4698,
    lng: 153.0251,
    price: 50,
    type: "Apartment",
    description: "Inner-city Brisbane site within the Priority Development Area. Strong case for 10+ storey residential.",
    landSize: 550,
    isReal: false,
  },
];

export const PROJECTS: Project[] = [...REAL_PROJECTS, ...EXAMPLE_PROJECTS];
