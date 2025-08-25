# Deployment Notes for Calendar Maker

This document outlines the necessary steps and configurations for deploying the Calendar Maker application.

## 1. Environment Variables

Both the client and server components of this application require specific environment variables to be set. It is recommended to use `.env` files for local development and to configure these variables directly in your deployment environment (e.g., Vercel, Netlify, Heroku, AWS).

### Server-side Environment Variables (server/.env)

Create a `.env` file in the `server/` directory with the following variables:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/calendarMaker
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI=http://localhost:5000/auth/google/callback
SESSION_SECRET="a_strong_secret_for_sessions"
JWT_SECRET="a_strong_secret_for_jwt"
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback
JWT_REFRESH_SECRET="a_strong_secret_for_jwt_refresh"
CLIENT_URL=http://localhost:5173
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

**Important Notes:**
*   Replace `YOUR_GOOGLE_CLIENT_ID`, `YOUR_GOOGLE_CLIENT_SECRET`, and `YOUR_GEMINI_API_KEY` with your actual API credentials.
*   For `SESSION_SECRET`, `JWT_SECRET`, and `JWT_REFRESH_SECRET`, generate strong, unique secrets.
*   `GOOGLE_REDIRECT_URI` and `GOOGLE_CALLBACK_URL` should match the authorized redirect URIs configured in your Google Cloud Console for OAuth 2.0 Client IDs.
*   `CLIENT_URL` should be the URL where your client-side application is hosted.

### Client-side Environment Variables (client/.env)

Create a `.env` file in the `client/` directory with the following variables:

```
VITE_CLIENT_URL=http://localhost:5173
VITE_BACKEND_URL=http://localhost:5000
```

**Important Notes:**
*   `VITE_CLIENT_URL` should be the URL where your client-side application is hosted.
*   `VITE_BACKEND_URL` should be the URL where your server-side application is hosted.

## 2. Build and Run

### Server-side Deployment

To build and run the server, navigate to the `server/` directory and execute:

```bash
npm install
node server.js
```

For production, consider using a process manager like PM2 or deploying with a service that handles Node.js applications.

### Client-side Deployment

To build the client application for production, navigate to the `client/` directory and execute:

```bash
npm install
npm run build
```

This will create a `dist/` directory containing the production-ready static assets. These assets can then be served by a web server (e.g., Nginx, Apache) or hosted on a static site hosting service (e.g., Vercel, Netlify, GitHub Pages).
