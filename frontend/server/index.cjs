const express = require('express');
const cors = require('cors');
const path = require('path');
const patientsRouter = require('./routes/patients.cjs');
const examsRouter = require('./routes/exams.cjs');
const protocolsRouter = require('./routes/protocols.cjs');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/patients', patientsRouter);
app.use('/api/exams', examsRouter);
app.use('/api/protocols', protocolsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});