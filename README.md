# AH Flip Platform - Turtle WoW

## Setup

1. **Install dependencies**
```bash
cd server
npm install
```

2. **Start the server**
```bash
npm start
```

3. **Open dashboard**
Visit http://localhost:3000 in your browser.

## Usage & Debugging

- Click **Choose File** and select your `aux-addon.lua`.
- Open browser DevTools → Console to see parsing logs:
  - Raw file length
  - Number of history & post entries
  - Warnings if blocks are missing
- Click **Refresh Data** to fetch external AH stats and update table.
- Adjust ROI/Volume filters to find flip candidates.

---
Feel free to extend sparklines, alerts, or export functionality!

