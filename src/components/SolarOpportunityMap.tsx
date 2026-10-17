import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Layers,
  Sun,
  AlertCircle,
  Building2,
  Car,
  Filter,
  ArrowRight,
  Maximize2,
} from 'lucide-react';
import type { SolarSite, TownshipConfig } from '../types/solar';
import { formatNumber } from '../utils/solarEngine';

interface SolarOpportunityMapProps {
  sites: SolarSite[];
  selectedSiteId: string | null;
  onSelectSite: (siteId: string) => void;
  onViewDeepDive: (site: SolarSite) => void;
  township: TownshipConfig;
}

export const SolarOpportunityMap: React.FC<SolarOpportunityMapProps> = ({
  sites,
  selectedSiteId,
  onSelectSite,
  onViewDeepDive,
  township,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Layer }>({});

  const [filterType, setFilterType] = useState<string>('all');
  const [showFlagsOnly, setShowFlagsOnly] = useState<boolean>(false);
  const [mapMode, setMapMode] = useState<'osm' | 'blueprint'>('osm');

  const selectedSite = sites.find((s) => s.id === selectedSiteId) || sites[0];

  const filteredSites = sites.filter((site) => {
    if (filterType !== 'all') {
      if (filterType === 'rooftop' && site.type !== 'rooftop') return false;
      if (filterType === 'carpark' && site.type !== 'carpark') return false;
      if (filterType === 'commercial' && site.category !== 'Commercial') return false;
    }
    if (showFlagsOnly) {
      const hasFlags =
        !site.flags.roofConditionVerified ||
        !site.flags.structuralInspectionDone ||
        !site.flags.shadingAssessed ||
        !site.flags.gridCapacityConfirmed;
      if (!hasFlags) return false;
    }
    return true;
  });

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: township.coordinates,
      zoom: township.zoom,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      className: 'dark-tiles',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [township]);

  // Update polygon layers and markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    Object.values(markersRef.current).forEach((layer) => {
      map.removeLayer(layer);
    });
    markersRef.current = {};

    filteredSites.forEach((site) => {
      const isSelected = site.id === selectedSiteId;
      const isCarPark = site.type === 'carpark';

      // Clean polygon boundary
      const polygon = L.polygon(site.polygon, {
        color: isSelected ? '#000000' : '#0284c7',
        weight: isSelected ? 3 : 2,
        fillColor: '#38bdf8',
        fillOpacity: isSelected ? 0.6 : 0.25,
        dashArray: isCarPark ? '4, 4' : undefined,
      }).addTo(map);

      // Clean architectural pin
      const iconHtml = `
        <div style="
          background: ${isSelected ? '#0284c7' : '#ffffff'};
          color: ${isSelected ? '#ffffff' : '#090d16'};
          border: 1.5px solid ${isSelected ? '#0369a1' : '#0284c7'};
          border-radius: 6px;
          padding: 3px 7px;
          font-family: 'Inter', sans-serif;
          font-weight: 700;
          font-size: 10px;
          display: flex;
          align-items: center;
          gap: 4px;
          box-shadow: 0 2px 8px rgba(2, 132, 199, 0.2);
          white-space: nowrap;
          cursor: pointer;
          transform: translate(-50%, -50%);
          transition: all 0.15s ease;
        ">
          <span>${site.code}</span>
          <span style="opacity: 0.85; font-weight: 500;">${site.estimatedKWp}kWp</span>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'natural-site-marker',
        html: iconHtml,
        iconSize: [60, 22],
      });

      const marker = L.marker(site.coordinates, { icon: customIcon }).addTo(map);

      const handleClick = () => {
        onSelectSite(site.id);
      };

      polygon.on('click', handleClick);
      marker.on('click', handleClick);

      markersRef.current[site.id] = L.layerGroup([polygon, marker]);
    });
  }, [filteredSites, selectedSiteId]);

  // Smoothly pan to selected site
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedSite) return;
    map.flyTo(selectedSite.coordinates, 16, {
      duration: 0.8,
      easeLinearity: 0.25,
    });
  }, [selectedSiteId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Natural Filter Bar */}
      <div
        className="glass-card"
        style={{
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={13} color="var(--blue-sky)" />
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dark)' }}>
              Filter Sites:
            </span>
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            {[
              { id: 'all', label: 'All Sites (12)' },
              { id: 'rooftop', label: 'Rooftops' },
              { id: 'carpark', label: 'Car Parks / Canopies' },
              { id: 'commercial', label: 'High Daytime Commercial' },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setFilterType(btn.id)}
                className="btn"
                style={{
                  fontSize: '11.5px',
                  padding: '4px 10px',
                  background: filterType === btn.id ? 'var(--blue-sky)' : '#ffffff',
                  color: filterType === btn.id ? '#ffffff' : 'var(--text-dark)',
                  border: `1px solid ${filterType === btn.id ? 'var(--blue-sky)' : 'var(--blue-border)'}`,
                  fontWeight: filterType === btn.id ? 600 : 500,
                  boxShadow: filterType === btn.id ? '0 1px 4px rgba(2, 132, 199, 0.2)' : 'none',
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div style={{ width: '1px', height: '16px', background: 'var(--blue-border)' }} />

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11.5px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              userSelect: 'none',
              fontWeight: 500,
            }}
          >
            <input
              type="checkbox"
              checked={showFlagsOnly}
              onChange={(e) => setShowFlagsOnly(e.target.checked)}
              style={{ accentColor: 'var(--blue-sky)' }}
            />
            <AlertCircle size={13} color="var(--blue-sky)" />
            Missing Site Information Only
          </label>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setMapMode(mapMode === 'osm' ? 'blueprint' : 'osm')}
            className="btn btn-secondary"
            style={{ fontSize: '11.5px', padding: '4px 10px' }}
          >
            <Layers size={13} />
            {mapMode === 'osm' ? 'Architectural Cadastre View' : 'Geographic Map View'}
          </button>
        </div>
      </div>

      {/* Grid: Map + Site Inspector */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.8fr) minmax(360px, 1fr)',
          gap: '14px',
          alignItems: 'stretch',
        }}
      >
        {/* Map Container */}
        <div
          className="glass-card"
          style={{
            minHeight: '620px',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {mapMode === 'osm' ? (
            <div
              id="map-container"
              ref={mapContainerRef}
              style={{
                width: '100%',
                height: '100%',
                minHeight: '620px',
              }}
            />
          ) : (
            /* Architectural Master Plan Cadastre (Clean Architectural Blueprint on Light Blue) */
            <div
              style={{
                width: '100%',
                height: '100%',
                minHeight: '620px',
                background: '#eaf4fe',
                position: 'relative',
                overflow: 'hidden',
                padding: '24px',
              }}
            >
              {/* Drafting Lines */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage:
                    'linear-gradient(rgba(2, 132, 199, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(2, 132, 199, 0.08) 1px, transparent 1px)',
                  backgroundSize: '36px 36px',
                }}
              />

              <div
                style={{
                  position: 'relative',
                  zIndex: 2,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                }}
              >
                <div>
                  <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-pure-black)', fontSize: '16px', fontWeight: 700 }}>
                    Township Cadastre & Usable Rooftop Footprints
                  </h3>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Vector footprints mapped to municipal plot boundaries
                  </p>
                </div>
                <span className="badge badge-blue">Architectural Drafting Plan</span>
              </div>

              {/* Cadastre Building Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                  gap: '10px',
                  position: 'relative',
                  zIndex: 2,
                  maxHeight: '520px',
                  overflowY: 'auto',
                  paddingRight: '6px',
                }}
              >
                {filteredSites.map((site) => {
                  const isSelected = site.id === selectedSiteId;
                  return (
                    <div
                      key={site.id}
                      onClick={() => onSelectSite(site.id)}
                      className="glass-card glass-card-interactive"
                      style={{
                        padding: '12px',
                        background: isSelected ? '#e0f2fe' : '#ffffff',
                        borderColor: isSelected ? 'var(--blue-sky)' : 'var(--blue-border)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="badge badge-white" style={{ fontSize: '9.5px', background: '#f0f9ff' }}>
                          {site.code}
                        </span>
                        <span style={{ fontSize: '10.5px', color: 'var(--blue-sky)', fontWeight: 700 }}>
                          {formatNumber(site.usableAreaSqM)} m² usable
                        </span>
                      </div>

                      <h4
                        style={{
                          fontSize: '12.5px',
                          color: 'var(--text-dark)',
                          marginTop: '6px',
                          fontWeight: 700,
                          lineHeight: 1.3,
                        }}
                      >
                        {site.name}
                      </h4>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          marginTop: '4px',
                          fontSize: '10.5px',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {site.type === 'carpark' ? <Car size={11} color="var(--blue-sky)" /> : <Building2 size={11} color="var(--blue-sky)" />}
                        <span>{site.category}</span>
                      </div>

                      <div
                        style={{
                          marginTop: '8px',
                          paddingTop: '6px',
                          borderTop: '1px solid var(--blue-border)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '10.5px',
                        }}
                      >
                        <span style={{ color: 'var(--text-muted)' }}>Capacity:</span>
                        <span style={{ color: 'var(--blue-sky)', fontWeight: 700 }}>
                          {site.estimatedKWp} kWp
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Clean Map Footer Bar */}
          <div
            style={{
              position: 'absolute',
              bottom: '14px',
              left: '14px',
              zIndex: 1000,
              background: '#ffffff',
              border: '1px solid var(--blue-border)',
              borderRadius: '6px',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '11px',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'var(--blue-sky)',
                }}
              />
              <span style={{ color: 'var(--text-pure-black)', fontWeight: 600 }}>
                {filteredSites.length} of {sites.length} Sites Displayed
              </span>
            </div>
            <div style={{ width: '1px', height: '10px', background: 'var(--blue-border)' }} />
            <span style={{ color: 'var(--text-muted)' }}>
              OpenStreetMap Cadastre • Global Solar Atlas Benchmark
            </span>
          </div>
        </div>

        {/* Site Inspector Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {selectedSite ? (
            <div
              className="glass-card"
              style={{
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              {/* Header */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    <span className="badge badge-rank">{selectedSite.code}</span>
                    <span className="badge badge-blue">{selectedSite.category}</span>
                    <span className="badge badge-white">{selectedSite.zone}</span>
                  </div>
                  <button
                    onClick={() => onViewDeepDive(selectedSite)}
                    className="btn btn-secondary"
                    style={{ fontSize: '11px', padding: '3px 8px' }}
                    title="Detailed Technical Sheet"
                  >
                    <Maximize2 size={11} />
                    Details
                  </button>
                </div>

                <h3
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '17px',
                    fontWeight: 700,
                    color: 'var(--text-pure-black)',
                    marginTop: '8px',
                  }}
                >
                  {selectedSite.name}
                </h3>
                <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {selectedSite.type === 'rooftop' ? 'Rooftop Solar Asset' : 'Surface Car Park Canopy'} • Coordinates: [
                  {selectedSite.coordinates[0].toFixed(4)}, {selectedSite.coordinates[1].toFixed(4)}]
                </p>
              </div>

              {/* Specification Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    background: '#f0f9ff',
                    border: '1px solid var(--blue-border)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                  }}
                >
                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Usable Surface</span>
                  <div
                    style={{
                      fontSize: '15px',
                      fontWeight: 700,
                      color: 'var(--text-pure-black)',
                      marginTop: '2px',
                    }}
                  >
                    {formatNumber(selectedSite.usableAreaSqM)} m²
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--blue-sky)' }}>
                    {(selectedSite.usableRatio * 100).toFixed(0)}% of {formatNumber(selectedSite.footprintSqM)} m² roof
                  </span>
                </div>

                <div
                  style={{
                    background: '#f0f9ff',
                    border: '1px solid var(--blue-border)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                  }}
                >
                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Solar Capacity</span>
                  <div
                    style={{
                      fontSize: '15px',
                      fontWeight: 700,
                      color: 'var(--blue-sky)',
                      marginTop: '2px',
                    }}
                  >
                    {selectedSite.estimatedKWp} kWp
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    ~{Math.round(selectedSite.annualGenerationKWh / 1000)} MWh/yr yield
                  </span>
                </div>

                <div
                  style={{
                    background: '#f0f9ff',
                    border: '1px solid var(--blue-border)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                  }}
                >
                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Solar Resource (GHI)</span>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: 'var(--text-pure-black)',
                      marginTop: '2px',
                    }}
                  >
                    {selectedSite.solarGHIKWhM2Year} kWh/m²
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    Tilt {selectedSite.tiltDeg}° • Azimuth {selectedSite.azimuthDeg}°
                  </span>
                </div>

                <div
                  style={{
                    background: '#f0f9ff',
                    border: '1px solid var(--blue-border)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                  }}
                >
                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Daytime Self-Match</span>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: 'var(--blue-sky)',
                      marginTop: '2px',
                    }}
                  >
                    {selectedSite.selfConsumptionPct}%
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    Peak load {selectedSite.peakDemandKW} kW
                  </span>
                </div>
              </div>

              {/* Pre-Feasibility Checklist & Data Gaps */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid var(--blue-border)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-pure-black)' }}>
                    Site Verification & Data Gaps
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Pre-Feasibility Audit</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Roof Condition:</span>
                    <span style={{ color: selectedSite.flags.roofConditionVerified ? 'var(--blue-sky)' : 'var(--text-dark)', fontWeight: 600 }}>
                      {selectedSite.roofCondition} ({selectedSite.flags.roofConditionVerified ? 'Verified' : 'Pending'})
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Structural Suitability:</span>
                    <span style={{ color: 'var(--text-dark)', fontWeight: 600 }}>
                      {selectedSite.structuralSuitability}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Shading Factor:</span>
                    <span style={{ color: 'var(--blue-sky)', fontWeight: 600 }}>
                      {selectedSite.shadingFactorPct}%
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Substation Proximity:</span>
                    <span style={{ color: 'var(--text-dark)', fontWeight: 600 }}>
                      {selectedSite.substationDistanceM}m
                    </span>
                  </div>
                </div>

                {/* Specific Notes */}
                {selectedSite.flags.notes.length > 0 && (
                  <div
                    style={{
                      marginTop: '8px',
                      paddingTop: '8px',
                      borderTop: '1px solid var(--blue-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      fontSize: '10.5px',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {selectedSite.flags.notes.map((n, i) => (
                      <div key={i} style={{ display: 'flex', gap: '6px' }}>
                        <span style={{ color: 'var(--blue-sky)' }}>•</span>
                        <span>{n}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Natural Explanation Box */}
              <div
                style={{
                  background: '#f0f9ff',
                  border: '1px solid var(--blue-border)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                }}
              >
                <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--blue-sky)', marginBottom: '3px' }}>
                  Planning Rationale
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-charcoal)', lineHeight: 1.45 }}>
                  {selectedSite.aiRecommendationRationale}
                </p>
              </div>

              <button
                onClick={() => onViewDeepDive(selectedSite)}
                className="btn btn-primary"
                style={{ width: '100%', fontSize: '12px' }}
              >
                Open Full Technical Specification
                <ArrowRight size={13} />
              </button>
            </div>
          ) : (
            <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)' }}>Select a candidate building on the map.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
