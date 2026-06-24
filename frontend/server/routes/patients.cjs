const express = require('express');
const router = express.Router();
const db = require('../database-maria.cjs');

router.get('/', async (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM pacientes ORDER BY created_at DESC');
    const patients = await stmt.all();
    res.json(patients);
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { nombre, fecha_nacimiento } = req.body;
    const stmt = db.prepare('INSERT INTO pacientes (nombre, fecha_nacimiento) VALUES (?, ?)');
    const result = await stmt.run([nombre, fecha_nacimiento]);
    res.json({ id: result.lastInsertRowid, nombre, fecha_nacimiento });
  } catch (error) {
    console.error('Error creating patient:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM pacientes WHERE id = ?');
    const patient = await stmt.get([req.params.id]);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json(patient);
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;