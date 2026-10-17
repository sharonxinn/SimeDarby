export type SiteType = 'rooftop' | 'carpark';

export type BuildingCategory =
  | 'Commercial'
  | 'Public Facility'
  | 'Industrial & Logistics'
  | 'Educational'
  | 'Residential Deck'
  | 'Utility & Infrastructure';

export interface SiteFlags {
  roofConditionVerified: boolean;
  structuralInspectionDone: boolean;
  shadingAssessed: boolean;
  gridCapacityConfirmed: boolean;
  notes: string[];
}

export interface EVDetails {
  baysFeasible: number;
  recommendedACChargers: number;
  recommendedDCChargers: number;
  dailyChargingSessionsEstimate: number;
  dailyCleanKmPotential: number;
}

export interface SiteScores {
  generationScore: number;
  demandMatchScore: number;
  feasibilityScore: number;
  environmentalScore: number;
  evSynergyScore: number;
  totalCompositeScore: number;
}

export interface SolarSite {
  id: string;
  name: string;
  code: string;
  type: SiteType;
  category: BuildingCategory;
  zone: string;
  coordinates: [number, number]; // [lat, lng]
  polygon: [number, number][]; // Geo polygon bounds for building
  footprintSqM: number;
  usableAreaSqM: number;
  usableRatio: number;
  estimatedKWp: number;
  azimuthDeg: number;
  tiltDeg: number;
  solarGHIKWhM2Year: number;
  annualGenerationKWh: number;
  peakDemandKW: number;
  daytimeDemandRatio: number; // 0.0 - 1.0
  hourlyDemandProfile: number[]; // 24 values (kW)
  selfConsumptionPct: number; // %
  roofCondition: 'Excellent' | 'Good' | 'Fair - Reinforcement Req.' | 'Structure Canopy Req.';
  structuralSuitability: 'High (Concrete Slab)' | 'Medium (Metal Deck)' | 'Canopy Framing Required';
  shadingFactorPct: number; // 0 to 100%
  substationDistanceM: number;
  flags: SiteFlags;
  evDetails?: EVDetails;
  scores: SiteScores;
  aiRecommendationRationale: string;
}

export type ScenarioId = 'A' | 'B' | 'C' | 'custom';

export interface ScenarioDefinition {
  id: ScenarioId;
  name: string;
  shortDesc: string;
  longDesc: string;
  targetSiteIds: string[];
}

export interface MCDAWeights {
  generation: number; // 0 - 100
  demandMatch: number; // 0 - 100
  feasibility: number; // 0 - 100
  environmental: number; // 0 - 100
  evSynergy: number; // 0 - 100
}

export interface ScenarioMetrics {
  scenarioId: ScenarioId;
  scenarioName: string;
  selectedSiteIds: string[];
  totalSitesCount: number;
  totalCapacityKWp: number;
  totalUsableAreaSqM: number;
  annualSolarGenerationMWh: number;
  gridDisplacedMWh: number;
  gridExportMWh: number;
  selfConsumptionPct: number;
  annualCostSavingsMYR: number;
  avoidedCO2Tonnes: number;
  estimatedCapExMYR: number;
  simplePaybackYears: number;
  evKmPoweredPerYear: number;
  evSessionsPerYear: number;
}

export interface HourlyEnergyFlow {
  hour: number;
  hourLabel: string;
  solarGenerationKW: number;
  buildingDemandKW: number;
  evDemandKW: number;
  selfConsumedKW: number;
  gridExportKW: number;
  gridImportKW: number;
}

export interface TownshipConfig {
  name: string;
  developer: string;
  location: string;
  coordinates: [number, number];
  zoom: number;
  gridEmissionFactor: number; // kg CO2 / kWh (e.g. 0.758 for Malaysia Peninsular)
  tariffCommercialMYR: number; // RM per kWh
  tariffResidentialMYR: number; // RM per kWh
  exportTariffMYR: number; // NEM offset tariff
  solarUnitCostMYRPerKWp: number; // Rooftop standard
  canopyUnitCostMYRPerKWp: number; // Car park canopy standard
}
