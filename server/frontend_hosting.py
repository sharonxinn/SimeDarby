"""Serve the built frontend from the API origin and protect shared deployments."""
import base64
import binascii
import secrets
from pathlib import Path
from fastapi import Request
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles


def configure_hosting(app, directory=None, username='solarsync', password=None):
    if password:
        @app.middleware('http')
        async def require_access(request: Request, call_next):
            # Health reveals connectivity only; no records or configuration.
            if request.url.path == '/api/health':
                return await call_next(request)
            header = request.headers.get('Authorization', '')
            supplied_user, supplied_password = '', ''
            try:
                scheme, token = header.split(' ', 1)
                if scheme.lower() == 'basic':
                    supplied_user, supplied_password = base64.b64decode(token, validate=True).decode('utf-8').split(':', 1)
            except (ValueError, UnicodeError, binascii.Error):
                pass
            valid_user = secrets.compare_digest(supplied_user.encode(), username.encode())
            valid_password = secrets.compare_digest(supplied_password.encode(), password.encode())
            if not (valid_user and valid_password):
                return Response('Sign in to SolarSync to continue.', status_code=401,
                                headers={'WWW-Authenticate': 'Basic realm="SolarSync", charset="UTF-8"', 'Cache-Control': 'no-store'})
            response = await call_next(request)
            # Shared operator records must not be cached by public intermediaries.
            response.headers['Cache-Control'] = 'no-store'
            return response
    if directory:
        folder = Path(directory).resolve()
        if not (folder / 'index.html').is_file():
            raise RuntimeError('Built frontend missing; run npm run build before launching production hosting')
        app.mount('/', StaticFiles(directory=folder, html=True), name='frontend')
