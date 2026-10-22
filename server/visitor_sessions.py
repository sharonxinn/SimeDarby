"""Anonymous browser sessions: separate records without a sign-in prompt."""
import asyncio
import os
import re
import secrets
from pathlib import Path
from fastapi import Request
from starlette.concurrency import run_in_threadpool
from database import VISITOR_DB_PATH, init_db

COOKIE = 'solarsync_visitor'


def configure_visitor_sessions(app, directory, bundle=None):
    folder = Path(directory).resolve()
    folder.mkdir(parents=True, exist_ok=True)
    initialization_lock = asyncio.Lock()
    initialized = set()

    def initialize():
        if bundle:
            from bootstrap_public_data import bootstrap
            bootstrap(bundle)
        else:
            from roof_explorer import ensure_tables
            init_db()
            ensure_tables()

    @app.middleware('http')
    async def visitor_session(request: Request, call_next):
        # Health remains independent of any visitor's records.
        if request.url.path == '/api/health':
            return await call_next(request)
        supplied = request.cookies.get(COOKIE, '')
        visitor = supplied if re.fullmatch(r'[a-f0-9]{64}', supplied) else secrets.token_hex(32)
        database = folder / (visitor + '.db')
        token = VISITOR_DB_PATH.set(str(database))
        try:
            if request.url.path.startswith('/api/') and visitor not in initialized:
                # Context is copied into the thread that initializes this database.
                async with initialization_lock:
                    if visitor not in initialized:
                        await run_in_threadpool(initialize)
                        initialized.add(visitor)
            response = await call_next(request)
            if visitor != supplied:
                response.set_cookie(COOKIE, visitor, httponly=True, secure=request.url.scheme == 'https' or bool(os.getenv('RENDER')),
                                    samesite='lax', max_age=60*60*24*30)
            response.headers['Cache-Control'] = 'no-store'
            return response
        finally:
            VISITOR_DB_PATH.reset(token)
