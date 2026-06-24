const express = require('express');
const router = express.Router();
const db = require('../database-maria.cjs');

router.get('/', async (req, res) => {
  try {
    const protocolsStmt = db.prepare('SELECT * FROM protocolos ORDER BY id');
    const protocols = await protocolsStmt.all();

    const sequencesStmt = db.prepare('SELECT * FROM secuencias ORDER BY protocolo_id, id');
    const sequences = await sequencesStmt.all();

    const result = protocols.map(protocol => ({
      ...protocol,
      secuencias: sequences.map(seq => ({
        ...seq,
        technical_parameters: seq.technical_parameters ? JSON.parse(seq.technical_parameters) : null
      })).filter(s => s.protocolo_id === protocol.id)
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching protocols:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const protocolStmt = db.prepare('SELECT * FROM protocolos WHERE id = ?');
    const protocol = await protocolStmt.get([req.params.id]);
    
    if (!protocol) {
      return res.status(404).json({ error: 'Protocol not found' });
    }

    const sequencesStmt = db.prepare('SELECT * FROM secuencias WHERE protocolo_id = ?');
    const sequences = await sequencesStmt.all([req.params.id]);
    
    const parsedSequences = sequences.map(seq => ({
      ...seq,
      technical_parameters: seq.technical_parameters ? JSON.parse(seq.technical_parameters) : null
    }));
    
    res.json({ ...protocol, secuencias: parsedSequences });
  } catch (error) {
    console.error('Error fetching protocol:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;