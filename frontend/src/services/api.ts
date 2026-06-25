const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface User {
  id: number;
  email: string;
  nombre: string;
  role: 'estudiante' | 'docente' | 'admin';
}

export interface UserXP {
  xp_total: number;
  nivel: number;
  racha_dias: number;
  examenes_totales: number;
  ultimo_examen: string | null;
}

export interface Achievement {
  codigo: string;
  nombre: string;
  descripcion: string;
  icono: string;
}

export interface MeResponse {
  user: User;
  xp: UserXP;
  achievements: Achievement[];
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Categoria {
  id: number;
  nombre: string;
  nombre_corto: string;
  padre_id: number | null;
  orden: number;
  icono: string;
  hijos?: Categoria[];
}

export interface Protocol {
  id: number;
  nombre: string;
  descripcion: string;
  anatomical_region: string;
  indications: string;
  source_url: string;
}

export interface Sequence {
  id: number;
  protocolo_id: number;
  nombre_secuencia: string;
  plane: string;
  tr_default: number;
  te_default: number;
  fov_default: number;
  slice_thickness_default: number;
  tr_min: number;
  tr_max: number;
  te_min: number;
  te_max: number;
  fov_min: number;
  fov_max: number;
  flip_angle_min: number;
  flip_angle_max: number;
  slice_thickness_min: number;
  slice_thickness_max: number;
  matrix_min: number;
  matrix_max: number;
  nex_min: number;
  nex_max: number;
  orientation_default: string;
  fat_suppression_default: string;
  phase_encoding_default: string;
}

export interface Paciente {
  id: number;
  nombre: string;
  fecha_nacimiento: string;
  accession: string;
  hora?: string;
  procedure_type?: string;
}

export interface ExamParams {
  tr: number;
  te: number;
  ti: number;
  fov_read: number;
  fov_phase: number;
  slice_thickness: number;
  slice_gap: number;
  flip_angle: number;
  matrix_size: number;
  nex: number;
  phase_encoding: string;
  fat_sat: boolean;
  orientation: string;
  isocenter_x?: number;
  isocenter_y?: number;
  isocenter_z?: number;
}

export interface ScoreBreakdown {
  total: number;
  planificacion: number;
  centraje: number;
  contraste: number;
}

export interface QualityMetrics {
  snr: number;
  contraste: number;
  ruido: number;
  artifacts: number;
}

export interface ErrorPoint {
  type: string;
  severity: number;
  position?: { x: number; y: number; slice: number };
  description: string;
}

export interface HeatmapData {
  errors: ErrorPoint[];
}

export interface Recommendation {
  level: 'error' | 'warning' | 'info';
  text: string;
}

export interface ParameterCheck {
  param: string;
  status: 'ok' | 'warning' | 'error';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
  expected: string;
  message?: string;
}

export interface EvaluationResponse {
  score: ScoreBreakdown;
  quality: QualityMetrics;
  heatmap: HeatmapData;
  recommendations: Recommendation[];
  checks: ParameterCheck[];
}

class API {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('mri_token');
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      this.logout();
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const error = await res.text();
      throw new Error(error || `HTTP ${res.status}`);
    }

    return res.json();
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    this.token = data.token;
    localStorage.setItem('mri_token', data.token);
    localStorage.setItem('mri_user', JSON.stringify(data.user));

    return data;
  }

  logout() {
    this.token = null;
    localStorage.removeItem('mri_token');
    localStorage.removeItem('mri_user');
  }

  getUser(): User | null {
    const userStr = localStorage.getItem('mri_user');
    return userStr ? JSON.parse(userStr) : null;
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  async getMe(): Promise<MeResponse> {
    return this.request('/auth/me');
  }

  async getCategories(): Promise<Categoria[]> {
    return this.request('/categories');
  }

  async getProtocols(): Promise<Protocol[]> {
    return this.request('/protocols');
  }

  async getProtocol(id: number): Promise<Protocol> {
    return this.request(`/protocols/${id}`);
  }

  async getSequences(protocolId: number): Promise<Sequence[]> {
    return this.request(`/protocols/${protocolId}/sequences`);
  }

  async searchProtocols(query: string): Promise<Protocol[]> {
    return this.request(`/protocols/search?q=${encodeURIComponent(query)}`);
  }

  async getPatients(): Promise<Paciente[]> {
    return this.request('/patients');
  }

  async createExam(pacienteId: number, protocoloId: number, params: ExamParams[]): Promise<{ id: number }> {
    return this.request('/exams', {
      method: 'POST',
      body: JSON.stringify({
        paciente_id: pacienteId,
        protocolo_id: protocoloId,
        params,
      }),
    });
  }

  async getMyExams(): Promise<unknown[]> {
    return this.request('/exams/my');
  }

  async evaluateExam(examId: number): Promise<EvaluationResponse> {
    return this.request(`/exams/${examId}/evaluate`, {
      method: 'POST',
    });
  }

  async getExamResults(examId: number): Promise<unknown[]> {
    return this.request(`/exams/${examId}/results`);
  }
}

export const api = new API();
export default api;
