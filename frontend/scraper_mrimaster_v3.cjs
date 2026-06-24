const puppeteer = require('puppeteer-core');
const fs = require('fs');

const todosLosLinks = [
  "https://mrimaster.com/plan-adrenals/", "https://mrimaster.com/plan-ankle/", 
  "https://mrimaster.com/plan-anterior-abdominal-wall/", "https://mrimaster.com/plan-arthrogram-hip/",
  "https://mrimaster.com/plan-artro-shoulder/", "https://mrimaster.com/plan-bladder/",
  "https://mrimaster.com/plan-b-plexus/", "https://mrimaster.com/plan-brain-image-loc-4/",
  "https://mrimaster.com/plan-brease/", "https://mrimaster.com/plan-cardic/",
  "https://mrimaster.com/plan-cardic-stress-perfusion/", "https://mrimaster.com/plan-chest/",
  "https://mrimaster.com/plan-clavicle/", "https://mrimaster.com/plan-c-spine/",
  "https://mrimaster.com/plan-elbow/", "https://mrimaster.com/plan-epilipsy/",
  "https://mrimaster.com/plan-face/", "https://mrimaster.com/plan-female-urethra/",
  "https://mrimaster.com/plan-finger/", "https://mrimaster.com/plan-fistula/",
  "https://mrimaster.com/plan-foot/", "https://mrimaster.com/plan-forearm/",
  "https://mrimaster.com/plan-gyne-pelvis/", "https://mrimaster.com/plan-hips/",
  "https://mrimaster.com/plan-humorous/", "https://mrimaster.com/plan-implant-breast/",
  "https://mrimaster.com/plan-knee/", "https://mrimaster.com/plan-kub/",
  "https://mrimaster.com/plan-liver/", "https://mrimaster.com/plan-liver-t1-post-dyna/",
  "https://mrimaster.com/plan-lower-leg/", "https://mrimaster.com/plan-l-plexus/",
  "https://mrimaster.com/plan-l-spine/", "https://mrimaster.com/plan-mra-brain/",
  "https://mrimaster.com/plan-mra-hand/", "https://mrimaster.com/plan-mra-legs/",
  "https://mrimaster.com/plan-mra-neck/", "https://mrimaster.com/plan-mra-renal/",
  "https://mrimaster.com/plan-mra-subclavians/", "https://mrimaster.com/plan-mra-upper-arm/",
  "https://mrimaster.com/plan-mra-w-body/", "https://mrimaster.com/plan-mrcp/",
  "https://mrimaster.com/plan-mri-kidneys/", "https://mrimaster.com/plan-mrv-abd/",
  "https://mrimaster.com/plan-multiple-sclerosis-ms-protocol/", "https://mrimaster.com/planning/",
  "https://mrimaster.com/plan-orbits/", "https://mrimaster.com/plan-pancreas/",
  "https://mrimaster.com/plan-penis/", "https://mrimaster.com/plan-placenta/",
  "https://mrimaster.com/plan-procto-gram/", "https://mrimaster.com/plan-prostate/",
  "https://mrimaster.com/plan-psos/", "https://mrimaster.com/plan-rectal-ca-pelvis/",
  "https://mrimaster.com/plan-rv-fistula/", "https://mrimaster.com/plan-scapula/",
  "https://mrimaster.com/plan-secretin-mrcp/", "https://mrimaster.com/plan-shoulder/",
  "https://mrimaster.com/plan-sialography/", "https://mrimaster.com/plan-sij/",
  "https://mrimaster.com/plan-small-bowel/", "https://mrimaster.com/plan-soft-tissue-neck/",
  "https://mrimaster.com/plan-spinal-cord/", "https://mrimaster.com/plan-strnum/",
  "https://mrimaster.com/plan-testis/", "https://mrimaster.com/plan-thigh/",
  "https://mrimaster.com/plan-tmj/", "https://mrimaster.com/plan-tmj-loc/",
  "https://mrimaster.com/plan-tmj-pd-coronal-lt-close-mouth/", "https://mrimaster.com/plan-tmj-pd-coronal-rt-close-mouth/",
  "https://mrimaster.com/plan-tmj-pd-sag-close-mouth/", "https://mrimaster.com/plan-tmj-pd-sag-close-mouth-2/",
  "https://mrimaster.com/plan-tmj-pd-sag-open-mouth/", "https://mrimaster.com/plan-tmj-pd-sag-open-mouth-2/",
  "https://mrimaster.com/plan-tmj-stir-sag-close-mouth/", "https://mrimaster.com/plan-tmj-stir-sag-close-mouth-2/",
  "https://mrimaster.com/plan-tmj-t2-axial/", "https://mrimaster.com/plan-trigeminals/",
  "https://mrimaster.com/plan-t-spine/", "https://mrimaster.com/plan-urography/",
  "https://mrimaster.com/plan-wrist/", "https://mrimaster.com/projection-artifact/",
  "https://mrimaster.com/prostate-mri-protocol-and-planning/", "https://mrimaster.com/protocol-and-planning-of-iams/",
  "https://mrimaster.com/qiss-mra/"
];

const linksValidos = todosLosLinks.filter(href => {
  const cumpleInclusion = href.includes('plan') || href.includes('protocol-and-planning');
  const esExcluido = href.includes('-pd-') || href.includes('-stir-') || href.includes('-t2-axial') || href.includes('artifact') || href.endsWith('/planning/');
  return cumpleInclusion && !esExcluido;
});

const keyWords = ['TR', 'TE', 'SLICE', 'FLIP', 'PHASE', 'MATRIX', 'FOV', 'GAP', 'NEX', 'NXA', 'NEX(AVRAGE)', 'PLANE'];

function parseRange(value) {
  if (!value || value === 'N/A' || value === '') return { min: null, max: null };
  const cleanVal = value.replace(/\s/g, '');
  const match = cleanVal.match(/(\d+\.?\d*)\s*[-–]\s*(\d+\.?\d*)/);
  if (match) return { min: parseFloat(match[1]), max: parseFloat(match[2]) };
  const num = parseFloat(value);
  return isNaN(num) ? { min: null, max: null } : { min: num, max: num };
}

function cleanValue(v) {
  if (!v || v === 'N/A') return null;
  return v.replace(/\s+/g, ' ').trim();
}

async function run() {
  console.log(`🚀 Scraping de ${linksValidos.length} páginas...`);
  
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const resultados = [];

  for (let i = 0; i < linksValidos.length; i++) {
    const url = linksValidos[i];
    console.log(`[${i + 1}/${linksValidos.length}] ${url}`);
    
    const page = await browser.newPage();
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });

      const datosPagina = await page.evaluate(() => {
        const titulo = document.querySelector('h1, h2, .entry-title');
        const anatomicalRegion = titulo ? titulo.innerText.trim() : "Unknown";

        const indications = [];
        document.querySelectorAll('ul li').forEach(li => {
          if (li.innerText.length < 150) indications.push(li.innerText.trim());
        });

        const sequences = [];
        
        function findSequenceName(el) {
          let prev = el;
          for (let i = 0; i < 15; i++) {
            if (!prev) return null;
            const tag = prev.tagName;
            if (['H2', 'H3', 'H4'].includes(tag)) {
              const text = prev.innerText.trim();
              if (text && text.length > 3 && text.length < 120) return text;
            }
            prev = prev.previousElementSibling;
          }
          return null;
        }

        function extractParams(celdas) {
          const params = {};
          let isParams = false;
          celdas.forEach(celda => {
            let key = '', val = '';
            const ps = celda.querySelectorAll('p');
            if (ps.length >= 2) {
              key = ps[0].innerText.trim();
              val = ps[1].innerText.trim();
            } else {
              const txt = celda.innerText.trim();
              const m = txt.match(/^([A-Za-z\(\)]+)(.+)$/);
              if (m) {
                key = m[1].trim();
                val = m[2].trim().replace(/^[\s\-–:]+/, '');
              }
            }
            if (key) {
              params[key.toUpperCase()] = val;
              if (keyWords.includes(key.toUpperCase())) isParams = true;
            }
          });
          return { params, isParams };
        }

        document.querySelectorAll('table').forEach(tabla => {
          tabla.querySelectorAll('tr').forEach(fila => {
            const celdas = fila.querySelectorAll('td');
            if (celdas.length > 0) {
              const { params, isParams } = extractParams(celdas);
              if (isParams) {
                const seqName = findSequenceName(tabla);
                sequences.push({
                  seqName: seqName || "Unknown",
                  params: params
                });
              }
            }
          });
        });

        return { anatomicalRegion, indications, sequences };
      });

      if (datosPagina.sequences.length > 0) {
        const processed = {
          source_url: url,
          anatomical_region: datosPagina.anatomicalRegion,
          indications: datosPagina.indications.slice(0, 10).join(' | '),
          sequences: datosPagina.sequences.map(s => {
            const trR = parseRange(s.params['TR']);
            const teR = parseRange(s.params['TE']);
            const fovR = parseRange(s.params['FOV']);
            const flipR = parseRange(s.params['FLIP']);
            
            return {
              sequence_name: s.seqName,
              plane: cleanValue(s.params['PLANE']),
              slice_thickness: cleanValue(s.params['SLICE'] || s.params['SLICE THICKNESS']),
              planning_instructions: null,
              technical_parameters: {
                tr_default: (trR.min && trR.min === trR.max) ? trR.min : null,
                tr_min: trR.min,
                tr_max: trR.max,
                te_default: (teR.min && teR.min === teR.max) ? teR.min : null,
                te_min: teR.min,
                te_max: teR.max,
                flip_default: (flipR.min && flipR.min === flipR.max) ? flipR.min : null,
                flip_min: flipR.min,
                flip_max: flipR.max,
                phase_encoding_default: cleanValue(s.params['PHASE'] || s.params['PHASE ENCODING']),
                matrix_default: cleanValue(s.params['MATRIX']),
                fov_default: (fovR.min && fovR.min === fovR.max) ? fovR.min : null,
                fov_min: fovR.min,
                fov_max: fovR.max,
                gap_percentage: cleanValue(s.params['GAP']),
                averages_default: cleanValue(s.params['NEX'] || s.params['NXA'] || s.params['NEX(AVRAGE)'])
              }
            };
          })
        };
        resultados.push(processed);
        console.log(`  ✅ ${datosPagina.sequences.length} seq: ${datosPagina.sequences[0]?.seqName}`);
      } else {
        console.log(`  ⚠️ Sin datos`);
      }

    } catch (err) {
      console.error(`  ❌ ${err.message}`);
    } finally {
      await page.close();
    }
  }

  fs.writeFileSync('/home/nicolas/Documentos/protocolos_mri.json', JSON.stringify(resultados, null, 2));
  await browser.close();
  console.log(`\n💾 /home/nicolas/Documentos/protocolos_mri.json`);
  console.log(`Total: ${resultados.length} regiones`);
}

run();