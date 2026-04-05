# FlashGather Deployment Guide

This project is easiest to deploy with:

- Frontend: Vercel
- Backend: Render
- Database: MongoDB Atlas

That combination is simple, beginner-friendly, and has free tiers suitable for student projects.

## 1. Before You Start

Make sure your code is pushed to GitHub.

You should keep secrets out of Git:

- `backend/.env` is for local development only
- `backend/.env.example` shows the variables you need online
- `frontend/.env.example` shows the frontend variable you need online

## 2. Create a Free MongoDB Atlas Database

1. Go to MongoDB Atlas and create a free cluster.
2. Create a database user.
3. In Network Access, allow your deployment platforms to connect.
   For a student project, Atlas's temporary `0.0.0.0/0` allowlist is the simplest option.
4. Copy your connection string.
5. Replace the database name in the URI with `FlashGather` if needed.

You will use this as `MONGO_URI` in Render.

## 3. Deploy the Backend to Render

1. Go to Render.
2. Click `New +` -> `Web Service`.
3. Connect your GitHub repository.
4. Configure it like this:

- Name: `flashgather-backend` or any name you like
- Root Directory: `backend`
- Runtime: `Node`
- Build Command: `npm install`
- Start Command: `npm start`

5. Add environment variables:

- `MONGO_URI` = your MongoDB Atlas connection string
- `JWT_SECRET` = a long random secret string
- `JWT_EXPIRES_IN` = session length such as `7d`
- `SMTP_HOST` = your SMTP server host
- `SMTP_PORT` = SMTP port such as `587`
- `SMTP_SECURE` = `true` for SSL/TLS SMTP, otherwise `false`
- `SMTP_USER` = SMTP username
- `SMTP_PASS` = SMTP password or app password
- `SMTP_FROM_EMAIL` = sender email address
- `SMTP_FROM_NAME` = sender name shown in password reset emails

6. Deploy.

After deployment, Render will give you a backend URL like:

`https://flashgather-backend.onrender.com`

Test these endpoints in your browser:

- `https://your-render-url.onrender.com/db-test`
- `https://your-render-url.onrender.com/events`

If Render free tier is sleeping, the first request may take a little while to wake up.

## 4. Deploy the Frontend to Vercel

1. Go to Vercel.
2. Import the same GitHub repository.
3. Set:

- Framework Preset: `Vite`
- Root Directory: `frontend`

4. Add this environment variable before deploying:

- `VITE_API_URL` = your Render backend URL

Example:

`VITE_API_URL=https://flashgather-backend.onrender.com`

5. Deploy.

Your frontend will get a URL like:

`https://flashgather.vercel.app`

## 5. Final Check

After both deployments finish:

1. Open the Vercel frontend URL.
2. Try registering a user.
3. Try logging in.
4. Try creating and viewing events.

If login or event creation fails, the most common causes are:

- `VITE_API_URL` is missing or incorrect on Vercel
- `MONGO_URI` is wrong on Render
- MongoDB Atlas network access is blocking Render

## 6. Important Notes

### Render

- Free services can spin down after inactivity.
- The first API request after sleeping can be slow.

### Vercel

- Great for your Vite frontend.
- Automatic deploys happen when you push to GitHub.

### MongoDB Atlas

- Free tier is enough for class demos and portfolio projects.
- Do not share your real connection string publicly.

## 7. Environment Variables Summary

### Backend on Render

- `MONGO_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM_EMAIL`
- `SMTP_FROM_NAME`

### Frontend on Vercel

- `VITE_API_URL`

## 8. Local Development Reminder

Local backend:

- Uses `backend/.env`

Local frontend:

- Can use `frontend/.env` if you want local overrides
- Otherwise it falls back to `/api` in development

## 9. If You Want the Simplest Possible Workflow

Use this order every time:

1. Push code to GitHub
2. Render redeploys backend
3. Vercel redeploys frontend
4. Open the Vercel site and test

## 10. Useful Official Links

- Vercel docs: https://vercel.com/docs
- Vercel pricing: https://vercel.com/pricing
- Render docs: https://render.com/docs
- Render free instance docs: https://render.com/docs/free
- MongoDB Atlas free cluster docs: https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/
