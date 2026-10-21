import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { RoofBuilding, RoofRegion } from '../types/roof';

type Point = [number, number];
interface Props {
  region: RoofRegion; buildings: RoofBuilding[]; selected: Point[]; tracing: boolean; tracePoints: Point[];
  onViewport: (bounds: number[], zoom: number) => void;
  onSelect: (building: RoofBuilding) => void;
  onPoint: (point: Point) => void;
  onTracePoint: (point: Point) => void;
}
export function RoofSatelliteMap(props: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const footprints = useRef<L.LayerGroup | null>(null);
  const highlight = useRef<L.LayerGroup | null>(null);
  const trace = useRef<L.LayerGroup | null>(null);
  const latest = useRef(props);
  useEffect(() => { latest.current = props; });
  useEffect(() => {
    if (!container.current) return;
    const view = L.map(container.current, { maxZoom: 21, minZoom: 9, maxBounds: [[2.5, 100.5], [4, 102.1]] }).setView(latest.current.region.coordinates, 18);
    const imagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxNativeZoom: 19, maxZoom: 21, attribution: 'Imagery © Esri, Maxar, Earthstar Geographics and the GIS User Community' }).addTo(view);
    const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxNativeZoom: 19, maxZoom: 21, attribution: '© OpenStreetMap contributors' });
    const labels = L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', { maxNativeZoom: 19, maxZoom: 21 });
    L.control.layers({ 'Satellite roofs': imagery, 'Street map': street }, { 'Place labels': labels }).addTo(view);
    view.attributionControl.addAttribution('Building outlines © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>');
    footprints.current = L.layerGroup().addTo(view);
    highlight.current = L.layerGroup().addTo(view);
    trace.current = L.layerGroup().addTo(view);
    const viewport = () => {
      const bounds = view.getBounds();
      latest.current.onViewport([bounds.getSouth(), bounds.getWest(), bounds.getNorth(), bounds.getEast()], view.getZoom());
    };
    view.on('moveend', viewport);
    view.on('click', event => {
      const point: Point = [event.latlng.lat, event.latlng.lng];
      if (latest.current.tracing) latest.current.onTracePoint(point);
      else latest.current.onPoint(point);
    });
    map.current = view;
    view.whenReady(viewport);
    const observer = new ResizeObserver(() => { if (container.current?.clientWidth && container.current?.clientHeight) view.invalidateSize({ pan: false }); });
    observer.observe(container.current);
    return () => { observer.disconnect(); view.remove(); map.current = null; };
  }, []);
  useEffect(() => { map.current?.setView(props.region.coordinates, props.region.zoom); }, [props.region]);
  useEffect(() => {
    const layer = footprints.current;
    if (!layer) return;
    layer.clearLayers();
    for (const building of props.buildings) {
      L.polygon(building.outline, { color: '#38bdf8', weight: 1.3, fillColor: '#38bdf8', fillOpacity: .07, bubblingMouseEvents: false })
        .bindTooltip(`${building.name} · ${Math.round(building.areaSqM)} m²`)
        .on('click', event => {
          if (latest.current.tracing) latest.current.onTracePoint([event.latlng.lat, event.latlng.lng]);
          else latest.current.onSelect(building);
        }).addTo(layer);
    }
  }, [props.buildings]);
  useEffect(() => {
    highlight.current?.clearLayers();
    if (props.selected.length >= 3) L.polygon(props.selected, { color: '#facc15', weight: 3, fillOpacity: .18, interactive: false }).addTo(highlight.current!);
  }, [props.selected]);
  useEffect(() => {
    const layer = trace.current;
    if (!layer) return;
    layer.clearLayers();
    if (props.tracePoints.length > 1) L.polyline(props.tracePoints, { color: '#fb923c', weight: 3, interactive: false }).addTo(layer);
    for (const point of props.tracePoints) L.circleMarker(point, { radius: 5, color: '#fff', fillColor: '#f97316', fillOpacity: 1, interactive: false }).addTo(layer);
  }, [props.tracePoints]);
  return <div ref={container} className="roof-satellite-map" aria-label="Interactive satellite roof map" style={{ height: 'min(75vh, 780px)', minHeight: 520, width: '100%', cursor: props.tracing ? 'crosshair' : undefined }} />;
}
