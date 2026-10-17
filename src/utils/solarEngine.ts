import {
  SolarSite,
  MCDAWeights,
  ScenarioDefinition,
  ScenarioId,
  ScenarioMetrics,
  HourlyEnergyFlow,
  TownshipConfig,
  SiteScores,
} from '../types/solar';
import { NORMALIZED_HOURLY_SOLAR } from '../data/townshipSites';

export const DEFAULT_MCDA_WEIGHTS: MCDAWeights = {
  generation: 25,
  demandMatch: 30,
  feasibility: 20,
  environmental: 15,
  evSynergy: 10,
};

export const SCENARIO_DEFINITIONS: ScenarioDefinition[] = [
  {
    id: 'A',
    name: 'Scenario A: Max Rooftop Area',
    shortDesc: 'Largest Available Rooftops',
    longDesc:
      'Prioritises the largest physical rooftops across the township. Maximises gross raw kilowatt-peak generation, but accepts lower self-consumption and higher grid export dependence.',
    targetSiteIds: [
      'ELM-LOG-04', // 11,200 m² (Logistics Warehouse)
      'ELM-COM-05', // 5,200 m² (Temu Arcade)
      'ELM-COM-01', // 4,100 m² (Lakeside Promenade)
      'ELM-EDU-07', // 3,200 m² (Community School)
      'ELM-COM-09', // 2,600 m² (Aria Suites)
    ],
  },
  {
    id: 'B',
    name: 'Scenario B: High Daytime Demand',
    shortDesc: 'Maximum Self-Consumption & Grid Offset',
    longDesc:
      'Prioritises facilities with high daytime electricity consumption (retail, commercial offices, water treatment). Delivers immediate operational cost savings with over 90% self-consumption without battery storage.',
    targetSiteIds: [
      'ELM-COM-05', // 94% self-consumption (Temu Arcade)
      'ELM-COM-01', // 91% self-consumption (Lakeside Promenade)
      'ELM-UTL-10', // 96% self-consumption (Water Depot)
      'ELM-COM-09', // 92% self-consumption (Aria Suites)
      'ELM-PUB-02', // 82% self-consumption (Wellness Clubhouse)
    ],
  },
  {
    id: 'C',
    name: 'Scenario C: Solar + EV Car Parks',
    shortDesc: 'Hybrid Commercial & EV Canopy Infrastructure',
    longDesc:
      'Combines high-performing commercial rooftops with solar car park canopies and EV charging hubs. Directly energises EV fleets while providing sheltered parking and superior township climate resilience.',
    targetSiteIds: [
      'ELM-COM-05', // Rooftop Commercial
      'ELM-COM-01', // Rooftop Commercial
      'ELM-PRK-03', // Car Park P1 (42 EV Bays)
      'ELM-PRK-06', // Car Park P2 (32 EV Bays)
      'ELM-RES-08', // Residential Deck (26 EV Bays)
    ],
  },
];

/**
 * Re-calculate dynamic MCDA scores for a site given custom weights
 */
export function calculateDynamicScores(site: SolarSite, weights: MCDAWeights): SiteScores {
  // Normalize weight sum
  const totalWeight =
    (weights.generation +
      weights.demandMatch +
      weights.feasibility +
      weights.environmental +
      weights.evSynergy) || 100;

  const wGen = weights.generation / totalWeight;
  const wDem = weights.demandMatch / totalWeight;
  const wFeas = weights.feasibility / totalWeight;
  const wEnv = weights.environmental / totalWeight;
  const wEV = weights.evSynergy / totalWeight;

  // Raw sub-scores (0-100)
  // Generation: based on kWp relative to max 1800 kWp
  const genScore = Math.min(100, Math.round((site.estimatedKWp / 1750) * 100));

  // Demand match: based directly on selfConsumptionPct & daytime ratio
  const demScore = Math.min(
    100,
    Math.round(site.selfConsumptionPct * 0.7 + site.daytimeDemandRatio * 100 * 0.3)
  );

  // Feasibility: roof condition, shading, structural load, substation distance
  let feasBase = 70;
  if (site.roofCondition === 'Excellent') feasBase += 15;
  else if (site.roofCondition === 'Good') feasBase += 10;
  else if (site.roofCondition === 'Fair - Reinforcement Req.') feasBase -= 10;

  if (site.structuralSuitability === 'High (Concrete Slab)') feasBase += 10;
  else if (site.structuralSuitability === 'Medium (Metal Deck)') feasBase += 5;

  if (site.shadingFactorPct < 3) feasBase += 5;
  else if (site.shadingFactorPct > 6) feasBase -= 8;

  if (site.substationDistanceM <= 30) feasBase += 5;
  else if (site.substationDistanceM > 80) feasBase -= 8;

  const feasScore = Math.max(40, Math.min(100, feasBase));

  // Environmental: avoided carbon per square meter footprint
  const envScore = Math.min(
    100,
    Math.round((site.annualGenerationKWh * 0.758) / (site.footprintSqM * 0.28))
  );

  // EV synergy: whether car park, bay capacity, EV chargers
  let evScore = 20;
  if (site.type === 'carpark') {
    evScore = 75;
    if (site.evDetails) {
      evScore += Math.min(25, site.evDetails.baysFeasible / 1.7);
    }
  } else if (site.category === 'Commercial') {
    evScore = 55;
  }

  const composite = Math.round(
    genScore * wGen +
      demScore * wDem +
      feasScore * wFeas +
      envScore * wEnv +
      evScore * wEV
  );

  return {
    generationScore: genScore,
    demandMatchScore: demScore,
    feasibilityScore: feasScore,
    environmentalScore: Math.min(100, envScore),
    evSynergyScore: Math.min(100, Math.round(evScore)),
    totalCompositeScore: composite,
  };
}

/**
 * Rank sites descending by composite score
 */
export function rankSites(sites: SolarSite[], weights: MCDAWeights): SolarSite[] {
  return [...sites]
    .map((s) => ({
      ...s,
      scores: calculateDynamicScores(s, weights),
    }))
    .sort((a, b) => b.scores.totalCompositeScore - a.scores.totalCompositeScore);
}

/**
 * Calculate township-level aggregate metrics for a chosen site selection
 */
export function calculateScenarioMetrics(
  scenarioId: ScenarioId,
  selectedSiteIds: string[],
  allSites: SolarSite[],
  township: TownshipConfig
): ScenarioMetrics {
  const selectedSites = allSites.filter((s) => selectedSiteIds.includes(s.id));

  let totalCapacityKWp = 0;
  let totalUsableAreaSqM = 0;
  let annualSolarGenerationKWh = 0;
  let gridDisplacedKWh = 0;
  let gridExportKWh = 0;
  let estimatedCapExMYR = 0;
  let evKmPoweredPerYear = 0;
  let evSessionsPerYear = 0;

  for (const site of selectedSites) {
    totalCapacityKWp += site.estimatedKWp;
    totalUsableAreaSqM += site.usableAreaSqM;
    annualSolarGenerationKWh += site.annualGenerationKWh;

    // Displaced vs exported
    const displacedFraction = site.selfConsumptionPct / 100;
    const displaced = site.annualGenerationKWh * displacedFraction;
    const exported = site.annualGenerationKWh * (1 - displacedFraction);

    gridDisplacedKWh += displaced;
    gridExportKWh += exported;

    // CapEx
    const unitCost =
      site.type === 'carpark'
        ? township.canopyUnitCostMYRPerKWp
        : township.solarUnitCostMYRPerKWp;
    estimatedCapExMYR += site.estimatedKWp * unitCost;

    if (site.evDetails) {
      evKmPoweredPerYear += site.evDetails.dailyCleanKmPotential * 365;
      evSessionsPerYear += site.evDetails.dailyChargingSessionsEstimate * 365;
    }
  }

  const annualSolarGenerationMWh = Math.round(annualSolarGenerationKWh / 1000);
  const gridDisplacedMWh = Math.round(gridDisplacedKWh / 1000);
  const gridExportMWh = Math.round(gridExportKWh / 1000);
  const selfConsumptionPct =
    annualSolarGenerationKWh > 0
      ? Math.round((gridDisplacedKWh / annualSolarGenerationKWh) * 100)
      : 0;

  // Financial savings: displaced power offset at retail tariff + export at NEM tariff
  const annualCostSavingsMYR = Math.round(
    gridDisplacedKWh * township.tariffCommercialMYR +
      gridExportKWh * township.exportTariffMYR
  );

  // Carbon avoidance (tonnes CO2 = displaced MWh * grid emission factor)
  // Grid factor: 0.758 tCO2 / MWh for Peninsular Malaysia
  const avoidedCO2Tonnes = Math.round(gridDisplacedMWh * township.gridEmissionFactor);

  // Payback years
  const simplePaybackYears =
    annualCostSavingsMYR > 0
      ? Number((estimatedCapExMYR / annualCostSavingsMYR).toFixed(1))
      : 0;

  const scenarioMeta = SCENARIO_DEFINITIONS.find((s) => s.id === scenarioId);

  return {
    scenarioId,
    scenarioName: scenarioMeta ? scenarioMeta.name : 'Custom Selection',
    selectedSiteIds,
    totalSitesCount: selectedSites.length,
    totalCapacityKWp: Math.round(totalCapacityKWp),
    totalUsableAreaSqM: Math.round(totalUsableAreaSqM),
    annualSolarGenerationMWh,
    gridDisplacedMWh,
    gridExportMWh,
    selfConsumptionPct,
    annualCostSavingsMYR,
    avoidedCO2Tonnes,
    estimatedCapExMYR,
    simplePaybackYears,
    evKmPoweredPerYear: Math.round(evKmPoweredPerYear),
    evSessionsPerYear: Math.round(evSessionsPerYear),
  };
}

/**
 * Calculate 24-hour hourly simulation curve for a selection of sites
 */
export function calculateHourlyProfile(
  selectedSiteIds: string[],
  allSites: SolarSite[]
): HourlyEnergyFlow[] {
  const selectedSites = allSites.filter((s) => selectedSiteIds.includes(s.id));
  const hourlyData: HourlyEnergyFlow[] = [];

  for (let h = 0; h < 24; h++) {
    const hourLabel = `${h.toString().padStart(2, '0')}:00`;
    const solarFactor = NORMALIZED_HOURLY_SOLAR[h];

    let totalSolarKW = 0;
    let totalBuildingDemandKW = 0;
    let totalEVDemandKW = 0;

    for (const site of selectedSites) {
      // Estimated hourly solar: capacity * irradiance factor * system derate (0.80)
      const siteSolarKW = site.estimatedKWp * solarFactor * 0.82;
      totalSolarKW += siteSolarKW;

      // Building load
      const siteBuildingKW = site.hourlyDemandProfile[h] || 0;
      totalBuildingDemandKW += siteBuildingKW;

      // EV load if car park
      if (site.evDetails) {
        // EV charging curve peaks 9am-12pm and 2pm-5pm
        let evMultiplier = 0.1;
        if (h >= 8 && h <= 11) evMultiplier = 0.85;
        else if (h >= 12 && h <= 14) evMultiplier = 0.7;
        else if (h >= 15 && h <= 18) evMultiplier = 0.9;
        else if (h >= 19 && h <= 21) evMultiplier = 0.4;

        const maxEVLoadKW =
          site.evDetails.recommendedACChargers * 7.4 +
          site.evDetails.recommendedDCChargers * 45;
        totalEVDemandKW += maxEVLoadKW * evMultiplier * 0.45;
      }
    }

    const totalDemandKW = totalBuildingDemandKW + totalEVDemandKW;
    const selfConsumedKW = Math.min(totalSolarKW, totalDemandKW);
    const gridExportKW = Math.max(0, totalSolarKW - totalDemandKW);
    const gridImportKW = Math.max(0, totalDemandKW - totalSolarKW);

    hourlyData.push({
      hour: h,
      hourLabel,
      solarGenerationKW: Math.round(totalSolarKW),
      buildingDemandKW: Math.round(totalBuildingDemandKW),
      evDemandKW: Math.round(totalEVDemandKW),
      selfConsumedKW: Math.round(selfConsumedKW),
      gridExportKW: Math.round(gridExportKW),
      gridImportKW: Math.round(gridImportKW),
    });
  }

  return hourlyData;
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-MY').format(num);
}

export function formatMYR(num: number): string {
  return `RM ${new Intl.NumberFormat('en-MY').format(num)}`;
}
