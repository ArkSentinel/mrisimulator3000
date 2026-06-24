export type SequenceStatus = 'idle' | 'ready' | 'running' | 'completed';

export interface SatBand {
  id: string;
  x: number;
  y: number;
  width: number;
  thickness: number;
  angle: number;
  enabled: boolean;
}

export interface Sequence {
  id: number;
  name: string;
  status: SequenceStatus;
  protocolo_id?: number;
  
  // Campos adicionales
  requiresSetup?: boolean;
  setupReason?: string;
  estimatedTime?: number;
  
  // Campos de la nueva estructura
  plane?: string;
  slice_thickness?: number;
  planning_instructions?: string;
  technical_parameters?: Record<string, unknown>;
  
  // Defaults (se cargan al seleccionar)
  tr_default?: number;
  te_default?: number;
  fov_default?: number;
  slice_thickness_default?: number;
  matrix_default?: string;
  flip_default?: number;
  orientation_default?: string;
  averages_default?: number;
  fat_suppression_default?: string;
  phase_encoding_default?: string;
  base_resolution_default?: number;
  phase_resolution_default?: number;
  phase_partial_fourier_default?: string;
  phase_oversampling_default?: number;
  concatenations_default?: number;
  gradient_mode_default?: string;
  multiband_factor_default?: number;
  
  // Rangos para evaluación
  tr_min?: number;
  tr_max?: number;
  te_min?: number;
  te_max?: number;
  flip_angle_min?: number;
  flip_angle_max?: number;
  phase_direction?: string;
  matrix_size?: string;
  fov_min?: number;
  fov_max?: number;
  gap_percentage?: number;
  nex?: number;
}

export interface Protocol {
  id: number;
  nombre: string;
  descripcion: string;
  anatomical_region?: string;
  indications?: string;
  source_url?: string;
  secuencias?: Sequence[];
}

export interface ViewerData {
  id: number;
  title: string;
  viewType: 'AXIAL' | 'CORONAL' | 'SAGITTAL';
  fov: string;
  tr: string;
  te: string;
  ti: string;
  slice: string;
}

export interface ParameterTab {
  id: string;
  label: string;
}

export interface Parameter {
  id: string;
  label: string;
  value: string;
  unit: string;
  type?: 'select' | 'number' | 'button';
  options?: string[];
}

export interface ParameterGroup {
  id: string;
  label: string;
  parameters: Parameter[];
}

// Parámetros completos de la consola
export interface MRISequenceParams {
  // Routine
  sliceGroup: number;
  slices: number;
  sliceThickness: number;
  distanceFactor: number;
  orientation: 'Axial' | 'Sagittal' | 'Coronal';
  fovRead: number;
  fovPhase: number;
  
  // Contrast
  tr: number;
  te: number;
  flipAngle: number;
  averages: number;
  fatSuppression: 'None' | 'FatSat' | 'STIR';
  
  // Resolution
  baseResolution: number;
  phaseResolution: number;
  phasePartialFourier: 'Off' | '7/8' | '6/8';
  
  // Geometry
  phaseEncodingDir: 'R >> L' | 'A >> P' | 'L >> R' | 'P >> A';
  phaseOversampling: number;
  concatenations: number;
  
  // System
  coilElements: string;
  gradientMode: 'Normal' | 'Whisper' | 'Performance';
  multibandFactor: number;
  wc: number;
  ww: number;
  
  // Sequence (informativo)
  sequenceName: string;
  
  // DWI
  bValue?: number;
  hasInfarct?: boolean;
  infarctLocation?: { x: number; y: number; radius: number };

  // Saturation Bands
  satBands: SatBand[];
}

export const defaultParams: MRISequenceParams = {
  sliceGroup: 1,
  slices: 24,
  sliceThickness: 3.0,
  distanceFactor: 10,
  orientation: 'Axial',
  fovRead: 220,
  fovPhase: 81,
  
  tr: 4000,
  te: 100,
  flipAngle: 150,
  averages: 2,
  fatSuppression: 'None',
  
  baseResolution: 320,
  phaseResolution: 100,
  phasePartialFourier: 'Off',
  
  phaseEncodingDir: 'R >> L',
  phaseOversampling: 0,
  concatenations: 1,
  
  coilElements: 'HEA; HEP',
  gradientMode: 'Normal',
  multibandFactor: 1,
  wc: 128,
  ww: 256,
  
  sequenceName: 'T2_TSE_AXIAL',
  satBands: []
};

export const sequences: Sequence[] = [
  { 
    id: 1, 
    name: 'T1_SE_AXIAL', 
    status: 'ready', 
    protocolo_id: 1,
    tr_default: 500, te_default: 15, fov_default: 220, slice_thickness_default: 3.0,
    matrix_default: '256x256', flip_default: 90, orientation_default: 'Axial',
    averages_default: 1, fat_suppression_default: 'None', phase_encoding_default: 'R >> L',
    base_resolution_default: 256, phase_resolution_default: 100, phase_partial_fourier_default: 'Off',
    phase_oversampling_default: 0, concatenations_default: 1, gradient_mode_default: 'Normal', multiband_factor_default: 1,
    tr_min: 400, tr_max: 600, te_min: 10, te_max: 20, slice_thickness: 3.0
  },
  { 
    id: 2, 
    name: 'T2_TSE_AXIAL', 
    status: 'running', 
    protocolo_id: 1,
    tr_default: 4000, te_default: 100, fov_default: 220, slice_thickness_default: 3.0,
    matrix_default: '320x320', flip_default: 150, orientation_default: 'Axial',
    averages_default: 2, fat_suppression_default: 'None', phase_encoding_default: 'R >> L',
    base_resolution_default: 320, phase_resolution_default: 100, phase_partial_fourier_default: 'Off',
    phase_oversampling_default: 0, concatenations_default: 1, gradient_mode_default: 'Normal', multiband_factor_default: 1,
    tr_min: 3500, tr_max: 5500, te_min: 80, te_max: 120, slice_thickness: 3.0
  },
  { 
    id: 3, 
    name: 'FLAIR_AXIAL', 
    status: 'ready', 
    protocolo_id: 1,
    tr_default: 9000, te_default: 120, fov_default: 220, slice_thickness_default: 3.0,
    matrix_default: '256x256', flip_default: 150, orientation_default: 'Axial',
    averages_default: 1, fat_suppression_default: 'None', phase_encoding_default: 'R >> L',
    base_resolution_default: 256, phase_resolution_default: 100, phase_partial_fourier_default: '7/8',
    phase_oversampling_default: 0, concatenations_default: 1, gradient_mode_default: 'Normal', multiband_factor_default: 1,
    tr_min: 8000, tr_max: 10000, te_min: 100, te_max: 140, slice_thickness: 3.0
  },
];

export const viewerData: ViewerData[] = [
  { id: 1, title: 'AXIAL', viewType: 'AXIAL', fov: '220', tr: '4000', te: '100', ti: '---', slice: '12/24' },
  { id: 2, title: 'CORONAL', viewType: 'CORONAL', fov: '220', tr: '4000', te: '100', ti: '---', slice: '15/24' },
  { id: 3, title: 'SAGITTAL', viewType: 'SAGITTAL', fov: '220', tr: '4000', te: '100', ti: '---', slice: '18/24' },
];

export const paramTabs: ParameterTab[] = [
  { id: 'routine', label: 'Routine' },
  { id: 'contrast', label: 'Contrast' },
  { id: 'resolution', label: 'Resolution' },
  { id: 'geometry', label: 'Geometry' },
  { id: 'satbands', label: 'Sat Bands' },
  { id: 'system', label: 'System' },
  { id: 'sequence', label: 'Sequence' },
];

export const parameterGroups: Record<string, ParameterGroup[]> = {
  routine: [
    {
      id: 'group1',
      label: 'Slice Configuration',
      parameters: [
        { id: 'sliceGroup', label: 'Slice Group', value: '1', unit: '' },
        { id: 'slices', label: 'Slices', value: '24', unit: '' },
        { id: 'sliceThickness', label: 'Slice Thick', value: '3.0', unit: 'mm', type: 'number', options: ['1.0', '1.5', '2.0', '2.5', '3.0', '3.5', '4.0', '5.0'] },
        { id: 'distanceFactor', label: 'Distance Fact', value: '10', unit: '%' },
      ],
    },
    {
      id: 'group2',
      label: 'Geometry',
      parameters: [
        { id: 'orientation', label: 'Orientation', value: 'Axial', unit: '', type: 'select', options: ['Axial', 'Coronal', 'Sagittal'] },
        { id: 'fovRead', label: 'FoV Read', value: '220', unit: 'mm' },
        { id: 'fovPhase', label: 'FoV Phase', value: '81', unit: '%' },
      ],
    },
  ],
  contrast: [
    {
      id: 'group1',
      label: 'Timing Parameters',
      parameters: [
        { id: 'tr', label: 'TR', value: '4000', unit: 'ms' },
        { id: 'te', label: 'TE', value: '100', unit: 'ms' },
        { id: 'flipAngle', label: 'Flip Angle', value: '150', unit: '°' },
      ],
    },
    {
      id: 'group2',
      label: 'Acquisition',
      parameters: [
        { id: 'averages', label: 'Averages/NEX', value: '2', unit: '' },
        { id: 'fatSuppression', label: 'Fat Suppress', value: 'None', unit: '', type: 'select', options: ['None', 'FatSat', 'STIR'] },
      ],
    },
    {
      id: 'group3',
      label: 'DWI (Diffusion)',
      parameters: [
        { id: 'bValue', label: 'b-value', value: '0', unit: 's/mm²', type: 'select', options: ['0', '50', '100', '500', '1000', '2000'] },
        { id: 'clinicalCase', label: 'Case', value: 'Normal', unit: '', type: 'select', options: ['Normal', 'Acute Stroke', 'MS Lesions'] },
      ],
    },
  ],
  resolution: [
    {
      id: 'group1',
      label: 'Encoding',
      parameters: [
        { id: 'baseResolution', label: 'Base Res', value: '320', unit: '', type: 'select', options: ['256', '320', '384', '512'] },
        { id: 'phaseResolution', label: 'Phase Res', value: '100', unit: '%' },
      ],
    },
    {
      id: 'group2',
      label: 'Partial Fourier',
      parameters: [
        { id: 'phasePartialFourier', label: 'Phase PF', value: 'Off', unit: '', type: 'select', options: ['Off', '7/8', '6/8', '5/8'] },
      ],
    },
  ],
  geometry: [
    {
      id: 'group1',
      label: 'Phase Encoding',
      parameters: [
        { id: 'phaseEncodingDir', label: 'Phase Enc Dir', value: 'R >> L', unit: '', type: 'select', options: ['R >> L', 'L >> R', 'A >> P', 'P >> A'] },
        { id: 'phaseOversampling', label: 'Phase Oversamp', value: '0', unit: '%' },
      ],
    },
    {
      id: 'group2',
      label: 'Acquisition',
      parameters: [
        { id: 'concatenations', label: 'Concat', value: '1', unit: '' },
      ],
    },
  ],
  satbands: [
    {
      id: 'group1',
      label: 'Saturation Bands',
      parameters: [
        { id: 'addSatBand', label: 'Add Band', value: '+', unit: '', type: 'button' },
      ],
    },
  ],
  system: [
    {
      id: 'group1',
      label: 'System',
      parameters: [
        { id: 'coilElements', label: 'Coil Elements', value: 'HEA; HEP', unit: '' },
        { id: 'gradientMode', label: 'Gradient Mode', value: 'Normal', unit: '', type: 'select', options: ['Normal', 'Whisper', 'Performance'] },
      ],
    },
    {
      id: 'group2',
      label: 'Acceleration',
      parameters: [
        { id: 'multibandFactor', label: 'Multi-band', value: '1', unit: '' },
      ],
    },
    {
      id: 'group3',
      label: 'Window / Level',
      parameters: [
        { id: 'wc', label: 'Window Center', value: '128', unit: '' },
        { id: 'ww', label: 'Window Width', value: '256', unit: '' },
      ],
    },
  ],
  sequence: [
    {
      id: 'group1',
      label: 'Sequence Info',
      parameters: [
        { id: 'sequenceName', label: 'Sequence', value: 'T2_TSE_AXIAL', unit: '' },
        { id: 'scanTime', label: 'Scan Time', value: '4:32', unit: '' },
        { id: 'sar', label: 'SAR', value: '0.42', unit: '%' },
      ],
    },
  ],
};