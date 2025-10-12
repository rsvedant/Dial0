# United Healthcare Dashboard - Quick Start Guide

## 🚀 Getting Started

### 1. Start Your Development Server

If not already running:

```bash
bun run dev
```

This will start both Next.js and Convex dev servers.

### 2. Access the Dashboard

Open your browser and navigate to:

```
http://localhost:3000/companydashboard
```

## 📊 What You'll See

The dashboard loads with **75 mock United Healthcare calls** from the last 30 days, including:

### Top Section - Key Metrics
- **Total Calls**: 75
- **Average Duration**: ~15 minutes
- **Resolution Rate**: ~70%
- **Customer Satisfaction**: ~65%

All with trend indicators showing month-over-month changes.

### Charts Section
- **Call Volume Chart**: Bar chart showing daily call volume for the last 14 days
- **Sentiment Analysis**: Pie chart with positive/neutral/negative distribution

### Performance Metrics
- First Call Resolution (FCR) rate
- Average Handle Time (AHT)
- Customer Effort Score (CES)
- Call Abandonment Rate
- Peak call times

### Issue Analysis
- **Common Issues Table**: Top 8 issue categories with frequency and resolution rates
- **AI Recommendations**: 5 actionable insights to improve service quality

### Call History
- **Recent Calls Table**: Expandable rows with full call details and transcripts
- Click any row to see transcript preview
- Pagination for browsing through all calls

## 🎛️ Dashboard Controls

### Date Range Filter
Click the date dropdown in the header to switch between:
- Last 7 days
- Last 14 days
- Last 30 days (default)
- Last 90 days

### Refresh Data
Click the **Refresh** button to reload all data with a smooth animation.

### Export Data
Click **Export CSV** to download all call data in CSV format with:
- Date
- Issue Title
- Category
- Duration
- Status
- Sentiment

## 🎨 Theme

The dashboard automatically adapts to your system theme:
- **Light mode**: Warm beige background (#F7F5F3)
- **Dark mode**: Deep brown/black backgrounds

Toggle your system theme to see the dashboard transform!

## 📱 Responsive Design

The dashboard is fully responsive:
- **Desktop**: Full multi-column layout
- **Tablet**: Stacked 2-column grid
- **Mobile**: Single column with optimized spacing

## 🔧 Customization

### Change Company Name
Edit `app/companydashboard/page.tsx`, line 17:
```typescript
const companyName = "United Healthcare"; // Change this
```

### Adjust Mock Data
Edit `convex/mockCompanyData.ts`:
- Change call count in line 230: `generateMockUnitedHealthcareCalls(75)`
- Modify issue categories, templates, and more

### Update Branding
In `app/companydashboard/page.tsx`, find the header section (~line 170) and update:
- Logo (currently "UH" placeholder)
- Company title
- Colors

## 📈 Understanding the Data

### Issue Categories
The system tracks 8 types of issues:
1. **Billing & Payments** - Charges, invoices, refunds
2. **Claims Processing** - Claim status, denials, appeals
3. **Prescription & Pharmacy** - Medications, refills, coverage
4. **Provider Network** - Finding doctors, network status
5. **ID Cards & Documents** - Member cards, proof of coverage
6. **Plan Information** - Benefits, deductibles, enrollment
7. **Authorization & Referrals** - Prior auth, referral management
8. **Account Management** - Login, profile updates

### Sentiment Scores
- **Positive** (>0.2): Happy, satisfied customers
- **Neutral** (-0.2 to 0.2): Standard transactions
- **Negative** (<-0.2): Frustrated, unhappy customers

### Performance Benchmarks
- **FCR Rate**: Target >75% (First Call Resolution)
- **AHT**: Target <15 minutes (Average Handle Time)
- **CES**: Target <2.5 on 1-5 scale (Customer Effort Score)
- **Abandonment**: Target <5% (Calls abandoned in queue)

## 🎯 AI Recommendations

The dashboard automatically analyzes call patterns and generates recommendations for:
- Reducing call times
- Improving resolution rates
- Optimizing staffing during peak hours
- Creating self-service options for common issues
- Enhancing IVR menus

These recommendations update based on the data and date range selected.

## 🔄 Next Steps

### Add Real Data
Once you add the `companyName` field to your Convex schema:

1. Add to `convex/schema.ts`:
```typescript
issues: defineTable({
  // ... existing fields ...
  companyName: v.optional(v.string()),
}),
```

2. Update `convex/companyDashboard.ts` queries to filter by actual data instead of mock data

3. The dashboard will automatically switch from mock to real data!

## 💡 Tips

- **Expand Call Rows**: Click any call in the Recent Calls table to see the full transcript
- **Hover for Details**: Hover over charts for detailed tooltips
- **Watch for Trends**: Green arrows (↑) are good, red arrows (↓) might need attention
- **Check Recommendations**: The AI insights are actionable - they provide specific suggestions
- **Export Regularly**: Use the CSV export for offline analysis or reporting

## 🐛 Troubleshooting

### Dashboard Not Loading?
- Check that both Next.js and Convex dev servers are running
- Verify you're at `http://localhost:3000/companydashboard` (not just `/`)

### No Data Showing?
- The mock data generator runs automatically
- Check browser console for any errors
- Verify Convex connection in the terminal

### Charts Not Rendering?
- Recharts is already installed in your `package.json`
- Clear browser cache and reload
- Check for any console errors

## 📞 Support

Need help? Check these files:
- `COMPANY_DASHBOARD_IMPLEMENTATION.md` - Full implementation details
- `united-healthcare-dashboard.plan.md` - Original plan and architecture
- Component files in `components/company-dashboard/` - Individual component docs

---

Enjoy your new analytics dashboard! 🎉


# United Healthcare Dashboard - Quick Start Guide

## 🚀 Getting Started

### 1. Start Your Development Server

If not already running:

```bash
bun run dev
```

This will start both Next.js and Convex dev servers.

### 2. Access the Dashboard

Open your browser and navigate to:

```
http://localhost:3000/companydashboard
```

## 📊 What You'll See

The dashboard loads with **75 mock United Healthcare calls** from the last 30 days, including:

### Top Section - Key Metrics
- **Total Calls**: 75
- **Average Duration**: ~15 minutes
- **Resolution Rate**: ~70%
- **Customer Satisfaction**: ~65%

All with trend indicators showing month-over-month changes.

### Charts Section
- **Call Volume Chart**: Bar chart showing daily call volume for the last 14 days
- **Sentiment Analysis**: Pie chart with positive/neutral/negative distribution

### Performance Metrics
- First Call Resolution (FCR) rate
- Average Handle Time (AHT)
- Customer Effort Score (CES)
- Call Abandonment Rate
- Peak call times

### Issue Analysis
- **Common Issues Table**: Top 8 issue categories with frequency and resolution rates
- **AI Recommendations**: 5 actionable insights to improve service quality

### Call History
- **Recent Calls Table**: Expandable rows with full call details and transcripts
- Click any row to see transcript preview
- Pagination for browsing through all calls

## 🎛️ Dashboard Controls

### Date Range Filter
Click the date dropdown in the header to switch between:
- Last 7 days
- Last 14 days
- Last 30 days (default)
- Last 90 days

### Refresh Data
Click the **Refresh** button to reload all data with a smooth animation.

### Export Data
Click **Export CSV** to download all call data in CSV format with:
- Date
- Issue Title
- Category
- Duration
- Status
- Sentiment

## 🎨 Theme

The dashboard automatically adapts to your system theme:
- **Light mode**: Warm beige background (#F7F5F3)
- **Dark mode**: Deep brown/black backgrounds

Toggle your system theme to see the dashboard transform!

## 📱 Responsive Design

The dashboard is fully responsive:
- **Desktop**: Full multi-column layout
- **Tablet**: Stacked 2-column grid
- **Mobile**: Single column with optimized spacing

## 🔧 Customization

### Change Company Name
Edit `app/companydashboard/page.tsx`, line 17:
```typescript
const companyName = "United Healthcare"; // Change this
```

### Adjust Mock Data
Edit `convex/mockCompanyData.ts`:
- Change call count in line 230: `generateMockUnitedHealthcareCalls(75)`
- Modify issue categories, templates, and more

### Update Branding
In `app/companydashboard/page.tsx`, find the header section (~line 170) and update:
- Logo (currently "UH" placeholder)
- Company title
- Colors

## 📈 Understanding the Data

### Issue Categories
The system tracks 8 types of issues:
1. **Billing & Payments** - Charges, invoices, refunds
2. **Claims Processing** - Claim status, denials, appeals
3. **Prescription & Pharmacy** - Medications, refills, coverage
4. **Provider Network** - Finding doctors, network status
5. **ID Cards & Documents** - Member cards, proof of coverage
6. **Plan Information** - Benefits, deductibles, enrollment
7. **Authorization & Referrals** - Prior auth, referral management
8. **Account Management** - Login, profile updates

### Sentiment Scores
- **Positive** (>0.2): Happy, satisfied customers
- **Neutral** (-0.2 to 0.2): Standard transactions
- **Negative** (<-0.2): Frustrated, unhappy customers

### Performance Benchmarks
- **FCR Rate**: Target >75% (First Call Resolution)
- **AHT**: Target <15 minutes (Average Handle Time)
- **CES**: Target <2.5 on 1-5 scale (Customer Effort Score)
- **Abandonment**: Target <5% (Calls abandoned in queue)

## 🎯 AI Recommendations

The dashboard automatically analyzes call patterns and generates recommendations for:
- Reducing call times
- Improving resolution rates
- Optimizing staffing during peak hours
- Creating self-service options for common issues
- Enhancing IVR menus

These recommendations update based on the data and date range selected.

## 🔄 Next Steps

### Add Real Data
Once you add the `companyName` field to your Convex schema:

1. Add to `convex/schema.ts`:
```typescript
issues: defineTable({
  // ... existing fields ...
  companyName: v.optional(v.string()),
}),
```

2. Update `convex/companyDashboard.ts` queries to filter by actual data instead of mock data

3. The dashboard will automatically switch from mock to real data!

## 💡 Tips

- **Expand Call Rows**: Click any call in the Recent Calls table to see the full transcript
- **Hover for Details**: Hover over charts for detailed tooltips
- **Watch for Trends**: Green arrows (↑) are good, red arrows (↓) might need attention
- **Check Recommendations**: The AI insights are actionable - they provide specific suggestions
- **Export Regularly**: Use the CSV export for offline analysis or reporting

## 🐛 Troubleshooting

### Dashboard Not Loading?
- Check that both Next.js and Convex dev servers are running
- Verify you're at `http://localhost:3000/companydashboard` (not just `/`)

### No Data Showing?
- The mock data generator runs automatically
- Check browser console for any errors
- Verify Convex connection in the terminal

### Charts Not Rendering?
- Recharts is already installed in your `package.json`
- Clear browser cache and reload
- Check for any console errors

## 📞 Support

Need help? Check these files:
- `COMPANY_DASHBOARD_IMPLEMENTATION.md` - Full implementation details
- `united-healthcare-dashboard.plan.md` - Original plan and architecture
- Component files in `components/company-dashboard/` - Individual component docs

---

Enjoy your new analytics dashboard! 🎉


# United Healthcare Dashboard - Quick Start Guide

## 🚀 Getting Started

### 1. Start Your Development Server

If not already running:

```bash
bun run dev
```

This will start both Next.js and Convex dev servers.

### 2. Access the Dashboard

Open your browser and navigate to:

```
http://localhost:3000/companydashboard
```

## 📊 What You'll See

The dashboard loads with **75 mock United Healthcare calls** from the last 30 days, including:

### Top Section - Key Metrics
- **Total Calls**: 75
- **Average Duration**: ~15 minutes
- **Resolution Rate**: ~70%
- **Customer Satisfaction**: ~65%

All with trend indicators showing month-over-month changes.

### Charts Section
- **Call Volume Chart**: Bar chart showing daily call volume for the last 14 days
- **Sentiment Analysis**: Pie chart with positive/neutral/negative distribution

### Performance Metrics
- First Call Resolution (FCR) rate
- Average Handle Time (AHT)
- Customer Effort Score (CES)
- Call Abandonment Rate
- Peak call times

### Issue Analysis
- **Common Issues Table**: Top 8 issue categories with frequency and resolution rates
- **AI Recommendations**: 5 actionable insights to improve service quality

### Call History
- **Recent Calls Table**: Expandable rows with full call details and transcripts
- Click any row to see transcript preview
- Pagination for browsing through all calls

## 🎛️ Dashboard Controls

### Date Range Filter
Click the date dropdown in the header to switch between:
- Last 7 days
- Last 14 days
- Last 30 days (default)
- Last 90 days

### Refresh Data
Click the **Refresh** button to reload all data with a smooth animation.

### Export Data
Click **Export CSV** to download all call data in CSV format with:
- Date
- Issue Title
- Category
- Duration
- Status
- Sentiment

## 🎨 Theme

The dashboard automatically adapts to your system theme:
- **Light mode**: Warm beige background (#F7F5F3)
- **Dark mode**: Deep brown/black backgrounds

Toggle your system theme to see the dashboard transform!

## 📱 Responsive Design

The dashboard is fully responsive:
- **Desktop**: Full multi-column layout
- **Tablet**: Stacked 2-column grid
- **Mobile**: Single column with optimized spacing

## 🔧 Customization

### Change Company Name
Edit `app/companydashboard/page.tsx`, line 17:
```typescript
const companyName = "United Healthcare"; // Change this
```

### Adjust Mock Data
Edit `convex/mockCompanyData.ts`:
- Change call count in line 230: `generateMockUnitedHealthcareCalls(75)`
- Modify issue categories, templates, and more

### Update Branding
In `app/companydashboard/page.tsx`, find the header section (~line 170) and update:
- Logo (currently "UH" placeholder)
- Company title
- Colors

## 📈 Understanding the Data

### Issue Categories
The system tracks 8 types of issues:
1. **Billing & Payments** - Charges, invoices, refunds
2. **Claims Processing** - Claim status, denials, appeals
3. **Prescription & Pharmacy** - Medications, refills, coverage
4. **Provider Network** - Finding doctors, network status
5. **ID Cards & Documents** - Member cards, proof of coverage
6. **Plan Information** - Benefits, deductibles, enrollment
7. **Authorization & Referrals** - Prior auth, referral management
8. **Account Management** - Login, profile updates

### Sentiment Scores
- **Positive** (>0.2): Happy, satisfied customers
- **Neutral** (-0.2 to 0.2): Standard transactions
- **Negative** (<-0.2): Frustrated, unhappy customers

### Performance Benchmarks
- **FCR Rate**: Target >75% (First Call Resolution)
- **AHT**: Target <15 minutes (Average Handle Time)
- **CES**: Target <2.5 on 1-5 scale (Customer Effort Score)
- **Abandonment**: Target <5% (Calls abandoned in queue)

## 🎯 AI Recommendations

The dashboard automatically analyzes call patterns and generates recommendations for:
- Reducing call times
- Improving resolution rates
- Optimizing staffing during peak hours
- Creating self-service options for common issues
- Enhancing IVR menus

These recommendations update based on the data and date range selected.

## 🔄 Next Steps

### Add Real Data
Once you add the `companyName` field to your Convex schema:

1. Add to `convex/schema.ts`:
```typescript
issues: defineTable({
  // ... existing fields ...
  companyName: v.optional(v.string()),
}),
```

2. Update `convex/companyDashboard.ts` queries to filter by actual data instead of mock data

3. The dashboard will automatically switch from mock to real data!

## 💡 Tips

- **Expand Call Rows**: Click any call in the Recent Calls table to see the full transcript
- **Hover for Details**: Hover over charts for detailed tooltips
- **Watch for Trends**: Green arrows (↑) are good, red arrows (↓) might need attention
- **Check Recommendations**: The AI insights are actionable - they provide specific suggestions
- **Export Regularly**: Use the CSV export for offline analysis or reporting

## 🐛 Troubleshooting

### Dashboard Not Loading?
- Check that both Next.js and Convex dev servers are running
- Verify you're at `http://localhost:3000/companydashboard` (not just `/`)

### No Data Showing?
- The mock data generator runs automatically
- Check browser console for any errors
- Verify Convex connection in the terminal

### Charts Not Rendering?
- Recharts is already installed in your `package.json`
- Clear browser cache and reload
- Check for any console errors

## 📞 Support

Need help? Check these files:
- `COMPANY_DASHBOARD_IMPLEMENTATION.md` - Full implementation details
- `united-healthcare-dashboard.plan.md` - Original plan and architecture
- Component files in `components/company-dashboard/` - Individual component docs

---

Enjoy your new analytics dashboard! 🎉


