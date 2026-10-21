"""Container entry point: persistent storage, public-data bootstrap, then HTTP."""
import os
from pathlib import Path


def main():
    from database import DB_PATH
    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    bundle = os.getenv('SOLARSYNC_BOOTSTRAP_DIR')
    if bundle:
        from bootstrap_public_data import bootstrap
        bootstrap(bundle)
    import uvicorn
    uvicorn.run('main:app', host='0.0.0.0', port=int(os.getenv('PORT', '10000')), workers=1, proxy_headers=True)


if __name__ == '__main__':
    main()
