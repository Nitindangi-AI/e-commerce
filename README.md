# Trendy — Premium Fashion Store

Trendy is a state-of-the-art MERN (MongoDB, Express, React, Node) stack e-commerce application designed for premium fashion, curated watches, eyewear, footwear, apparel, and accessories. 

The application utilizes **InsForge** (a Postgres BaaS like Supabase) for the database, serverless authentication, and real-time logistics networks, while also supporting a fully self-contained local MongoDB database and Express server as an alternative/hybrid backend.

---

## 🚀 Key Features

* **Premium Visual Design**: Harmonious dark mode, luxury gold accents (`#C9A84C`), sophisticated typography (Inter and Playfair Display), custom hover lifts, and keyframe loading animations.
* **Intelligent Search & Auditing**: Robust filtering, sorting, pagination, and administrative control over the catalog.
* **Interactive Live Chatbot**: Customer support chatbot to guide shopping selections, explain return policies, and check order statuses.
* **Multi-Role Portal**: Secure verification gateways for Customers, Merchants (Vendors), and Admins.
* **Logistics Telemetry**: In-transit cargo tracking, sequence node timeline maps, and secure OTP delivery handoff keys.

---

## 🛠️ Complete Deployment Guide

### Prerequisites
Before you begin, ensure you have the following accounts and tools ready:
* **Node.js** (v18.0.0 or higher) installed locally.
* **Git** installed locally.
* **PostgreSQL / InsForge Account**: To host the database, authentication, and database functions.
* **MongoDB Atlas / Local MongoDB**: To store application configs, coupons, states, and user sessions.
* **Vercel Account**: For deploying the frontend React application.
* **Render Account**: For deploying the backend Express application.

---

### Step-by-Step Deployment

#### Step 1: Clone the Repository
Clone the codebase to your local system and navigate to the project directory:
```bash
git clone https://github.com/Nitindangi-AI/e-commerce.git
cd e-commerce
```

#### Step 2: Configure Environment Variables
You must set up variables for both the frontend and backend to communicate with database providers.

* **Backend Setup**: Create a `/backend/.env` file. Fill it using `/backend/.env.example` as a template.
* **Frontend Setup**: Create a `/frontend/.env` file. Fill it using `/frontend/.env.example` as a template.

See the [Environment Variables](#environment-variables) section below for details.

#### Step 3: Run Database Migrations
Run the migration script to configure database tables, triggers, and row-level security (RLS) policies:
```bash
cd backend
npm run migrate
```
This script reads all SQL files in filename order from `/backend/db/migrations/` and executes them against the PostgreSQL connection string.

#### Step 4: Deploy Backend to Render
1. Log in to [Render](https://render.com) and click **New > Web Service**.
2. Connect your Git repository.
3. Set the **Root Directory** to `backend`.
4. The configurations will automatically pull from `/backend/render.yaml` (including the build command `npm install`, start command `node index.js`, and health check route `/api/health`).
5. Set the required [Backend Environment Variables](#backend-environment-variables) in the Render environment settings.

#### Step 5: Deploy Frontend to Vercel
1. Log in to [Vercel](https://vercel.com) and click **Add New > Project**.
2. Select your repository.
3. Set the **Root Directory** to `frontend`.
4. Ensure the build configuration is:
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
   * **Install Command**: `npm install`
5. Configure the [Frontend Environment Variables](#frontend-environment-variables) in the Vercel dashboard.
6. Click **Deploy**. Vercel will build your assets and configure caching/rewrites using the `/frontend/vercel.json` file.

---

## 💻 Local Development Setup

To run the application locally:

1. **Install Dependencies**: Run the install script from the root folder:
   ```bash
   npm run install:all
   ```
2. **Start the Dev Servers**: Run the command:
   ```bash
   npm run dev
   ```
   * The React client runs at `http://localhost:5173`.
   * The Express server runs at `http://localhost:5000`.

---

## 📋 Environment Variables

### Backend Environment Variables
Create `/backend/.env` with the following variables:

| Variable | Description | Required / Default |
|----------|-------------|--------------------|
| `NODE_ENV` | Environment target (`development` or `production`) | Required |
| `PORT` | Local server port | `5000` |
| `CORS_ORIGIN` | Allowed CORS origins (e.g., your Vercel URL) | `http://localhost:5173` |
| `DATABASE_URL` | PostgreSQL connection URL (e.g., InsForge DB) | Required |
| `MONGO_URI` | MongoDB Connection URL | `mongodb://localhost:27017/trendy-ecommerce` |
| `JWT_SECRET` | Secret key for signing JSON Web Tokens | Required (min 32 chars) |
| `INSFORGE_URL` | Host API base URL of the InsForge project | Required |
| `INSFORGE_ANON_KEY` | Anonymous API key of your InsForge project | Required |
| `INSFORGE_SERVICE_KEY` | Service role key of your InsForge project | Required |
| `RAZORPAY_KEY_ID` | Razorpay integration public key | Optional |
| `RAZORPAY_KEY_SECRET` | Razorpay integration secret key | Optional |

### Frontend Environment Variables
Create `/frontend/.env` with the following variables:

| Variable | Description | Required / Default |
|----------|-------------|--------------------|
| `VITE_API_BASE_URL` | Target backend URL (e.g., local host or Render URL) | `http://localhost:5000` |
| `VITE_INSFORGE_URL` | Host API base URL of the InsForge project | Required |
| `VITE_INSFORGE_ANON_KEY` | Anonymous API key of your InsForge project | Required |
| `VITE_APP_NAME` | Website / storefront application name | `Trendy` |
| `VITE_RAZORPAY_KEY_ID` | Razorpay key ID | Optional |

---

## 🔍 Troubleshooting

#### 1. "ManualChunks" Rolldown Compile Error
If you receive `Expected Function but received Object` error during build, ensure your `vite.config.js` is up-to-date. The config uses a function-based `manualChunks` mapping to align with Vite 8 / Rolldown compilation requirements.

#### 2. Migrations Fails with Database Connection Error
Verify that `DATABASE_URL` is set correctly in `/backend/.env` and that your local/hosting environment has outbound access to the PostgreSQL server.

#### 3. CORS Policy Blocked
If the frontend cannot communicate with the backend API, ensure `CORS_ORIGIN` (or `CLIENT_URL`) is defined in the backend environment variables with your active frontend domain.

#### 4. Local MongoDB Missing
If a local MongoDB database is not running on your machine, the Express backend automatically starts a temporary, in-memory MongoDB instance (`mongodb-memory-server`) to allow testing and auto-seeding without extra setup.
