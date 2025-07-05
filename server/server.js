const path = require('path');
const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Serve static client files
app.use(express.static(path.join(__dirname, '../client')));

// API routes
app.use('/api/ah', require('./routes/ah'));

// Fallback
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.listen(port, () => {
  console.log(`AH Flip Platform running at http://localhost:${port}`);
});