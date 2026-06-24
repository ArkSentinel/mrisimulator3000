const puppeteer = require('puppeteer-core');
const fs = require('fs');

const linksValidos = [
  "https://mrimaster.com/plan-adrenals/", "https://mrimaster.com/plan-ankle/", 
  "https://mrimaster.com/plan-anterior-abdominal-wall/", "https://mrimaster.com/plan-arthrogram-hip/",
  "https://mrimaster.com/plan-artro-shoulder/", "https://mrimaster.com/plan-bladder/",
  "https://mrimaster.com/plan-b-plexus/", "https://mrimaster.com/plan-brease/",
  "https://mrimaster.com/plan-cardic/", "https://mrimaster.com/plan-chest/",
  "https://mrimaster.com/plan-clavicle/", "https://mrimaster.com/plan-c-spine/",
  "https://mrimaster.com/plan-elbow/", "https://mrimaster.com/plan-epilipsy/",
  "https://mrimaster.com/plan-face/", "https://mrimaster.com/plan-female-urethra/",
  "https://mrimaster.com/plan-finger/", "https://mrimaster.com/plan-fistula/",
  "https://mrimaster.com/plan-foot/", "https://mrimaster.com/plan-forearm/",
  "https://mrimaster.com/plan-gyne-pelvis/", "https://mrimaster.com/plan-hips/",
  "https://mrimaster.com/plan-humorous/", "https://mrimaster.com/plan-implant-breast/",
  "https://mrimaster.com/plan-knee/", "https://mrimaster.com/plan-kub/",
  "https://mrimaster.com/plan-liver/", "https://mrimaster.com/plan-lower-leg/",
  "https://mrimaster.com/plan-l-plexus/", "https://mrimaster.com/plan-l-spine/",
  "https://mrimaster.com/plan-mra-brain/", "https://mrimaster.com/plan-mra-hand/",
  "https://mrimaster.com/plan-mra-legs/", "https://mrimaster.com/plan-mra-neck/",
  "https://mrimaster.com/plan-mra-renal/", "https://mrimaster.com/plan-mra-subclavians/",
  "https://mrimaster.com/plan-mra-upper-arm/", "https://mrimaster.com/plan-mra-w-body/",
  "https://mrimaster.com/plan-mrcp/", "https://mrimaster.com/plan-mri-kidneys/",
  "https://mrimaster.com/plan-mrv-abd/", "https://mrimaster.com/plan-multiple-sclerosis-ms-protocol/",
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
  "https://mrimaster.com/plan-tmj/", "https://mrimaster.com/plan-trigeminals/",
  "https://mrimaster.com/plan-t-spine/", "https://mrimaster.com/plan-urography/",
  "https://mrimaster.com/plan-wrist/", "https://mrimaster.com/prostate-mri-protocol-and-planning/",
  "https://mrimaster.com/protocol-and-planning-of-iams/", "https://mrimaster.com/qiss-mra/"
];

async function run() {
  console.log(`🚀 Scraping ${linksValidos.length} páginas...`);
  
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

      const datos = await page.evaluate(() => {
        const keyWords = ['TR', 'TE', 'SLICE', 'FLIP', 'PHASE', 'MATRIX', 'FOV', 'GAP', 'NEX', 'NXA', 'PLANE'];
        
        const titulo = document.querySelector('h1, h2, .entry-title');
        const region = titulo ? titulo.innerText.trim() : "Unknown";

        const indications = [];
        document.querySelectorAll('ul li').forEach(li => {
          if (li.innerText.length < 150) indications.push(li.innerText.trim());
        });

        const sequences = [];
        
        function findName(el) {
          let prev = el;
          for (let i = 0; i < 15; i++) {
            if (!prev) return null;
            if (['H2', 'H3', 'H4'].includes(prev.tagName)) {
              const t = prev.innerText.trim();
              if (t && t.length > 3 && t.length < 120) return t;
            }
            prev = prev.previousElementSibling;
          }
          return null;
        }

        function getParams(celdas) {
          const p = {};
          let isP = false;
          celdas.forEach(c => {
            let k = '', v = '';
            const ps = c.querySelectorAll('p');
            if (ps.length >= 2) {
              k = ps[0].innerText.trim();
              v = ps[1].innerText.trim();
            } else {
              const t = c.innerText.trim();
              const m = t.match(/^([A-Za-z\(\)]+)(.+)$/);
              if (m) { k = m[1].trim(); v = m[2].trim().replace(/^[\s\-–:]+/, ''); }
            }
            if (k) {
              p[k.toUpperCase()] = v;
              if (keyWords.includes(k.toUpperCase())) isP = true;
            }
          });
          return { params: p, isParams: isP };
        }

        document.querySelectorAll('table').forEach(t => {
          t.querySelectorAll('tr').forEach(f => {
            const cs = f.querySelectorAll('td');
            if (cs.length > 0) {
              const { params, isParams } = getParams(cs);
              if (isParams) {
                const name = findName(t);
                sequences.push({ name: name || "Unknown", params });
              }
            }
          });
        });

        return { region, indications, sequences };
      });

      if (datos.sequences.length > 0) {
        const processed = {
          source_url: url,
          anatomical_region: datos.region,
          indications: datos.indications.slice(0, 10).join(' | '),
          sequences: datos.sequences.map(s => {
            const parse = (v) => {
              if (!v) return { min: null, max: null };
              const m = v.replace(/\s/g,'').match(/(\d+\.?\d*)\s*[-–]\s*(\d+\.?\d*)/);
              if (m) return { min: parseFloat(m[1]), max: parseFloat(m[2]) };
              const n = parseFloat(v);
              return isNaN(n) ? { min: null, max: null } : { min: n, max: n };
            };
            const clean = (v) => v && v !== 'N/A' ? v.replace(/\s+/g,' ').trim() : null;
            
            const tr = parse(s.params['TR']), te = parse(s.params['TE']), fov = parse(s.params['FOV']), flip = parse(s.params['FLIP']);
            
            return {
              sequence_name: s.name,
              plane: clean(s.params['PLANE']),
              slice_thickness: clean(s.params['SLICE']),
              planning_instructions: null,
              technical_parameters: {
                tr_default: tr.min && tr.min === tr.max ? tr.min : null, tr_min: tr.min, tr_max: tr.max,
                te_default: te.min && te.min === te.max ? te.min : null, te_min: te.min, te_max: te.max,
                flip_default: flip.min && flip.min === flip.max ? flip.min : null, flip_min: flip.min, flip_max: flip.max,
                phase_encoding_default: clean(s.params['PHASE']),
                matrix_default: clean(s.params['MATRIX']),
                fov_default: fov.min && fov.min === fov.max ? fov.min : null, fov_min: fov.min, fov_max: fov.max,
                gap_percentage: clean(s.params['GAP']),
                averages_default: clean(s.params['NEX'] || s.params['NXA'])
              }
            };
          })
        };
        resultados.push(processed);
        console.log(`  ✅ ${datos.sequences.length}: ${datos.sequences[0]?.name}`);
      } else console.log(`  ⚠️ Sin datos`);
    } catch (e) { console.error(`  ❌ ${e.message}`); }
    finally { await page.close(); }
  }

  fs.writeFileSync('/home/nicolas/Documentos/protocolos_mri.json', JSON.stringify(resultados, null, 2));
  await browser.close();
  console.log(`\n💾 /home/nicolas/Documentos/protocolos_mri.json (${resultados.length} regiones)`);
}

run();