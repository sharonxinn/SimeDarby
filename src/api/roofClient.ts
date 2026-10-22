import type { BuildingResponse, RoofAssessment, RoofRegion, SiteEvidence, DataStatus, ScenarioInputs, BuildingRanking, RankingCriterion } from '../types/roof';
const api = import.meta.env.VITE_API_BASE_URL || '/api';
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(api + path, { ...options, signal: options.signal || AbortSignal.timeout(65000) });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail = typeof body.detail === 'string' ? body.detail : Array.isArray(body.detail) ? body.detail.map((item: { msg: string; loc?: string[] }) => `${item.loc?.slice(1).join('.') || 'Input'}: ${item.msg}`).join('; ') : `Request failed (${response.status})`;
    throw new Error(detail);
  }
  return response.json();
}
export const roofApi = {
  health: () => request<{ status: string; dataMode: string; storageMode?: string }>('/health'),
  dataStatus: () => request<DataStatus>('/data-status'),
  regions: (query: string) => request<RoofRegion[]>(`/roofs/regions?q=${encodeURIComponent(query)}`),
  buildings: (bounds: number[], signal: AbortSignal) => request<BuildingResponse>(`/roofs/buildings?${new URLSearchParams(Object.fromEntries(['south', 'west', 'north', 'east'].map((key, index) => [key, String(bounds[index])])) )}`, { signal }),
  analyze: (selection: { buildingId?: string; outline?: [number, number][] }) => request<RoofAssessment>('/roofs/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(selection) }),
  history: () => request<RoofAssessment[]>('/roofs/history'),
  ranking: (buildingIds: string[], sortBy: RankingCriterion, signal: AbortSignal) => request<BuildingRanking>('/roofs/ranking', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ buildingIds, sortBy }), signal }),
  plan: (id: string) => request<RoofAssessment>(`/roofs/plan/${encodeURIComponent(id)}`),
  scenario: (id: string, data: ScenarioInputs) => request<RoofAssessment>(`/roofs/scenario/${encodeURIComponent(id)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  evidence: (id: string, data: SiteEvidence) => request<RoofAssessment>(`/roofs/evidence/${encodeURIComponent(id)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
};
