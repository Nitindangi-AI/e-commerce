# Trendy — Premium Fashion Store

Trendy is a state-of-the-art MERN (MongoDB, Express, React, Node) stack e-commerce application designed for premium fashion, curated watches, eyewear, footwear, apparel, and accessories. 

The application utilizes **InsForge** (a Postgres BaaS like Supabase) for the frontend database model, serverless authentication, and real-time logistics networks, while also supporting a fully self-contained local MongoDB database and Express server as an alternative/hybrid backend.

---

## 🚀 Key Features

* **Premium Visual Design**: Harmonious dark mode, luxury gold accents (`#C9A84C`), sophisticated typography (Inter and Playfair Display), custom hover lifts, and keyframe loading animations.
* **Intelligent Search & Auditing**: Robust filtering, sorting, pagination, and administrative control over the catalog.
* **Interactive Live Chatbot**: Customer support chatbot to guide shopping selections, explain return policies, and check order statuses.
* **Multi-Role Portal**: Secure verification gateways for Customers, Merchants (Vendors), and Admins.
* **Logistics Telemetry**: In-transit cargo tracking, sequence node timeline maps, and secure OTP delivery handoff keys.

---

## 📂 Repository Restructuring

The repository is organized into two primary component folders:
* `/frontend`: Single Page Application (SPA) built with React, Vite, and Tailwind CSS.
* `/backend`: Node.js, Express, and Mongoose database model, seed script, and routes.
* `/backend/db`: Home for all database schemas, seed datasets, and RLS policies (`insforge-setup.sql`, `insforge-seed.sql`, `insforge-rls.sql`).

---

## 🛠️ Local Development Quickstart

### Prerequisites
* [Node.js](https://nodejs.org) (v18 or higher recommended)
* [MongoDB](https://www.mongodb.com) (Optional; the backend will fall back to an in-memory database if a local MongoDB server is not running)

### 1. Install Dependencies
Run the install script from the root directory to install dependencies for both the frontend and backend concurrently:
```bash
npm run install:all
```

### 2. Configure Environment Variables
Create the environment configuration files in each respective directory.

#### Frontend configuration (`/frontend/.env`):
Copy `/frontend/.env.example` to `/frontend/.env` and supply your InsForge project credentials:
```env
VITE_INSFORGE_URL=https://r7q99f5d.us-east.insforge.app
VITE_INSFORGE_ANON_KEY=ik_84619633df209ae1fafdaf404bfbd91a
```

#### Backend configuration (`/backend/.env`):
Copy `/backend/.env.example` to `/backend/.env` and configure local coordinates:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/trendy-ecommerce
JWT_SECRET=trendy_super_secret_jwt_key_2026_change_in_production
JWT_EXPIRE=7d
COOKIE_EXPIRE=7
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

### 3. Run the Application
Run both the frontend client and the backend server concurrently using:
```bash
npm run dev
```
* **Frontend Client**: Runs at `http://localhost:5173`
* **Backend Server**: Runs at `http://localhost:5000`

---

## 🌍 Production Deployment

### Frontend (Vercel)
The React client is structured for instant serverless deployment on Vercel.

1. **Import Project**: Link your repository on the [Vercel Dashboard](https://vercel.com).
2. **Root Directory**: Set the root directory of the project to `frontend`.
3. **Build Settings**:
   * Build Command: `npm run build`
   * Output Directory: `dist`
   * Install Command: `npm install`
4. **Environment Variables**: Configure the following environment variables:
   * `VITE_INSFORGE_URL`
   * `VITE_INSFORGE_ANON_KEY`
5. **SPA Rewrites**: SPA routing is automatically handled via the configured [frontend/vercel.json](file:///c:/Users/lenovo/ecommerce-mern/frontend/vercel.json) rewrite rule.

---

### Backend (Render)
The Express backend can be deployed for free on Render.

1. **New Web Service**: Click "New" on the [Render Dashboard](https://render.com) and select "Web Service".
2. **Repository Root**: Set the Root Directory to `backend`.
3. **Build & Start Commands**:
   * Build Command: `npm install`
   * Start Command: `npm start`
4. **Environment Variables**: Provide the production coordinates as listed in [backend/.env.example](file:///c:/Users/lenovo/ecommerce-mern/backend/.env.example):
   * `MONGO_URI`: Your MongoDB Atlas connection URI.
   * `JWT_SECRET`: A secure, random secret key.
   * `JWT_EXPIRE`: e.g., `7d`
   * `COOKIE_EXPIRE`: e.g., `7`
   * `CLIENT_URL`: Your deployed Vercel frontend URL (CORS origin policy).
   * `NODE_ENV`: Set to `production`.
5. **Alternatively (Infrastructure-as-Code)**: Render will automatically detect the [backend/render.yaml](file:///c:/Users/lenovo/ecommerce-mern/backend/render.yaml) specification when deploying as a blueprint service.

---

## ⚡ Mock Accounts & Testing Cheat-Sheet
* **Shopper (Customer)**: Mobile `+91 98765 00003` (Mock OTP: `123456` or Pass: `user123` via email `user1@trendy.com`)
* **Merchant (Vendor)**: Mobile `+91 98765 00001` (Mock OTP: `123456` or Pass: `seller123` via email `seller1@trendy.com`)
* **Administrator**: Email `admin@trendy.com` (Pass: `admin123`)
