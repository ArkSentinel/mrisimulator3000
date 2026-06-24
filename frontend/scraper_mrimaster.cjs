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

function parseRange(value) {
  if (!value || value === 'N/A') return { min: null, max: null };
  const match = value.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (match) {
    return { min: parseInt(match[1]), max: parseInt(match[2]) };
  }
  const num = parseFloat(value);
  return isNaN(num) ? { min: null, max: null } : { min: num, max: num };
}

function cleanValue(value) {
  if (!value || value === 'N/A') return null;
  return value.replace(/\s+/g, ' ').trim();
}

async function run() {
  console.log(`🚀 Iniciando scraping de ${linksValidos.length} páginas...`);
  
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
        const tituloElemento = document.querySelector('h1, h2, .entry-title');
        const anatomicalRegion = tituloElemento ? tituloElemento.innerText.trim() : "Unknown";

        const indications = [];
        document.querySelectorAll('ul li').forEach(li => {
          if (li.innerText.length < 150) indications.push(li.innerText.trim());
        });

        const sequences = [];
        const tables = document.querySelectorAll('table[border="1"], table');

        tables.forEach((tabla) => {
          let sequenceName = "Unknown Sequence";
          let elementoPrevio = tabla.previousElementSibling;
          for (let k = 0; k < 3; k++) {
            if (!elementoPrevio) break;
            if (['H2', 'H3', 'H4', 'P'].includes(elementoPrevio.tagName) && elementoPrevio.innerText.trim() !== "") {
              sequenceName = elementoPrevio.innerText.trim();
              break;
            }
            elementoPrevio = elementoPrevio.previousElementSibling;
          }

          const filas = tabla.querySelectorAll('tr');
          filas.forEach(fila => {
            const celdas = fila.querySelectorAll('td');
            if (celdas.length > 0) {
              const params = {};
              let esTablaDeParametros = false;

              celdas.forEach(celda => {
                const parrafos = celda.querySelectorAll('p');
                if (parrafos.length >= 2) {
                  const clave = parrafos[0].innerText.toUpperCase().trim();
                  const valor = parrafos[1].innerText.trim();
                  
                  if (clave) {
                    params[clave] = valor;
                    if (['TR', 'TE', 'PLANE', 'SLICE'].includes(clave)) {
                      esTablaDeParametros = true;
                    }
                  }
                }
              });

              if (esTablaDeParametros) {
                sequences.push({
                  sequenceName: sequenceName,
                  plane: params['PLANE'] || "Check text",
                  sliceThickness: params['SLICE'] || params['SLICE THICKNESS'] || "N/A",
                  planningInstructions: "Extracted via selector",
                  parameters: {
                    tr: params['TR'] || "N/A",
                    te: params['TE'] || "N/A",
                    flipAngle: params['FLIP'] || "N/A",
                    phaseDirection: params['PHASE'] || "N/A",
                    matrix: params['MATRIX'] || "N/A",
                    fov: params['FOV'] || "N/A",
                    gap: params['GAP'] || "N/A",
                    nex: params['NEX(AVRAGE)'] || params['NEX'] || "N/A"
                  }
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
          sequences: datosPagina.sequences.map(seq => {
            const trRange = parseRange(seq.parameters.tr);
            const teRange = parseRange(seq.parameters.te);
            const fovRange = parseRange(seq.parameters.fov);
            const flipRange = parseRange(seq.parameters.flipAngle);
            
            return {
              sequence_name: seq.sequenceName,
              plane: cleanValue(seq.plane),
              slice_thickness: cleanValue(seq.sliceThickness),
              planning_instructions: seq.planningInstructions,
              technical_parameters: {
                tr_default: trRange.min && trRange.min === trRange.max ? trRange.min : null,
                tr_min: trRange.min,
                tr_max: trRange.max,
                te_default: teRange.min && teRange.min === teRange.max ? teRange.min : null,
                te_min: teRange.min,
                te_max: teRange.max,
                flip_default: flipRange.min && flipRange.min === flipRange.max ? flipRange.min : null,
                flip_min: flipRange.min,
                flip_max: flipRange.max,
                phase_encoding_default: cleanValue(seq.parameters.phaseDirection),
                matrix_default: cleanValue(seq.parameters.matrix),
                fov_default: fovRange.min && fovRange.min === fovRange.max ? fovRange.min : null,
                fov_min: fovRange.min,
                fov_max: fovRange.max,
                gap_percentage: cleanValue(seq.parameters.gap),
                averages_default: cleanValue(seq.parameters.nex)
              }
            };
          })
        };
        resultados.push(processed);
        console.log(`  ✅ ${datosPagina.sequences.length} secuencias`);
      } else {
        console.log(`  ⚠️ Sin datos`);
      }

    } catch (err) {
      console.error(`  ❌ ${err.message}`);
    } finally {
      await page.close();
    }
  }

  fs.writeFileSync('/home/nicolas/Documentos/protocolos_mri.json', JSON.stringify(resultados, null, 2), 'utf-8');
  await browser.close();
  console.log(`\n💾 Guardado en /home/nicolas/Documentos/protocolos_mri.json`);
  console.log(`Total: ${resultados.length} regiones con secuencias`);
}

run();