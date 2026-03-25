# FlashGather

## Project structure

The active app folders live at the repository root:

- `frontend/`: Vite + React client
- `backend/`: Express + MongoDB API

```text
FlashGather/
├── backend/
│   ├── config/
│   ├── models/
│   ├── routes/
│   └── server.js
├── frontend/
│   └── src/
│       └── pages/
├── package.json
└── README.md
```

If you are working locally, treat these two folders as the real application roots. Any older nested copies or leftover lockfiles inside `frontend/` are not part of the current app structure.

## Frontend deploy to Vercel

If you deploy only the frontend on Vercel, use the `frontend` folder as the project root.

### Vercel settings

- Framework Preset: `Vite`
- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`

### Environment variable

Add this in the Vercel project settings:

```bash
VITE_API_URL=https://your-backend-domain.com
```

### Notes

- `frontend/vercel.json` already includes SPA rewrite support for `react-router-dom`.
- The frontend now reads the backend URL from `VITE_API_URL`, with local fallback to `http://localhost:5000`.
