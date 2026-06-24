const mysql = require('mysql2/promise');
const fs = require('fs');

function toNumber(val) {
  if (val === null || val === undefined || val === '') return null;
  const num = parseFloat(String(val).replace(/[^\d.]/g, ''));
  return isNaN(num) ? null : num;
}

async function importData() {
  const data = JSON.parse(fs.readFileSync('./data/protocolos_mri.json', 'utf-8'));
  
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'opencode',
    password: '12345',
    database: 'mri_console'
  });

  console.log(`Importando ${data.length} protocolos...`);
  
  await connection.query('SET FOREIGN_KEY_CHECKS = 0');
  await connection.query('DELETE FROM secuencias');
  await connection.query('DELETE FROM protocolos');
  await connection.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log('Datos anteriores eliminados');

  let totalSec = 0;
  let okCount = 0;

  for (const protocolo of data) {
    const pName = protocolo.anatomical_region;
    try {
      await connection.query(
        'INSERT INTO protocolos (nombre, descripcion, anatomical_region, indications, source_url) VALUES (?, ?, ?, ?, ?)',
        [pName, pName, pName, protocolo.indications || '', protocolo.source_url]
      );
      
      const [rows] = await connection.query('SELECT LAST_INSERT_ID() as id');
      const protocoloId = rows[0].id;
      
      for (const seq of protocolo.sequences) {
        const s = seq.technical_parameters || {};
        
        // Build values manually with connection.escape
        const values = [
          protocoloId,
          seq.sequence_name,
          toNumber(s.tr_default),
          toNumber(s.te_default),
          toNumber(s.fov_default),
          toNumber(s.slice_thickness_default) || toNumber(seq.slice_thickness),
          s.matrix_default || null,
          toNumber(s.flip_default),
          s.orientation_default || seq.plane || null,
          toNumber(s.averages_default) || toNumber(s.nex),
          s.fat_suppression_default || null,
          s.phase_encoding_default || null,
          toNumber(s.base_resolution_default),
          toNumber(s.phase_resolution_default),
          s.phase_partial_fourier_default || null,
          toNumber(s.phase_oversampling_default),
          toNumber(s.concatenations_default),
          s.gradient_mode_default || null,
          toNumber(s.multiband_factor_default),
          toNumber(s.tr_min),
          toNumber(s.tr_max),
          toNumber(s.te_min),
          toNumber(s.te_max),
          toNumber(seq.slice_thickness),
          toNumber(s.flip_angle_min),
          toNumber(s.flip_angle_max),
          s.phase_direction || null,
          s.matrix_size || null,
          toNumber(s.fov_min),
          toNumber(s.fov_max),
          toNumber(s.gap_percentage),
          toNumber(s.nex),
          seq.plane || null,
          seq.planning_instructions || null,
          JSON.stringify(s)
        ];
        
        const columns = 'protocolo_id, nombre_secuencia, tr_default, te_default, fov_default, slice_thickness_default, matrix_default, flip_default, orientation_default, averages_default, fat_suppression_default, phase_encoding_default, base_resolution_default, phase_resolution_default, phase_partial_fourier_default, phase_oversampling_default, concatenations_default, gradient_mode_default, multiband_factor_default, tr_min, tr_max, te_min, te_max, slice_thickness, flip_angle_min, flip_angle_max, phase_direction, matrix_size, fov_min, fov_max, gap_percentage, nex, plane, planning_instructions, technical_parameters';
        const placeholders = values.map(() => '?').join(', ');
        
        await connection.query(`INSERT INTO secuencias (${columns}) VALUES (${placeholders})`, values);
        totalSec++;
      }
      
      okCount++;
      console.log(`✅ ${pName}: ${protocolo.sequences.length} secuencias`);
      
    } catch (err) {
      console.error(`❌ ${pName}: ${err.message}`);
    }
  }

  await connection.end();
  console.log(`\n💾 Importación: ${totalSec} secuencias en ${okCount} protocolos`);
}

importData().catch(console.error);