import math
from shapely.geometry import Polygon, Point

# Haversine distance in meters
def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371000.0 # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0)**2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 1)

def calculate_footprint_and_usable_area(coordinates_list, setback_ratio=0.15, obstruction_factor=0.08):
    """
    Given [[lat, lng], [lat, lng], ...], compute footprint area and usable solar surface
    using Shapely geometry.
    """
    if len(coordinates_list) < 3:
        return 0.0, 0.0

    # Project lat/lon to approximate meters around central Selangor (lat ~3.18)
    mean_lat = sum(p[0] for p in coordinates_list) / len(coordinates_list)
    meters_per_deg_lat = 111320.0
    meters_per_deg_lon = 111320.0 * math.cos(math.radians(mean_lat))

    metric_points = [
        (p[1] * meters_per_deg_lon, p[0] * meters_per_deg_lat)
        for p in coordinates_list
    ]

    poly = Polygon(metric_points)
    footprint_sqm = round(poly.area, 1)

    # Net usable area accounts for edge structural setbacks, rooftop vents, and access walkways
    usable_ratio = max(0.60, min(0.90, 1.0 - (setback_ratio + obstruction_factor)))
    usable_sqm = round(footprint_sqm * usable_ratio, 1)

    return footprint_sqm, usable_sqm, usable_ratio

def estimate_solar_kwp(usable_sqm, module_efficiency=0.21, module_rating_w=550):
    """
    Standard formula: kWp = Usable Area / Area per kWp
    Tier-1 550W mono-PERC module has dimensions ~2.27m x 1.13m = 2.56m² (~215 W/m²)
    Taking spacing and maintenance walkways into account: ~6.2 - 6.5 m² per kWp.
    """
    sqm_per_kwp = 6.4
    kwp = round(usable_sqm / sqm_per_kwp, 0)
    return max(10.0, kwp)
