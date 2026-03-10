<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 月島甜點護照 | MoonMoon Dessert Passport

An interactive quiz application to help users discover their perfect dessert and personality sticker from MoonMoon Dessert.

View your app in AI Studio: https://ai.studio/apps/drive/1EY88RN2I_BA_Bnovrs2PVeMKqjEUYOPF

## 🚀 Run Locally

**Prerequisites:** Node.js

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set environment variables:**
   - Copy `.env.local.example` to `.env.local` (if exists)
   - Set your `GEMINI_API_KEY` in `.env.local`

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   - Visit `http://localhost:5173`

## 📦 Build for Production

```bash
npm run build
npm run preview  # Preview production build locally
```

## 🌐 Deploy to Vercel

### Method 1: Using Vercel Dashboard (Recommended)

1. **Push your code to GitHub:**
   - Create a new repository on GitHub
   - Push your code to the repository

2. **Import to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect the Vite framework settings

3. **Configure environment variables:**
   - In Vercel dashboard, go to Settings → Environment Variables
   - Add `GEMINI_API_KEY` with your API key value

4. **Deploy:**
   - Click "Deploy"
   - Your site will be live in minutes!

### Method 2: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

## 📊 Google Analytics 4 (GA4) Setup

This app includes GA4 tracking for user interactions.

### Setup Instructions:

1. **Create GA4 Property:**
   - Go to [Google Analytics](https://analytics.google.com/)
   - Create a new GA4 property
   - Get your Measurement ID (format: `G-XXXXXXXXXX`)

2. **Update the tracking code:**
   - Open `index.html`
   - Replace `GA_MEASUREMENT_ID` with your actual Measurement ID (2 occurrences)

3. **Tracked Events:**
   - `quiz_started` - When user starts the quiz
   - `quiz_completed` - When user completes all questions
   - `result_viewed` - When user views their result
   - `dessert_view` - When a dessert is shown in results
   - `line_cta_clicked` - When LINE CTA is clicked
   - `quiz_restarted` - When user retries the quiz

4. **Verify tracking:**
   - After deploying, visit your site
   - Open GA4 Real-time reports
   - Perform actions and verify events appear

## 🛠 Tech Stack

- **Framework:** React + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS (via CDN)
- **Icons:** Lucide React
- **Hosting:** Vercel
- **Analytics:** Google Analytics 4

## 📁 Project Structure

```
moonmoon-dessert-passport/
├── App.tsx              # Main application component
├── analytics.ts         # GA4 tracking utilities
├── constants.tsx        # Quiz questions, desserts, stickers
├── types.ts            # TypeScript type definitions
├── index.html          # HTML template with GA4 script
├── index.tsx           # React entry point
├── vercel.json         # Vercel deployment configuration
└── components/         # Reusable UI components
```

## 🔗 Links

- **LINE Official Account:** Get stickers and discounts
- **MBTI Test:** Deeper personality insights
- **Google Maps:** Visit the store

## 📝 License

This project was created with Google AI Studio.

---

## Phase 1 Gate (Current)
**Goal: Validate traffic funnel**

### Metrics
- MBTI completions: 1000
- Orders: 200
- AOV: NT
- Monthly revenue: NTk
