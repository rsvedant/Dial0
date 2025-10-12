# United Healthcare Company Dashboard - Implementation Summary

## ✅ Implementation Complete

The United Healthcare company dashboard has been successfully implemented at `/companydashboard`. The dashboard provides comprehensive analytics, AI-powered insights, and beautiful visualizations for calls made by Dial0's agents.

## 🎯 What Was Built

### Core Files Created

#### 1. **Backend & Data Layer**
- ✅ `lib/companyInsights.ts` - AI insight generation utilities
  - Sentiment analysis from transcripts
  - Issue category extraction
  - Customer effort score calculation
  - Actionable recommendations generation
  - FCR and AHT calculations

- ✅ `convex/mockCompanyData.ts` - Mock data generator
  - 75 pre-generated United Healthcare calls
  - Realistic timestamps (last 30 days)
  - Varied durations (2-45 minutes)
  - 8 issue categories (billing, claims, prescriptions, etc.)
  - Sentiment scores and sample transcripts

- ✅ `convex/companyDashboard.ts` - Convex query functions
  - `getCompanyCallStats` - Overall statistics
  - `getCompanyCallTimeline` - Call volume over time
  - `getCompanyCallDetails` - Detailed call records
  - `getCompanyIssueBreakdown` - Issues by category
  - `getCompanySentimentDistribution` - Sentiment analysis
  - `getCompanyPerformanceMetrics` - Advanced KPIs

#### 2. **Dashboard Components**
All components built in `components/company-dashboard/`:

- ✅ `stats-overview.tsx` - 4 animated KPI cards
  - Total Calls with trend indicator
  - Average Duration with trend
  - Resolution Rate with trend
  - Customer Satisfaction score
  - Smooth number animations

- ✅ `call-volume-chart.tsx` - Call volume visualization
  - Bar chart showing last 14 days
  - Built with Recharts
  - Theme-integrated colors
  - Interactive tooltips

- ✅ `sentiment-analysis.tsx` - Sentiment distribution
  - Pie chart with Positive/Neutral/Negative
  - Color-coded segments
  - Progress bars with percentages
  - Icon indicators (Smile/Meh/Frown)

- ✅ `common-issues.tsx` - Top issues table
  - Top 8 issue categories
  - Call count, average duration, resolution rate
  - Color-coded categories
  - Sortable data

- ✅ `ai-recommendations.tsx` - AI-powered insights
  - 5 actionable recommendations
  - Auto-generated from call patterns
  - Icon-based visual design
  - Purple AI badge

- ✅ `performance-metrics.tsx` - Advanced KPIs
  - First Call Resolution (FCR) rate
  - Average Handle Time (AHT)
  - Customer Effort Score (CES)
  - Call Abandonment Rate
  - Peak call times with top 5 hours
  - Status indicators (excellent/good/needs-improvement)

- ✅ `recent-calls-table.tsx` - Detailed call history
  - Expandable rows with transcript preview
  - Date, title, duration, sentiment, status
  - Pagination support
  - Status badges with color coding
  - Sentiment icons

#### 3. **Main Dashboard Page**
- ✅ `app/companydashboard/page.tsx` - Main dashboard
  - United Healthcare branded header
  - Date range selector (7/14/30/90 days)
  - Refresh button with loading state
  - CSV export functionality
  - Responsive grid layout
  - Real-time data from Convex
  - Loading skeletons
  - Footer with timestamp

## 🎨 Design Features

### Visual Design
- ✅ Matches app's warm earthy theme (browns and beiges)
- ✅ Dark mode support throughout
- ✅ Smooth animations (fade-in-up, scale-in)
- ✅ Consistent spacing and typography
- ✅ Responsive grid layouts
- ✅ Glass-morphism effects on cards
- ✅ Professional United Healthcare branding

### Color Palette
- Primary: `#2F2A27` (dark brown)
- Background: `#F7F5F3` (beige)
- Charts: Using `--chart-1` through `--chart-5` variables
- Status colors: Green (resolved), Blue (in-progress), Amber (open)
- Sentiment: Green (positive), Amber (neutral), Red (negative)

### Interactive Features
- ✅ Animated number counters on stats cards
- ✅ Trend indicators (up/down arrows)
- ✅ Hover effects on all interactive elements
- ✅ Expandable call rows with transcript preview
- ✅ Date range filter dropdown
- ✅ Export to CSV functionality
- ✅ Refresh button with spinner animation
- ✅ Pagination for call history

## 📊 Dashboard Layout

```
┌─────────────────────────────────────────────────────────┐
│  [UH Logo] United Healthcare | [Date] [Refresh] [Export]│
├─────────────────────────────────────────────────────────┤
│  [Total: 75] [Avg: 15m] [Resolution: 70%] [Sat: 65%]   │
├──────────────────────┬──────────────────────────────────┤
│  Call Volume Chart   │  Sentiment Analysis              │
│  (Last 14 days)      │  (Pie Chart + Breakdown)         │
├──────────────────────┴──────────────────────────────────┤
│  Performance Metrics (FCR, AHT, CES, Abandonment)       │
│  + Peak Call Times (Top 5 hours)                        │
├─────────────────────────────────────────────────────────┤
│  Common Issues Table (Top 8 categories)                 │
├─────────────────────────────────────────────────────────┤
│  AI Recommendations (5 insights)                        │
├─────────────────────────────────────────────────────────┤
│  Recent Calls Table (Expandable, paginated)             │
├─────────────────────────────────────────────────────────┤
│  Footer (Last updated timestamp)                        │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Features Implemented

### Data & Analytics
- ✅ Real-time data fetching with Convex reactive queries
- ✅ Mock data generator with 75 realistic calls
- ✅ Sentiment analysis using keyword matching
- ✅ Issue categorization (8 categories)
- ✅ Performance metrics (FCR, AHT, CES, abandonment)
- ✅ Peak time analysis
- ✅ Trend calculations

### AI-Powered Insights
- ✅ Automatic recommendation generation
- ✅ Pattern detection (high call times, top categories)
- ✅ Resolution rate analysis
- ✅ Sentiment trend monitoring
- ✅ Staffing recommendations based on peak times

### User Experience
- ✅ Loading states with skeleton screens
- ✅ Error handling
- ✅ Responsive design (mobile/tablet/desktop)
- ✅ Smooth animations throughout
- ✅ Accessible design (ARIA labels, keyboard navigation)
- ✅ Export functionality (CSV download)
- ✅ Date range filtering
- ✅ Expandable details

## 📦 Technologies Used

- **Frontend**: React 18, Next.js 15, TypeScript
- **Data**: Convex (reactive queries)
- **Charts**: Recharts 2.15
- **Styling**: Tailwind CSS with custom theme
- **Icons**: Lucide React
- **UI Components**: Shadcn/ui (Card, Badge, Button, etc.)
- **Animations**: Custom CSS animations + Framer Motion support

## 🔗 Access

Visit the dashboard at: **http://localhost:3000/companydashboard**

No authentication required (hackathon mode).

## 📝 Data Structure

### Mock Call Data
Each call includes:
- `companyName`: "United Healthcare"
- `title`: Issue description
- `status`: open | in-progress | resolved
- `createdAt`: ISO timestamp
- `duration`: Seconds (120-2700)
- `transcript`: Sample customer conversation
- `sentimentScore`: -1 to 1 range
- `category`: One of 8 categories

### Issue Categories
1. Billing & Payments
2. Claims Processing
3. Prescription & Pharmacy
4. Provider Network
5. ID Cards & Documents
6. Plan Information
7. Authorization & Referrals
8. Account Management

## 🎯 Key Metrics Displayed

### Overview Stats
- Total Calls: 75
- Average Duration: ~15 minutes
- Resolution Rate: ~70%
- Customer Satisfaction: ~65%

### Performance Metrics
- First Call Resolution (FCR): Target >75%
- Average Handle Time (AHT): Target <15m
- Customer Effort Score (CES): Target <2.5 (scale 1-5)
- Call Abandonment Rate: Target <5%

### Sentiment Distribution
- Positive: ~50%
- Neutral: ~30%
- Negative: ~20%

## 🎨 Customization

To switch to a different company:
1. Update `companyName` variable in `app/companydashboard/page.tsx`
2. Modify mock data generator in `convex/mockCompanyData.ts`
3. Update logo/branding in header section
4. Adjust issue categories if needed

## 🔧 Future Enhancements (Not Implemented)

The following were part of the original plan but can be added later:
- Real database integration (once `companyName` field is added to schema)
- Advanced filtering and search
- Date range picker (currently dropdown)
- Export to PDF
- Email reports
- Real-time WebSocket updates
- Drill-down analytics
- Comparison with previous periods
- Agent performance tracking
- Call recording playback

## ✅ All Tasks Completed

- ✅ Created utility files (AI insights, mock data)
- ✅ Built Convex query functions
- ✅ Created all 7 dashboard components
- ✅ Built main dashboard page
- ✅ Integrated all components with data flow
- ✅ Applied consistent theme and styling
- ✅ Added animations and interactions
- ✅ Implemented export functionality
- ✅ Added loading and error states
- ✅ Made responsive for all screen sizes

## 🎉 Result

A beautiful, information-rich company dashboard that provides United Healthcare with comprehensive insights into their customer service call operations, powered by AI-driven recommendations and real-time analytics.

The dashboard is production-ready for the hackathon demo and can easily be extended with real data once the database schema is updated.


# United Healthcare Company Dashboard - Implementation Summary

## ✅ Implementation Complete

The United Healthcare company dashboard has been successfully implemented at `/companydashboard`. The dashboard provides comprehensive analytics, AI-powered insights, and beautiful visualizations for calls made by Dial0's agents.

## 🎯 What Was Built

### Core Files Created

#### 1. **Backend & Data Layer**
- ✅ `lib/companyInsights.ts` - AI insight generation utilities
  - Sentiment analysis from transcripts
  - Issue category extraction
  - Customer effort score calculation
  - Actionable recommendations generation
  - FCR and AHT calculations

- ✅ `convex/mockCompanyData.ts` - Mock data generator
  - 75 pre-generated United Healthcare calls
  - Realistic timestamps (last 30 days)
  - Varied durations (2-45 minutes)
  - 8 issue categories (billing, claims, prescriptions, etc.)
  - Sentiment scores and sample transcripts

- ✅ `convex/companyDashboard.ts` - Convex query functions
  - `getCompanyCallStats` - Overall statistics
  - `getCompanyCallTimeline` - Call volume over time
  - `getCompanyCallDetails` - Detailed call records
  - `getCompanyIssueBreakdown` - Issues by category
  - `getCompanySentimentDistribution` - Sentiment analysis
  - `getCompanyPerformanceMetrics` - Advanced KPIs

#### 2. **Dashboard Components**
All components built in `components/company-dashboard/`:

- ✅ `stats-overview.tsx` - 4 animated KPI cards
  - Total Calls with trend indicator
  - Average Duration with trend
  - Resolution Rate with trend
  - Customer Satisfaction score
  - Smooth number animations

- ✅ `call-volume-chart.tsx` - Call volume visualization
  - Bar chart showing last 14 days
  - Built with Recharts
  - Theme-integrated colors
  - Interactive tooltips

- ✅ `sentiment-analysis.tsx` - Sentiment distribution
  - Pie chart with Positive/Neutral/Negative
  - Color-coded segments
  - Progress bars with percentages
  - Icon indicators (Smile/Meh/Frown)

- ✅ `common-issues.tsx` - Top issues table
  - Top 8 issue categories
  - Call count, average duration, resolution rate
  - Color-coded categories
  - Sortable data

- ✅ `ai-recommendations.tsx` - AI-powered insights
  - 5 actionable recommendations
  - Auto-generated from call patterns
  - Icon-based visual design
  - Purple AI badge

- ✅ `performance-metrics.tsx` - Advanced KPIs
  - First Call Resolution (FCR) rate
  - Average Handle Time (AHT)
  - Customer Effort Score (CES)
  - Call Abandonment Rate
  - Peak call times with top 5 hours
  - Status indicators (excellent/good/needs-improvement)

- ✅ `recent-calls-table.tsx` - Detailed call history
  - Expandable rows with transcript preview
  - Date, title, duration, sentiment, status
  - Pagination support
  - Status badges with color coding
  - Sentiment icons

#### 3. **Main Dashboard Page**
- ✅ `app/companydashboard/page.tsx` - Main dashboard
  - United Healthcare branded header
  - Date range selector (7/14/30/90 days)
  - Refresh button with loading state
  - CSV export functionality
  - Responsive grid layout
  - Real-time data from Convex
  - Loading skeletons
  - Footer with timestamp

## 🎨 Design Features

### Visual Design
- ✅ Matches app's warm earthy theme (browns and beiges)
- ✅ Dark mode support throughout
- ✅ Smooth animations (fade-in-up, scale-in)
- ✅ Consistent spacing and typography
- ✅ Responsive grid layouts
- ✅ Glass-morphism effects on cards
- ✅ Professional United Healthcare branding

### Color Palette
- Primary: `#2F2A27` (dark brown)
- Background: `#F7F5F3` (beige)
- Charts: Using `--chart-1` through `--chart-5` variables
- Status colors: Green (resolved), Blue (in-progress), Amber (open)
- Sentiment: Green (positive), Amber (neutral), Red (negative)

### Interactive Features
- ✅ Animated number counters on stats cards
- ✅ Trend indicators (up/down arrows)
- ✅ Hover effects on all interactive elements
- ✅ Expandable call rows with transcript preview
- ✅ Date range filter dropdown
- ✅ Export to CSV functionality
- ✅ Refresh button with spinner animation
- ✅ Pagination for call history

## 📊 Dashboard Layout

```
┌─────────────────────────────────────────────────────────┐
│  [UH Logo] United Healthcare | [Date] [Refresh] [Export]│
├─────────────────────────────────────────────────────────┤
│  [Total: 75] [Avg: 15m] [Resolution: 70%] [Sat: 65%]   │
├──────────────────────┬──────────────────────────────────┤
│  Call Volume Chart   │  Sentiment Analysis              │
│  (Last 14 days)      │  (Pie Chart + Breakdown)         │
├──────────────────────┴──────────────────────────────────┤
│  Performance Metrics (FCR, AHT, CES, Abandonment)       │
│  + Peak Call Times (Top 5 hours)                        │
├─────────────────────────────────────────────────────────┤
│  Common Issues Table (Top 8 categories)                 │
├─────────────────────────────────────────────────────────┤
│  AI Recommendations (5 insights)                        │
├─────────────────────────────────────────────────────────┤
│  Recent Calls Table (Expandable, paginated)             │
├─────────────────────────────────────────────────────────┤
│  Footer (Last updated timestamp)                        │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Features Implemented

### Data & Analytics
- ✅ Real-time data fetching with Convex reactive queries
- ✅ Mock data generator with 75 realistic calls
- ✅ Sentiment analysis using keyword matching
- ✅ Issue categorization (8 categories)
- ✅ Performance metrics (FCR, AHT, CES, abandonment)
- ✅ Peak time analysis
- ✅ Trend calculations

### AI-Powered Insights
- ✅ Automatic recommendation generation
- ✅ Pattern detection (high call times, top categories)
- ✅ Resolution rate analysis
- ✅ Sentiment trend monitoring
- ✅ Staffing recommendations based on peak times

### User Experience
- ✅ Loading states with skeleton screens
- ✅ Error handling
- ✅ Responsive design (mobile/tablet/desktop)
- ✅ Smooth animations throughout
- ✅ Accessible design (ARIA labels, keyboard navigation)
- ✅ Export functionality (CSV download)
- ✅ Date range filtering
- ✅ Expandable details

## 📦 Technologies Used

- **Frontend**: React 18, Next.js 15, TypeScript
- **Data**: Convex (reactive queries)
- **Charts**: Recharts 2.15
- **Styling**: Tailwind CSS with custom theme
- **Icons**: Lucide React
- **UI Components**: Shadcn/ui (Card, Badge, Button, etc.)
- **Animations**: Custom CSS animations + Framer Motion support

## 🔗 Access

Visit the dashboard at: **http://localhost:3000/companydashboard**

No authentication required (hackathon mode).

## 📝 Data Structure

### Mock Call Data
Each call includes:
- `companyName`: "United Healthcare"
- `title`: Issue description
- `status`: open | in-progress | resolved
- `createdAt`: ISO timestamp
- `duration`: Seconds (120-2700)
- `transcript`: Sample customer conversation
- `sentimentScore`: -1 to 1 range
- `category`: One of 8 categories

### Issue Categories
1. Billing & Payments
2. Claims Processing
3. Prescription & Pharmacy
4. Provider Network
5. ID Cards & Documents
6. Plan Information
7. Authorization & Referrals
8. Account Management

## 🎯 Key Metrics Displayed

### Overview Stats
- Total Calls: 75
- Average Duration: ~15 minutes
- Resolution Rate: ~70%
- Customer Satisfaction: ~65%

### Performance Metrics
- First Call Resolution (FCR): Target >75%
- Average Handle Time (AHT): Target <15m
- Customer Effort Score (CES): Target <2.5 (scale 1-5)
- Call Abandonment Rate: Target <5%

### Sentiment Distribution
- Positive: ~50%
- Neutral: ~30%
- Negative: ~20%

## 🎨 Customization

To switch to a different company:
1. Update `companyName` variable in `app/companydashboard/page.tsx`
2. Modify mock data generator in `convex/mockCompanyData.ts`
3. Update logo/branding in header section
4. Adjust issue categories if needed

## 🔧 Future Enhancements (Not Implemented)

The following were part of the original plan but can be added later:
- Real database integration (once `companyName` field is added to schema)
- Advanced filtering and search
- Date range picker (currently dropdown)
- Export to PDF
- Email reports
- Real-time WebSocket updates
- Drill-down analytics
- Comparison with previous periods
- Agent performance tracking
- Call recording playback

## ✅ All Tasks Completed

- ✅ Created utility files (AI insights, mock data)
- ✅ Built Convex query functions
- ✅ Created all 7 dashboard components
- ✅ Built main dashboard page
- ✅ Integrated all components with data flow
- ✅ Applied consistent theme and styling
- ✅ Added animations and interactions
- ✅ Implemented export functionality
- ✅ Added loading and error states
- ✅ Made responsive for all screen sizes

## 🎉 Result

A beautiful, information-rich company dashboard that provides United Healthcare with comprehensive insights into their customer service call operations, powered by AI-driven recommendations and real-time analytics.

The dashboard is production-ready for the hackathon demo and can easily be extended with real data once the database schema is updated.


# United Healthcare Company Dashboard - Implementation Summary

## ✅ Implementation Complete

The United Healthcare company dashboard has been successfully implemented at `/companydashboard`. The dashboard provides comprehensive analytics, AI-powered insights, and beautiful visualizations for calls made by Dial0's agents.

## 🎯 What Was Built

### Core Files Created

#### 1. **Backend & Data Layer**
- ✅ `lib/companyInsights.ts` - AI insight generation utilities
  - Sentiment analysis from transcripts
  - Issue category extraction
  - Customer effort score calculation
  - Actionable recommendations generation
  - FCR and AHT calculations

- ✅ `convex/mockCompanyData.ts` - Mock data generator
  - 75 pre-generated United Healthcare calls
  - Realistic timestamps (last 30 days)
  - Varied durations (2-45 minutes)
  - 8 issue categories (billing, claims, prescriptions, etc.)
  - Sentiment scores and sample transcripts

- ✅ `convex/companyDashboard.ts` - Convex query functions
  - `getCompanyCallStats` - Overall statistics
  - `getCompanyCallTimeline` - Call volume over time
  - `getCompanyCallDetails` - Detailed call records
  - `getCompanyIssueBreakdown` - Issues by category
  - `getCompanySentimentDistribution` - Sentiment analysis
  - `getCompanyPerformanceMetrics` - Advanced KPIs

#### 2. **Dashboard Components**
All components built in `components/company-dashboard/`:

- ✅ `stats-overview.tsx` - 4 animated KPI cards
  - Total Calls with trend indicator
  - Average Duration with trend
  - Resolution Rate with trend
  - Customer Satisfaction score
  - Smooth number animations

- ✅ `call-volume-chart.tsx` - Call volume visualization
  - Bar chart showing last 14 days
  - Built with Recharts
  - Theme-integrated colors
  - Interactive tooltips

- ✅ `sentiment-analysis.tsx` - Sentiment distribution
  - Pie chart with Positive/Neutral/Negative
  - Color-coded segments
  - Progress bars with percentages
  - Icon indicators (Smile/Meh/Frown)

- ✅ `common-issues.tsx` - Top issues table
  - Top 8 issue categories
  - Call count, average duration, resolution rate
  - Color-coded categories
  - Sortable data

- ✅ `ai-recommendations.tsx` - AI-powered insights
  - 5 actionable recommendations
  - Auto-generated from call patterns
  - Icon-based visual design
  - Purple AI badge

- ✅ `performance-metrics.tsx` - Advanced KPIs
  - First Call Resolution (FCR) rate
  - Average Handle Time (AHT)
  - Customer Effort Score (CES)
  - Call Abandonment Rate
  - Peak call times with top 5 hours
  - Status indicators (excellent/good/needs-improvement)

- ✅ `recent-calls-table.tsx` - Detailed call history
  - Expandable rows with transcript preview
  - Date, title, duration, sentiment, status
  - Pagination support
  - Status badges with color coding
  - Sentiment icons

#### 3. **Main Dashboard Page**
- ✅ `app/companydashboard/page.tsx` - Main dashboard
  - United Healthcare branded header
  - Date range selector (7/14/30/90 days)
  - Refresh button with loading state
  - CSV export functionality
  - Responsive grid layout
  - Real-time data from Convex
  - Loading skeletons
  - Footer with timestamp

## 🎨 Design Features

### Visual Design
- ✅ Matches app's warm earthy theme (browns and beiges)
- ✅ Dark mode support throughout
- ✅ Smooth animations (fade-in-up, scale-in)
- ✅ Consistent spacing and typography
- ✅ Responsive grid layouts
- ✅ Glass-morphism effects on cards
- ✅ Professional United Healthcare branding

### Color Palette
- Primary: `#2F2A27` (dark brown)
- Background: `#F7F5F3` (beige)
- Charts: Using `--chart-1` through `--chart-5` variables
- Status colors: Green (resolved), Blue (in-progress), Amber (open)
- Sentiment: Green (positive), Amber (neutral), Red (negative)

### Interactive Features
- ✅ Animated number counters on stats cards
- ✅ Trend indicators (up/down arrows)
- ✅ Hover effects on all interactive elements
- ✅ Expandable call rows with transcript preview
- ✅ Date range filter dropdown
- ✅ Export to CSV functionality
- ✅ Refresh button with spinner animation
- ✅ Pagination for call history

## 📊 Dashboard Layout

```
┌─────────────────────────────────────────────────────────┐
│  [UH Logo] United Healthcare | [Date] [Refresh] [Export]│
├─────────────────────────────────────────────────────────┤
│  [Total: 75] [Avg: 15m] [Resolution: 70%] [Sat: 65%]   │
├──────────────────────┬──────────────────────────────────┤
│  Call Volume Chart   │  Sentiment Analysis              │
│  (Last 14 days)      │  (Pie Chart + Breakdown)         │
├──────────────────────┴──────────────────────────────────┤
│  Performance Metrics (FCR, AHT, CES, Abandonment)       │
│  + Peak Call Times (Top 5 hours)                        │
├─────────────────────────────────────────────────────────┤
│  Common Issues Table (Top 8 categories)                 │
├─────────────────────────────────────────────────────────┤
│  AI Recommendations (5 insights)                        │
├─────────────────────────────────────────────────────────┤
│  Recent Calls Table (Expandable, paginated)             │
├─────────────────────────────────────────────────────────┤
│  Footer (Last updated timestamp)                        │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Features Implemented

### Data & Analytics
- ✅ Real-time data fetching with Convex reactive queries
- ✅ Mock data generator with 75 realistic calls
- ✅ Sentiment analysis using keyword matching
- ✅ Issue categorization (8 categories)
- ✅ Performance metrics (FCR, AHT, CES, abandonment)
- ✅ Peak time analysis
- ✅ Trend calculations

### AI-Powered Insights
- ✅ Automatic recommendation generation
- ✅ Pattern detection (high call times, top categories)
- ✅ Resolution rate analysis
- ✅ Sentiment trend monitoring
- ✅ Staffing recommendations based on peak times

### User Experience
- ✅ Loading states with skeleton screens
- ✅ Error handling
- ✅ Responsive design (mobile/tablet/desktop)
- ✅ Smooth animations throughout
- ✅ Accessible design (ARIA labels, keyboard navigation)
- ✅ Export functionality (CSV download)
- ✅ Date range filtering
- ✅ Expandable details

## 📦 Technologies Used

- **Frontend**: React 18, Next.js 15, TypeScript
- **Data**: Convex (reactive queries)
- **Charts**: Recharts 2.15
- **Styling**: Tailwind CSS with custom theme
- **Icons**: Lucide React
- **UI Components**: Shadcn/ui (Card, Badge, Button, etc.)
- **Animations**: Custom CSS animations + Framer Motion support

## 🔗 Access

Visit the dashboard at: **http://localhost:3000/companydashboard**

No authentication required (hackathon mode).

## 📝 Data Structure

### Mock Call Data
Each call includes:
- `companyName`: "United Healthcare"
- `title`: Issue description
- `status`: open | in-progress | resolved
- `createdAt`: ISO timestamp
- `duration`: Seconds (120-2700)
- `transcript`: Sample customer conversation
- `sentimentScore`: -1 to 1 range
- `category`: One of 8 categories

### Issue Categories
1. Billing & Payments
2. Claims Processing
3. Prescription & Pharmacy
4. Provider Network
5. ID Cards & Documents
6. Plan Information
7. Authorization & Referrals
8. Account Management

## 🎯 Key Metrics Displayed

### Overview Stats
- Total Calls: 75
- Average Duration: ~15 minutes
- Resolution Rate: ~70%
- Customer Satisfaction: ~65%

### Performance Metrics
- First Call Resolution (FCR): Target >75%
- Average Handle Time (AHT): Target <15m
- Customer Effort Score (CES): Target <2.5 (scale 1-5)
- Call Abandonment Rate: Target <5%

### Sentiment Distribution
- Positive: ~50%
- Neutral: ~30%
- Negative: ~20%

## 🎨 Customization

To switch to a different company:
1. Update `companyName` variable in `app/companydashboard/page.tsx`
2. Modify mock data generator in `convex/mockCompanyData.ts`
3. Update logo/branding in header section
4. Adjust issue categories if needed

## 🔧 Future Enhancements (Not Implemented)

The following were part of the original plan but can be added later:
- Real database integration (once `companyName` field is added to schema)
- Advanced filtering and search
- Date range picker (currently dropdown)
- Export to PDF
- Email reports
- Real-time WebSocket updates
- Drill-down analytics
- Comparison with previous periods
- Agent performance tracking
- Call recording playback

## ✅ All Tasks Completed

- ✅ Created utility files (AI insights, mock data)
- ✅ Built Convex query functions
- ✅ Created all 7 dashboard components
- ✅ Built main dashboard page
- ✅ Integrated all components with data flow
- ✅ Applied consistent theme and styling
- ✅ Added animations and interactions
- ✅ Implemented export functionality
- ✅ Added loading and error states
- ✅ Made responsive for all screen sizes

## 🎉 Result

A beautiful, information-rich company dashboard that provides United Healthcare with comprehensive insights into their customer service call operations, powered by AI-driven recommendations and real-time analytics.

The dashboard is production-ready for the hackathon demo and can easily be extended with real data once the database schema is updated.


