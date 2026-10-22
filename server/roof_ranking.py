"""Rank explicit scenario metrics, without invented composite suitability scores."""
CRITERIA = {
    'generation': ('annualACKWh', False),
    'savings': ('annualSavingsMYR', False),
    'payback': ('paybackYears', True),
    'evSolarShare': ('evSolarSharePct', False),
    'area': ('footprintSqM', False),
}


def rank_rows(rows, criterion):
    field, ascending = CRITERIA[criterion]

    def value(row):
        # Ignore sub-micro-unit floating point noise when assigning equal ranks.
        return round(row[field], 6) if row[field] is not None else None

    def key(row):
        metric = value(row)
        return (metric is None, metric if ascending and metric is not None else -metric if metric is not None else 0, row['id'])

    ordered = sorted(rows, key=key)
    previous, rank = None, None
    for index, row in enumerate(ordered):
        metric = value(row)
        if metric is None:
            row['rank'] = None
        else:
            if metric != previous:
                rank = index + 1
            row['rank'] = rank
            previous = metric
    return ordered
