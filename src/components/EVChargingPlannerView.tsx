import React, { useState } from 'react';
import {
  Car,
  Zap,
  BatteryCharging,
  Sun,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import type { SolarSite, TownshipConfig } from '../types/solar';
import { formatNumber, formatMYR } from '../utils/solarEngine';

interface EVChargingPlannerViewProps {
  allSites: SolarSite[];
  township: TownshipConfig;
  onSelectSite: (siteId: string) => void;
  onViewDeepDive: (site: SolarSite) => void;
}

export const EVChargingPlannerView: React.FC<EVChargingPlannerViewProps> = ({
  allSites,
  township,
  onSelectSite,
  onViewDeepDive,
}) => {
  const carParkSites = allSites.filter((s) => s.type === 'carpark');
  const [selectedCarParkId, setSelectedCarParkId] = useState<string>(
    carParkSites[0]?.id || 'ELM-PRK-03'
  );

  const activeCarPark =
    carParkSites.find((s) => s.id === selectedCarParkId) || carParkSites[0];

  const defaultAC = activeCarPark.evDetails?.recommendedACChargers || 24;
  const defaultDC = activeCarPark.evDetails?.recommendedDCChargers || 10;
  const [acChargers, setAcChargers] = useState<number>(defaultAC);
  const [dcChargers, setDcChargers] = useState<number>(defaultDC);

  const handleSelectCarPark = (siteId: string) => {
    setSelectedCarParkId(siteId);
    const site = carParkSites.find((s) => s.id === siteId);
    if (site && site.evDetails) {
      setAcChargers(site.evDetails.recommendedACChargers);
      setDcChargers(site.evDetails.recommendedDCChargers);
    }
  };

  const totalBays = acChargers + dcChargers;
  const dailyCanopySolarKWh = Math.round(activeCarPark.annualGenerationKWh / 365);
  const estDailyEVDemandKWh = Math.round(acChargers * 1.8 * 18 + dcChargers * 3.5 * 35);
  const solarCoveragePct = Math.min(
    100,
    Math.round((dailyCanopySolarKWh / (estDailyEVDemandKWh || 1)) * 100)
  );

  const dailyCleanKm = Math.round(
    Math.min(dailyCanopySolarKWh, estDailyEVDemandKWh) * 6.5
  );
  const annualCleanKm = dailyCleanKm * 365;
  const annualFuelSavingsMYR = Math.round(annualCleanKm * 0.18);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header Banner */}
      <div
        className="glass-card"
        style={{
          padding: '18px 20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Car size={18} color="var(--blue-sky)" />
              <h2
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '18px',
                  fontWeight: 800,
                  color: 'var(--text-pure-black)',
                }}
              >
                Solar-Powered Car Park Canopies & EV Charging
              </h2>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '3px', maxWidth: '850px' }}>
              Transform surface parking lots into productive clean energy assets. By generating solar power directly above vehicle bays,
              townships provide sheltered parking for residents and shoppers while directly powering electric vehicles.
            </p>
          </div>
          <span className="badge badge-blue">Canopy Infrastructure</span>
        </div>

        {/* Car Park Selector Tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '10px',
            marginTop: '16px',
          }}
        >
          {carParkSites.map((site) => {
            const isSelected = site.id === selectedCarParkId;
            return (
              <div
                key={site.id}
                onClick={() => handleSelectCarPark(site.id)}
                className="glass-card glass-card-interactive"
                style={{
                  padding: '12px 14px',
                  borderColor: isSelected ? 'var(--blue-sky)' : 'var(--blue-border)',
                  background: isSelected ? '#e0f2fe' : '#ffffff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="badge badge-white" style={{ fontSize: '9.5px', background: '#f8fafc' }}>
                    {site.code}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--blue-sky)', fontWeight: 700 }}>
                    {site.estimatedKWp} kWp Canopy
                  </span>
                </div>

                <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', marginTop: '6px' }}>
                  {site.name}
                </h4>
                <p style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {site.zone} • {site.evDetails?.baysFeasible || 30} Max Feasible Bays
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Configurator & Live Metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(360px, 1.8fr)',
          gap: '14px',
        }}
      >
        {/* Left: Charger Configuration */}
        <div className="glass-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="badge badge-blue">Canopy Configuration</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{activeCarPark.code}</span>
            </div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', fontWeight: 800, color: 'var(--text-pure-black)', marginTop: '6px' }}>
              {activeCarPark.name}
            </h3>
            <p style={{ fontSize: '11px', color: 'var(--blue-sky)', fontWeight: 600 }}>
              Usable Footprint: {formatNumber(activeCarPark.usableAreaSqM)} m² | Canopy Solar: {activeCarPark.estimatedKWp} kWp
            </p>
          </div>

          {/* AC Sliders */}
          <div
            style={{
              background: '#f0f9ff',
              border: '1px solid var(--blue-border)',
              borderRadius: '8px',
              padding: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11.5px' }}>
              <span style={{ color: 'var(--text-dark)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                <BatteryCharging size={13} color="var(--blue-sky)" />
                AC Destination Bays (7.4kW – 22kW)
              </span>
              <span style={{ color: 'var(--blue-sky)', fontWeight: 800 }}>
                {acChargers} Bays
              </span>
            </div>
            <input
              type="range"
              min={2}
              max={activeCarPark.evDetails?.baysFeasible || 40}
              value={acChargers}
              onChange={(e) => setAcChargers(parseInt(e.target.value))}
            />
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px', display: 'block' }}>
              For 2–6 hour visits (workplaces, retail, community clubhouses)
            </span>
          </div>

          {/* DC Sliders */}
          <div
            style={{
              background: '#f0f9ff',
              border: '1px solid var(--blue-border)',
              borderRadius: '8px',
              padding: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11.5px' }}>
              <span style={{ color: 'var(--text-dark)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Zap size={13} color="var(--blue-sky)" />
                DC Rapid Bays (50kW – 100kW)
              </span>
              <span style={{ color: 'var(--blue-sky)', fontWeight: 800 }}>
                {dcChargers} Bays
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={16}
              value={dcChargers}
              onChange={(e) => setDcChargers(parseInt(e.target.value))}
            />
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px', display: 'block' }}>
              20–35 min quick top-up for transit corridors
            </span>
          </div>

          {/* Engineering Note */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid var(--blue-border)',
              borderRadius: '6px',
              padding: '10px 12px',
              fontSize: '11px',
              color: 'var(--text-charcoal)',
              lineHeight: 1.45,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
              <ShieldCheck size={13} color="var(--blue-sky)" />
              <strong style={{ color: 'var(--text-dark)' }}>Structural Canopy Specification:</strong>
            </div>
            Elevated steel frame with integrated rainwater gutters and underground conduits.
            Estimated standard cost: RM 4,400/kWp (including framing and foundations).
          </div>

          <button
            onClick={() => onViewDeepDive(activeCarPark)}
            className="btn btn-secondary"
            style={{ fontSize: '11.5px', width: '100%', marginTop: 'auto' }}
          >
            Inspect Technical Engineering Specs <ArrowRight size={12} />
          </button>
        </div>

        {/* Right: Metrics & Power Architecture */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '10px',
            }}
          >
            <div className="glass-card" style={{ padding: '14px' }}>
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Daily Canopy Solar Yield</span>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-pure-black)', marginTop: '3px' }}>
                {formatNumber(dailyCanopySolarKWh)} <span style={{ fontSize: '12px' }}>kWh/day</span>
              </div>
              <span style={{ fontSize: '10px', color: 'var(--blue-sky)', fontWeight: 600 }}>
                ~{Math.round(activeCarPark.annualGenerationKWh / 1000)} MWh annual output
              </span>
            </div>

            <div className="glass-card" style={{ padding: '14px' }}>
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Solar Self-Sufficiency</span>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--blue-sky)', marginTop: '3px' }}>
                {solarCoveragePct}%
              </div>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                Covers {solarCoveragePct}% of EV energy needs
              </span>
            </div>

            <div className="glass-card" style={{ padding: '14px' }}>
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Clean EV Travel Powered</span>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-pure-black)', marginTop: '3px' }}>
                {formatNumber(annualCleanKm)} <span style={{ fontSize: '11px' }}>km/yr</span>
              </div>
              <span style={{ fontSize: '10px', color: 'var(--blue-sky)', fontWeight: 600 }}>
                ~{Math.round(annualCleanKm / 20000)} vehicles supported
              </span>
            </div>

            <div className="glass-card" style={{ padding: '14px' }}>
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Displaced Fuel Expenditure</span>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--blue-sky)', marginTop: '3px' }}>
                {formatMYR(annualFuelSavingsMYR)}
              </div>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                Displaced petrol cost per year
              </span>
            </div>
          </div>

          {/* Clean Flow Layout */}
          <div className="glass-card" style={{ padding: '16px' }}>
            <h4
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '13.5px',
                fontWeight: 800,
                color: 'var(--text-pure-black)',
                marginBottom: '10px',
              }}
            >
              Solar Canopy to EV Charging Microgrid Architecture
            </h4>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px',
                textAlign: 'center',
              }}
            >
              <div style={{ background: '#f0f9ff', border: '1px solid var(--blue-border)', borderRadius: '6px', padding: '10px 6px' }}>
                <Sun size={18} color="var(--blue-sky)" style={{ margin: '0 auto 4px' }} />
                <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-dark)' }}>Solar Canopy</div>
                <div style={{ fontSize: '10px', color: 'var(--blue-sky)', fontWeight: 600 }}>{activeCarPark.estimatedKWp} kWp</div>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid var(--blue-border)', borderRadius: '6px', padding: '10px 6px' }}>
                <Zap size={18} color="var(--text-muted)" style={{ margin: '0 auto 4px' }} />
                <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-dark)' }}>Inverter</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Load Balance</div>
              </div>

              <div style={{ background: '#f0f9ff', border: '1px solid var(--blue-border)', borderRadius: '6px', padding: '10px 6px' }}>
                <BatteryCharging size={18} color="var(--blue-sky)" style={{ margin: '0 auto 4px' }} />
                <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-dark)' }}>{totalBays} Bays</div>
                <div style={{ fontSize: '10px', color: 'var(--blue-sky)', fontWeight: 600 }}>{acChargers} AC / {dcChargers} DC</div>
              </div>

              <div style={{ background: '#f0f9ff', border: '1px solid var(--blue-border)', borderRadius: '6px', padding: '10px 6px' }}>
                <Car size={18} color="var(--text-pure-black)" style={{ margin: '0 auto 4px' }} />
                <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-dark)' }}>Clean EV Travel</div>
                <div style={{ fontSize: '10px', color: 'var(--blue-sky)', fontWeight: 700 }}>{formatNumber(dailyCleanKm)} km/day</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
