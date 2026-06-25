import { useEffect, useState } from 'react';
import { X, Trophy, Star, Zap, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import type { EvaluationResponse, ErrorPoint } from '../../services/api';
import { API_BASE } from '../../config/api';

interface DebriefingOverlayProps {
  examId: number;
  onClose: () => void;
}

export default function DebriefingOverlay({ examId, onClose }: DebriefingOverlayProps) {
  const [data, setData] = useState<EvaluationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'score' | 'heatmap' | 'recommendations'>('score');

  useEffect(() => {
    const loadResults = async () => {
      try {
        const response = await fetch(`${API_BASE}/exams/${examId}/evaluate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('mri_token')}`,
          },
        });
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Failed to load debriefing:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadResults();
  }, [examId]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-slate-800 rounded-xl p-8">
          <div className="animate-spin text-4xl">⟳</div>
          <p className="text-white mt-4">Generando debriefing...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { score, quality, heatmap, recommendations, checks } = data;

  const getScoreColor = (value: number) => {
    if (value >= 90) return 'text-green-400';
    if (value >= 75) return 'text-yellow-400';
    if (value >= 60) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBg = (value: number) => {
    if (value >= 90) return 'bg-green-500/20 border-green-500/50';
    if (value >= 75) return 'bg-yellow-500/20 border-yellow-500/50';
    if (value >= 60) return 'bg-orange-500/20 border-orange-500/50';
    return 'bg-red-500/20 border-red-500/50';
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      default: return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const getErrorSeverityColor = (severity: number) => {
    if (severity >= 0.7) return 'bg-red-500';
    if (severity >= 0.4) return 'bg-orange-500';
    return 'bg-yellow-500';
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-yellow-400" />
            <h2 className="text-xl font-bold text-white">Debriefing del Examen</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="flex border-b border-slate-700">
          {(['score', 'heatmap', 'recommendations'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === tab
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab === 'score' ? 'Puntuación' : tab === 'heatmap' ? 'Heatmap' : 'Recomendaciones'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'score' && (
            <div className="space-y-6">
              <div className={`p-6 rounded-xl border-2 ${getScoreBg(score.total)}`}>
                <div className="text-center">
                  <p className="text-slate-300 mb-2">Puntuación Total</p>
                  <p className={`text-6xl font-bold ${getScoreColor(score.total)}`}>
                    {Math.round(score.total)}%
                  </p>
                  {score.total >= 90 && <Star className="w-12 h-12 text-yellow-400 mx-auto mt-2" />}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-1">Planificación (30%)</p>
                  <p className={`text-2xl font-bold ${getScoreColor(score.planificacion)}`}>
                    {Math.round(score.planificacion)}%
                  </p>
                  <div className="h-2 bg-slate-700 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full ${getScoreBg(score.planificacion).split(' ')[0]}`}
                      style={{ width: `${score.planificacion}%` }}
                    />
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-1">Centraje (30%)</p>
                  <p className={`text-2xl font-bold ${getScoreColor(score.centraje)}`}>
                    {Math.round(score.centraje)}%
                  </p>
                  <div className="h-2 bg-slate-700 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full ${getScoreBg(score.centraje).split(' ')[0]}`}
                      style={{ width: `${score.centraje}%` }}
                    />
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-1">Contraste (40%)</p>
                  <p className={`text-2xl font-bold ${getScoreColor(score.contraste)}`}>
                    {Math.round(score.contraste)}%
                  </p>
                  <div className="h-2 bg-slate-700 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full ${getScoreBg(score.contraste).split(' ')[0]}`}
                      style={{ width: `${score.contraste}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="bg-slate-900/50 rounded-lg p-4 text-center">
                  <p className="text-slate-400 text-sm">SNR</p>
                  <p className="text-xl font-bold text-blue-400">{quality.snr.toFixed(1)}</p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4 text-center">
                  <p className="text-slate-400 text-sm">Contraste</p>
                  <p className="text-xl font-bold text-purple-400">{quality.contraste.toFixed(1)}</p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4 text-center">
                  <p className="text-slate-400 text-sm">Ruido</p>
                  <p className="text-xl font-bold text-orange-400">{quality.ruido.toFixed(1)}</p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4 text-center">
                  <p className="text-slate-400 text-sm">Artefactos</p>
                  <p className="text-xl font-bold text-red-400">{quality.artifacts.toFixed(1)}</p>
                </div>
              </div>

              <div className="bg-slate-900/50 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3">Detalle de Parámetros</h4>
                <div className="space-y-2">
                  {checks.slice(0, 9).map((check, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      {check.status === 'ok' ? (
                        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${check.status === 'error' ? 'text-red-400' : 'text-yellow-400'}`} />
                      )}
                      <span className="text-slate-300 w-24">{check.param}</span>
                      <span className="text-slate-500">=</span>
                      <span className="text-white font-mono">{String(check.value)}</span>
                      <span className="text-slate-500">({check.expected})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'heatmap' && (
            <div className="space-y-4">
              <p className="text-slate-300">
                El heatmap muestra las zonas con errores de planificación. El color indica la severidad:
              </p>

              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded" />
                  <span className="text-slate-400">Alta ({'>'}70%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-500 rounded" />
                  <span className="text-slate-400">Media (40-70%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded" />
                  <span className="text-slate-400">Baja ({'<'}40%)</span>
                </div>
              </div>

              <div className="bg-slate-900/50 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3">Errores Detectados</h4>
                {heatmap.errors.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />
                    <p className="text-slate-300">¡Sin errores de planificación!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {heatmap.errors.map((error: ErrorPoint, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-slate-800 rounded-lg">
                        <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${getErrorSeverityColor(error.severity)}`} />
                        <div className="flex-1">
                          <p className="text-white">{error.description}</p>
                          <p className="text-slate-500 text-sm mt-1">
                            Tipo: {error.type} • Severidad: {(error.severity * 100).toFixed(0)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-slate-900/50 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3">Visualización del FOV</h4>
                <div className="aspect-video bg-slate-800 rounded-lg flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 opacity-20">
                    <div className="w-full h-full" style={{
                      backgroundImage: 'radial-gradient(circle, #334155 1px, transparent 1px)',
                      backgroundSize: '20px 20px'
                    }} />
                  </div>
                  <div className="relative w-48 h-48 border-2 border-yellow-500 rounded-lg flex items-center justify-center">
                    <div className="text-yellow-400 text-sm font-medium">FOV</div>
                    {heatmap.errors.map((error: ErrorPoint, i: number) =>
                      error.position ? (
                        <div
                          key={i}
                          className={`absolute w-6 h-6 ${getErrorSeverityColor(error.severity)} rounded-full opacity-60`}
                          style={{
                            left: `${error.position.x * 100}%`,
                            top: `${error.position.y * 100}%`,
                          }}
                        />
                      ) : null
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'recommendations' && (
            <div className="space-y-4">
              <p className="text-slate-300">
                Recomendaciones basadas en los errores detectados para mejorar la calidad de imagen.
              </p>

              {recommendations.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />
                  <p className="text-slate-300">¡No hay recomendaciones!</p>
                  <p className="text-slate-500 text-sm">La planificación es óptima</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-3 p-4 rounded-lg border ${
                        rec.level === 'error'
                          ? 'bg-red-500/10 border-red-500/30'
                          : rec.level === 'warning'
                          ? 'bg-yellow-500/10 border-yellow-500/30'
                          : 'bg-blue-500/10 border-blue-500/30'
                      }`}
                    >
                      {getLevelIcon(rec.level)}
                      <p className={`flex-1 ${rec.level === 'error' ? 'text-red-300' : rec.level === 'warning' ? 'text-yellow-300' : 'text-blue-300'}`}>
                        {rec.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 p-4 bg-slate-900/50 rounded-lg">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  Tips para mejorar
                </h4>
                <ul className="space-y-2 text-slate-300 text-sm">
                  <li>• Ajusta el TR y TE según el peso de contraste deseado</li>
                  <li>• Verifica que el FOV cubra completamente la región anatómica</li>
                  <li>• Usa FatSat en regiones con tejido adiposo para mejor contraste</li>
                  <li>• El isocenter debe estar posicionado en el centro de la ROI</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span>+{Math.round(score.total)} XP</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Cerrar
            </button>
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              Siguiente Examen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
