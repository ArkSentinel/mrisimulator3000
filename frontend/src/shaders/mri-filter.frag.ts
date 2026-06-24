export const mriFilterFragmentShader = `
precision mediump float;

uniform sampler2D uTexture;
uniform float uSequenceType;
uniform float uFatSuppression;
uniform float uBaseResolution;
uniform float uNoiseFactor;
uniform float uWc;
uniform float uWw;
uniform float uTime;
uniform float uBValue;
uniform float uHasInfarct;
uniform vec3 uInfarctCenter;
uniform float uInfarctRadius;
uniform float uRotation;
uniform float uSliceThickness;
uniform float uSlices;
uniform float uDistanceFactor;
uniform vec4 uSatBand1;
uniform vec4 uSatBand2;
uniform float uSatBandCount;

varying vec2 vUv;

// Noise function
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Window / Level
float applyWindowLevel(float value, float wc, float ww) {
  float min = wc - ww / 2.0;
  float max = wc + ww / 2.0;
  float clamped = clamp(value, min, max);
  return ((clamped - min) / (max - min)) * 255.0;
}

// MRI filters (match original logic)
float applyT1Filter(float pixel) {
  if (pixel > 230.0) return 30.0;
  if (pixel > 180.0) return 60.0;
  if (pixel > 100.0) return 180.0;
  if (pixel > 60.0) return 120.0;
  return 40.0;
}

float applyT2Filter(float pixel) {
  if (pixel > 230.0) return 255.0;
  if (pixel > 180.0) return 220.0;
  if (pixel > 100.0) return 80.0;
  if (pixel > 60.0) return 140.0;
  return 50.0;
}

float applyFLAIRFilter(float pixel) {
  if (pixel > 230.0) return 15.0;
  if (pixel > 180.0) return 25.0;
  if (pixel > 100.0) return 70.0;
  if (pixel > 60.0) return 130.0;
  return 40.0;
}

float applyPDFilter(float pixel) {
  if (pixel > 200.0) return 180.0;
  if (pixel > 100.0) return 100.0 + (pixel - 100.0) * 0.8;
  return pixel;
}

float applyDWIFilter(float pixel, float bValue, float hasInfarct, vec3 infarctCenter, float infarctRadius, vec2 pixelPos, float rotation) {
  float baseNoise = 50.0;
  float n = (noise(pixelPos * 5.0 + uTime * 0.1) - 0.5) * baseNoise;
  
  float value = pixel;
  
  if (bValue > 0.0) {
    float decay = exp(-bValue / 1500.0);
    value = value * decay * 0.8;
    
    if (hasInfarct > 0.5) {
      float dx = pixelPos.x - infarctCenter.x;
      float dy = pixelPos.y - infarctCenter.y;
      float dist = sqrt(dx * dx + dy * dy);
      
      if (dist < infarctRadius) {
        float intensityBoost = (bValue / 1000.0) * 1.5;
        value = min(255.0, value + 80.0 + intensityBoost * 50.0);
      }
    }
  }
  
  if (pixel > 230.0) {
    value = 15.0 + noise(pixelPos * 3.0) * 10.0;
  }
  
  value += n;
  
  if (bValue > 500.0) {
    float distortion = sin(pixelPos.y * 0.15) * (bValue / 200.0);
    value += distortion;
  }
  
  return clamp(value, 0.0, 255.0);
}

// Sat band effect
bool isInSatBand(vec2 pos, vec4 band) {
  if (band.w < 0.5) return false;
  vec2 center = band.xy;
  vec2 halfSize = band.zw;
  vec2 diff = abs(pos - center);
  return diff.x <= halfSize.x && diff.y <= halfSize.y;
}

void main() {
  vec4 texColor = texture2D(uTexture, vUv);
  float pixel = texColor.r * 255.0;
  
  // Apply sequence filter
  float value;
  int seqType = int(uSequenceType);
  
  if (seqType == 0) {
    value = applyT1Filter(pixel);
  } else if (seqType == 1) {
    value = applyFLAIRFilter(pixel);
  } else if (seqType == 2) {
    value = applyPDFilter(pixel);
  } else if (seqType == 3) {
    value = applyDWIFilter(pixel, uBValue, uHasInfarct, uInfarctCenter, uInfarctRadius, vUv * 256.0, uRotation);
  } else {
    value = applyT2Filter(pixel);
  }
  
  // Fat suppression
  if (uFatSuppression == 1.0 && value > 100.0 && value < 180.0) {
    value = max(20.0, value - 60.0);
  } else if (uFatSuppression == 2.0 && value > 80.0) {
    value = max(15.0, value - 80.0);
  }
  
  // Noise
  float noiseVal = (noise(vUv * 256.0 + uTime * 0.05) - 0.5) * uNoiseFactor;
  value = clamp(value + noiseVal, 0.0, 255.0);
  
  // Resolution effect
  float resolutionFactor = (uBaseResolution < 128.0) ? 4.0 : (uBaseResolution < 256.0) ? 2.0 : 1.0;
  if (resolutionFactor > 1.0 && noise(vUv * 100.0) < 0.3) {
    value = clamp(value + (noise(vUv * 200.0) - 0.5) * 20.0, 0.0, 255.0);
  }
  
  // Sat bands
  vec2 pixelPos = vUv * 256.0;
  if (uSatBandCount > 0.5 && isInSatBand(pixelPos, uSatBand1)) {
    value = 0.0;
  }
  if (uSatBandCount > 1.5 && isInSatBand(pixelPos, uSatBand2)) {
    value = 0.0;
  }
  
  // Window / Level
  float finalValue = applyWindowLevel(value, uWc, uWw) / 255.0;
  
  gl_FragColor = vec4(vec3(finalValue), 1.0);
}
`;
