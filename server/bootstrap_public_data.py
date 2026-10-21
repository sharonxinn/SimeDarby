"""Initialise a fresh hosted database using checksum-verified public snapshots only."""
import hashlib
import json
from contextlib import closing
from pathlib import Path
from database import get_connection, init_db
from roof_explorer import ensure_tables
from pipeline import run_import


def bootstrap(directory):
    init_db()
    ensure_tables()
    folder = Path(directory)
    manifest = json.loads((folder / 'manifest.json').read_text(encoding='utf-8'))
    for entry in manifest['datasets']:
        source = entry['source']
        table = {'nasa': 'solar_daily', 'electricity': 'malaysia_electricity'}.get(source)
        if table is None:
            raise ValueError('Deployment bundle must contain public NASA/electricity data only')
        with closing(get_connection()) as conn:
            present = conn.execute(f'SELECT COUNT(*) FROM {table}').fetchone()[0]
        if present:
            continue  # Never overwrite a persisted database on restart/redeploy.
        path = (folder / entry['file']).resolve()
        if path.parent != folder.resolve():
            raise ValueError('Invalid bundled data path')
        if hashlib.sha256(path.read_bytes()).hexdigest() != entry['sha256']:
            raise ValueError('Public snapshot checksum mismatch')
        run_import(source, year=entry.get('year', 2025), file=path)

