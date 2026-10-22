export interface RoofRegion { id: string; name: string; label: string; coordinates: [number, number]; zoom: number; sourceUrl: string }
export interface RoofBuilding { id: string; name: string; outline: [number, number][]; coordinates: [number, number]; areaSqM: number; buildingType: string; sourceUrl: string }
export interface BuildingResponse { buildings: RoofBuilding[]; truncated: boolean; cached: boolean; fetchedAt: string; coverageNote: string }
export type RankingCriterion = 'generation' | 'savings' | 'payback' | 'evSolarShare' | 'area';
export interface BuildingRanking {
  kind: 'modelled'; sortBy: RankingCriterion; total: number; basis: string; limitations: string;
  rows: { id: string; name: string; rank: number | null; footprintSqM: number; proposedKWp: number;
    annualACKWh: number | null; annualSavingsMYR: number | null; paybackYears: number | null;
    capexMYR: number; evSolarSharePct: number | null; evChargers: number; hasSiteRecords: boolean }[];
}
export interface SiteEvidence {
  sourceReference: string; sourceDate: string; periodStart: string; periodEnd: string; measurementBoundary: string;
  dataCenterStatus: 'not_assessed' | 'operating' | 'proposed' | 'not_present'; verificationStatus?: string; notes?: string;
  surveyedUsableRoofSqM?: number; installedSolarKWp?: number; siteElectricityKWh?: number; solarGenerationKWh?: number;
  solarSelfConsumedKWh?: number; peakDemandKW?: number; confirmedSupplyKW?: number; parkingBays?: number;
  existingEVChargers?: number; evChargingKWh?: number; itElectricityKWh?: number; waterLitres?: number; totalEmissionsKgCO2e?: number;
}
export interface SiteMetrics {
  mappedFootprintSqM: number; surveyedUsableRoofSqM: number | null; installedSolarKWp: number | null;
  siteElectricityKWh: number | null; solarGenerationKWh: number | null; solarSelfConsumedKWh: number | null;
  peakDemandKW: number | null; confirmedSupplyKW: number | null; parkingBays: number | null; existingEVChargers: number | null;
  evChargingKWh: number | null; itElectricityKWh: number | null; waterLitres: number | null; totalEmissionsKgCO2e: number | null;
  solarSelfConsumptionPct: number | null; solarDemandCoveragePct: number | null; recordedSupplyMarginKW: number | null;
  pue: number | null; wueLitresPerKWhIT: number | null; cueKgCO2ePerKWhIT: number | null;
  recommendedSolarKWp: null; annualGenerationForecastKWh: null; annualSavingsMYR: null; simplePaybackYears: null; recommendedEVChargers: null;
}
export interface GuidanceReference { title: string; url: string; reviewedOn: string }
export interface SitePlan {
  siteKey: string; siteName: string; coordinates: [number, number]; evidenceStatus: string; dataCenterStatus: string;
  metrics: SiteMetrics; topics: { id: string; title: string; status: string; basis: string; missing: string[]; actions: string[]; references: GuidanceReference[] }[];
  references: GuidanceReference[]; calculationNotes: string[];
  regionalDataCentreContext: { scope: string; limitations: string; records: { name: string; location: string; fact: string; sourceUrl: string; checkedOn: string }[] };
}
export interface ScenarioInputs {
  usableRoofPct: number; panelWatts: number; panelAreaSqM: number; dcLossPct: number; inverterEfficiencyPct: number;
  selfConsumptionPct: number; capexPerKWpMYR: number; capexRangePct: number; tariffMYRPerKWh: number; gridFactorKgPerKWh: number;
  evChargers: number; evChargerKW: number; evHoursPerDay: number; evUtilisationPct: number; evSolarAllocationPct: number;
}
export interface ImplementationScenario {
  kind: 'modelled'; updatedAt: string; inputs: ScenarioInputs;
  resource: { year: number; days: number; annualGHI: number; coordinates: number[]; distanceKm: number; sourceUrl: string; importedAt: string; sha256: string; description: string } | null;
  usableAreaSqM: number; areaBasis: string; panels: number; proposedKWp: number;
  annualDCKWh: number | null; annualACKWh: number | null; annualSelfConsumedKWh: number | null;
  capexMYR: number; capexLowMYR: number; capexHighMYR: number; annualSavingsMYR: number | null; paybackYears: number | null; annualCO2Tonnes: number | null;
  ev: { connectedKW: number; annualChargingKWh: number; pvAllocatedKWh: number | null; annualSolarSharePct: number | null; remainingGridKWh: number | null; recordedSupplyMarginKW: number | null; supplyCheck: string };
  warnings: string[]; formulas: string[]; references: { title: string; url: string }[];
}
export interface RoofAssessment {
  id: string; dataMode: 'evidence_only'; createdAt: string; siteKey: string; name: string;
  buildingId: string | null; outline: [number, number][]; coordinates: [number, number]; footprintSqM: number;
  buildingType: string; tags: Record<string, string>; geometryNote: string;
  sources: { geometry: string; geometryUrl: string | null; geometryFetchedAt: string | null };
  evidence: SiteEvidence | null; metrics: SiteMetrics; plan: SitePlan; scenario: ImplementationScenario;
}
export interface DataStatus {
  dataMode: string; recordedSites: number; mappedBuildings: number; assessments: number;
  solar: { rows: number; start: string | null; end: string | null }; electricity: { rows: number; start: string | null; end: string | null };
  meterRows: number; latestElectricity: { date: string; sector: string; consumption_million_kwh: number }[];
  runs: { id: string; source: string; started_at: string; status: string; row_count: number; source_url: string; sha256: string | null; error: string | null }[];
  limitations: string[];
}
export const STARTER_REGIONS: RoofRegion[] = [
  { id: 'sungai-buloh', name: 'Sungai Buloh', label: 'Sungai Buloh, Selangor — near the station', coordinates: [3.2062441, 101.5799923], zoom: 18, sourceUrl: 'https://www.openstreetmap.org/way/1073736705' },
  { id: 'kota-damansara', name: 'Kota Damansara', label: 'Kota Damansara, Petaling Jaya, Selangor', coordinates: [3.1536719, 101.5935440], zoom: 18, sourceUrl: 'https://www.openstreetmap.org/relation/11275860' },
];
