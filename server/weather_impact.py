"""Historical weather and explicit, incremental solar sensitivity scenarios."""
from pydantic import BaseModel, ConfigDict, Field

POWER_REFERENCE = 'https://pvlib-python.readthedocs.io/en/stable/reference/generated/pvlib.pvsystem.pvwatts_dc.html'


class WeatherSensitivity(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)
    sunlightChangePct: float = Field(0, ge=-80, le=50)
    cellTemperatureDeltaC: float = Field(0, ge=-15, le=25)
    temperatureCoefficientPctPerC: float = Field(-.30, ge=-1, le=0)


def describe_weather(scenario):
    resource = scenario.get('resource') or {}
    annual_ghi = resource.get('annualGHI')
    monthly = []
    for entry in resource.get('monthly', []):
        energy = (scenario['annualACKWh'] * entry['ghiKWhM2'] / annual_ghi
                  if scenario['annualACKWh'] is not None and annual_ghi else
                  0 if annual_ghi == 0 and scenario['annualACKWh'] == 0 else None)
        monthly.append({**entry, 'modelledACKWh': energy})
    return {'available': bool(monthly), 'year': resource.get('year'), 'monthly': monthly,
            'meanAmbientC': resource.get('meanAmbientC'),
            'minDailyMeanAmbientC': resource.get('minDailyMeanAmbientC'),
            'maxDailyMeanAmbientC': resource.get('maxDailyMeanAmbientC'),
            'capacityExplanation': 'Nameplate kWp is set by module count and rated watts. Weather changes operating power and generated kWh, not the installed nameplate capacity.',
            'basis': 'NASA POWER historical daily horizontal irradiance and 2 m air temperature at the declared regional reference point. This is not today’s forecast or roof-mounted sensor data.',
            'limits': ['Monthly generation allocates the saved annual energy estimate by observed monthly GHI. Temperature is displayed as historical context; it is not used as a second thermal derate.',
                       'Air temperature is not panel-cell temperature. Rainfall, wind speed and a clear-sky cloud-loss baseline have not been imported, so separate effects are not quantified.',
                       'Clouds and rain can reduce available sunlight. Rain can also clean modules, but a cleaning benefit cannot be calculated without local soiling and rainfall evidence. Wind can cool modules, but this model has no wind/thermal simulation.']}


def sensitivity(scenario, inputs):
    p = inputs.model_dump()
    sunlight = 1 + p['sunlightChangePct']/100
    thermal = 1 + p['temperatureCoefficientPctPerC']/100*p['cellTemperatureDeltaC']
    factor = max(0, sunlight*thermal)
    def adjusted(key):
        value = scenario.get(key)
        return value*factor if value is not None else None
    ac, dc, savings, co2 = [adjusted(key) for key in ['annualACKWh', 'annualDCKWh', 'annualSavingsMYR', 'annualCO2Tonnes']]
    charging = scenario['ev']['annualChargingKWh']
    self_use = adjusted('annualSelfConsumedKWh')
    allocation = min(charging, self_use*scenario['inputs']['evSolarAllocationPct']/100) if self_use is not None else None
    capex = scenario['capexMYR']
    return {'kind': 'hypothetical_sensitivity', 'inputs': p, 'proposedKWp': scenario['proposedKWp'],
            'generationChangePct': (factor-1)*100 if ac is not None else None,
            'annualDCKWh': dc, 'annualACKWh': ac, 'annualSavingsMYR': savings, 'annualCO2Tonnes': co2,
            'paybackYears': capex/savings if capex > 0 and savings and savings > 0 else None,
            'evSolarSharePct': 100*allocation/charging if allocation is not None and charging > 0 else None,
            'basis': 'Illustrative first-order sensitivity relative to the saved base case; not an observed loss, climate projection or weather forecast. The base case is not changed.',
            'formula': 'Adjusted energy = base energy × (1 + sunlight change / 100) × (1 + power-temperature coefficient / 100 × cell-temperature change). This is an incremental approximation, not a full hourly PVWatts simulation.',
            'thermalNote': 'The base annual model already has combined DC losses. Only an additional temperature change relative to that base is applied here; ambient temperature is not treated as measured cell temperature. The coefficient is an editable assumption, not a verified module specification.',
            'referenceUrl': POWER_REFERENCE}
