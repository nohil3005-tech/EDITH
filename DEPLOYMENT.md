# 🚀 EDITH Deployment Guide

This guide provides step-by-step instructions for deploying your migrated EDITH project to production using **Neon PostgreSQL** (database), **Render** (backend), and **Vercel** (frontend).

---

## 📂 Architecture Overview

* **Frontend**: React + Vite (Hosted on Vercel)
* **Backend**: Express + Node.js (Hosted on Render)
* **Database**: PostgreSQL (Hosted on Neon)

---

## 🗄️ Step 1: Set Up Neon PostgreSQL

1. **Sign Up**: Go to [Neon.tech](https://neon.tech) and create a free account.
2. **Create Project**: Click **Create Project**, name it `edith`, and select your nearest database region.
3. **Get Connection String**:
   * On the Neon Dashboard, copy the connection string from the **Connection Details** box.
   * Make sure it starts with `postgresql://`.
   * It will look like this:
     `postgresql://<username>:<password>@ep-cool-pool.us-east-2.aws.neon.tech/neondb?sslmode=require`
4. **Save String**: Save this connection string securely. This will be your `DATABASE_URL`.

---

## ⚙️ Step 2: Deploy the Backend on Render

Render will host your Node.js backend server, run migrations, and connect to Neon.

1. **Sign Up / Log In**: Go to [Render.com](https://render.com) and link your GitHub account.
2. **Deploy Blueprint**:
   * Click **New +** and select **Blueprint**.
   * Link your repository containing the `render.yaml` file.
   * Click **Apply** to automatically create the service with the correct settings.
3. **Alternative Manual Setup**:
   * Click **New +** and select **Web Service**.
   * Root directory: `backend`
   * Build command: `npm install && npm run build`
   * Start command: `npm start`
4. **Environment Variables**:
   In the Render Web Service settings, add the following under **Environment**:

   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `NODE_ENV` | `production` | Enables production mode optimizations |
   | `DATABASE_URL` | *(Your Neon Connection String)* | Database credentials |
   | `PORT` | `3001` | Server port (Render maps this automatically) |
   | `API_KEY` | `your-secret-api-key` | Secret key for backend API requests authentication |
   | `OPENROUTER_API_KEY` | *(Your OpenRouter Key)* | For AI proposal/writing features |
   | `FRONTEND_URL` | *(Your Vercel URL)* | CORS origin mapping (e.g., `https://edith-frontend.vercel.app`) |

5. **Access API Link**: Once deployed, copy your Render Web Service URL (e.g., `https://edith-backend.onrender.com`).

---

## 🖥️ Step 3: Deploy the Frontend on Vercel

Vercel will build and host your React user interface.

1. **Sign Up / Log In**: Go to [Vercel.com](https://vercel.com) and sign in using your GitHub account.
2. **Import Project**: Click **Add New** -> **Project** and select your `EDITH` repository.
3. **Configure Project Settings**:
   * **Framework Preset**: `Vite` (or leave as `Other`)
   * **Root Directory**: Click **Edit** and select the **`frontend`** directory.
4. **Environment Variables**:
   Under **Environment Variables**, add the following keys:

   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `VITE_API_URL` | `https://edith-backend.onrender.com` | Your public Render backend API URL |
   | `VITE_API_BASE_URL` | `https://edith-backend.onrender.com` | Fallback base endpoint mapping |

5. **Deploy**: Click **Deploy**. Vercel will build the frontend assets and provide you with a live URL (e.g., `https://edith-frontend.vercel.app`).

---

## 🧪 Step 4: Verification and Testing

1. **Check Live Dashboard**: Open your live Vercel URL in your browser.
2. **Review DB Migration**:
   * The backend automatically runs Drizzle migrations on startup. 
   * Navigate to the **Freelance Studio** or **Dashboard** page. The pre-seeded freelance jobs and plugin stats will be loaded directly from your Neon PostgreSQL database!
3. **Perform Check**: Try adding a manual task on the Kanban board to verify database write functionality.
