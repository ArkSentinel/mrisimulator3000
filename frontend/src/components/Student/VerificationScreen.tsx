import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface HardwareCheck {
  label: string;
  status: 'pending' | 'pass' | 'warn' | 'fail';
  value: string;
}

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
}

const QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: '¿Cuál es el rango típico de TR (Tiempo de Repetición) para obtener imágenes con ponderación T1?',
    options: ['100-500 ms', '2000-8000 ms', '100-200 ms', '5000-10000 ms'],
    correctIndex: 0,
  },
  {
    id: 2,
    question: '¿Qué controla el parámetro TE (Tiempo de Eco) en una secuencia MRI?',
    options: [
      'El contraste entre tejidos',
      'El tiempo entre la excitación y la adquisición de la señal',
      'La resolución espacial',
      'La velocidad de adquisición'
    ],
    correctIndex: 1,
  },
  {
    id: 3,
    question: '¿Qué tipo de contraste es característico de las imágenes T2 ponderadas?',
    options: [
      'Líquidos oscuros y tejidos blandos claros',
      'Líquidos brillantes y tejidos blandos oscuros',
      'Tejido óseo brillante',
      'Tejido graso oscuro'
    ],
    correctIndex: 1,
  },
];

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
  </svg>
);

const WarnIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const XIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const HardwareIcon = () => (
  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
  </svg>
);

const QuizIcon = () => (
  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);

const PatientIcon = () => (
  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const antennaOptions = [
  { value: 'head', label: 'Head Coil' },
  { value: 'body', label: 'Body Array' },
  { value: 'spine', label: 'Spine Array' },
  { value: 'cardiac', label: 'Cardiac Coil' },
];

export function VerificationScreen() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [hardwareChecks, setHardwareChecks] = useState<HardwareCheck[]>([]);
  const [canContinue, setCanContinue] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [selectedAntenna, setSelectedAntenna] = useState<string>('');
  const [antennaError, setAntennaError] = useState(false);

  useEffect(() => {
    if (currentStep === 1) {
      runHardwareChecks();
    }
  }, [currentStep]);

  useEffect(() => {
    if (currentStep === 2 && quizScore === null) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleQuestionTimeout();
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [currentStep, currentQuestion, quizScore]);

  const runHardwareChecks = async () => {
    const checks: HardwareCheck[] = [];

    const resolution = { width: window.screen.width, height: window.screen.height };
    checks.push({
      label: 'Resolución de pantalla',
      status: resolution.width >= 1024 && resolution.height >= 768 ? 'pass' : 'warn',
      value: `${resolution.width}x${resolution.height}`,
    });

    const pointerType = window.matchMedia('(pointer: fine)').matches ? 'mouse' : 'touch';
    checks.push({
      label: 'Tipo de puntero',
      status: 'pass',
      value: pointerType,
    });

    let webglSupport = false;
    try {
      const canvas = document.createElement('canvas');
      webglSupport = !!canvas.getContext('webgl') || !!canvas.getContext('experimental-webgl');
    } catch {
      webglSupport = false;
    }
    checks.push({
      label: 'Soporte WebGL',
      status: webglSupport ? 'pass' : 'fail',
      value: webglSupport ? 'Disponible' : 'No disponible',
    });

    const memory = (navigator as { deviceMemory?: number }).deviceMemory;
    checks.push({
      label: 'Memoria del dispositivo',
      status: memory && memory >= 4 ? 'pass' : memory ? 'warn' : 'pending',
      value: memory ? `${memory} GB` : 'No disponible',
    });

    setHardwareChecks(checks);

    setTimeout(() => setCanContinue(true), 3000);
  };

  const handleQuestionTimeout = () => {
    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      finishQuiz();
    }
  };

  const handleAnswerSelect = (answerIndex: number) => {
    const newAnswers = [...quizAnswers];
    newAnswers[currentQuestion] = answerIndex;
    setQuizAnswers(newAnswers);

    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      setTimeLeft(30);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = () => {
    let correct = 0;
    quizAnswers.forEach((answer, index) => {
      if (answer === QUESTIONS[index].correctIndex) {
        correct++;
      }
    });
    const score = Math.round((correct / QUESTIONS.length) * 100);
    setQuizScore(score);
  };

  const resetQuiz = () => {
    setQuizAnswers([]);
    setCurrentQuestion(0);
    setTimeLeft(30);
    setQuizScore(null);
    setCanContinue(false);
  };

  const handleStep1Continue = () => {
    if (canContinue) {
      setCurrentStep(2);
      setCanContinue(false);
    }
  };

  const handleStep2Continue = () => {
    if (quizScore !== null && quizScore >= 70) {
      setCurrentStep(3);
    }
  };

  const handleStep3Continue = () => {
    if (selectedAntenna === 'body') {
      localStorage.setItem('verification_completed', 'true');
      localStorage.setItem('verification_timestamp', new Date().toISOString());
      navigate('/panel');
    } else {
      setAntennaError(true);
    }
  };

  const getStepStatus = (step: number) => {
    if (step < currentStep) return 'completed';
    if (step === currentStep) return 'active';
    return 'pending';
  };

  const renderStepIndicator = () => {
    const steps = ['Hardware', 'Teórico', 'Paciente'];
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {steps.map((step, index) => {
            const stepNum = index + 1;
            const status = getStepStatus(stepNum);
            return (
              <div key={stepNum} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      status === 'completed'
                        ? 'bg-orange-500 text-white'
                        : status === 'active'
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {status === 'completed' ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      stepNum
                    )}
                  </div>
                  <span className={`text-xs mt-1 ${status === 'pending' ? 'text-gray-500' : 'text-gray-300'}`}>
                    {step}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-16 h-1 mx-2 rounded ${
                      status === 'completed' ? 'bg-orange-500' : 'bg-gray-700'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2 mt-4">
          <div
            className="bg-orange-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
          />
        </div>
      </div>
    );
  };

  const renderHardwareStep = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="text-orange-500">
          <HardwareIcon />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Verificación de Hardware</h2>
          <p className="text-gray-400 text-sm">Comprobando compatibilidad del navegador</p>
        </div>
      </div>

      <div className="space-y-3">
        {hardwareChecks.map((check, index) => (
          <div
            key={index}
            className={`flex items-center justify-between p-4 rounded-lg border ${
              check.status === 'pass'
                ? 'bg-green-900/20 border-green-700'
                : check.status === 'warn'
                ? 'bg-yellow-900/20 border-yellow-700'
                : check.status === 'fail'
                ? 'bg-red-900/20 border-red-700'
                : 'bg-gray-800 border-gray-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={
                  check.status === 'pass'
                    ? 'text-green-500'
                    : check.status === 'warn'
                    ? 'text-yellow-500'
                    : check.status === 'fail'
                    ? 'text-red-500'
                    : 'text-gray-400'
                }
              >
                {check.status === 'pass' ? (
                  <CheckIcon />
                ) : check.status === 'warn' ? (
                  <WarnIcon />
                ) : check.status === 'fail' ? (
                  <XIcon />
                ) : (
                  <div className="w-5 h-5" />
                )}
              </span>
              <span className="text-gray-200">{check.label}</span>
            </div>
            <span className="text-gray-400 text-sm">{check.value}</span>
          </div>
        ))}
      </div>

      <button
        onClick={handleStep1Continue}
        disabled={!canContinue}
        className={`w-full py-3 rounded-lg font-medium transition-all ${
          canContinue
            ? 'bg-orange-600 hover:bg-orange-700 text-white cursor-pointer'
            : 'bg-gray-700 text-gray-400 cursor-not-allowed'
        }`}
      >
        {!canContinue ? 'Verificando...' : 'Continuar'}
      </button>
    </div>
  );

  const renderQuizStep = () => {
    if (quizScore !== null) {
      const passed = quizScore >= 70;
      return (
        <div className="space-y-6 text-center">
          <div className={`text-6xl font-bold ${passed ? 'text-green-500' : 'text-red-500'}`}>
            {quizScore}%
          </div>
          <p className={`text-xl ${passed ? 'text-green-400' : 'text-red-400'}`}>
            {passed ? '¡Aprobado!' : 'No aprobado'}
          </p>
          <p className="text-gray-400">
            {passed
              ? 'Has superado el examen teórico.'
              : 'Necesitas al menos 70% para continuar.'}
          </p>
          {!passed && (
            <button
              onClick={resetQuiz}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium"
            >
              Reintentar
            </button>
          )}
          {passed && (
            <button
              onClick={handleStep2Continue}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium"
            >
              Continuar
            </button>
          )}
        </div>
      );
    }

    const question = QUESTIONS[currentQuestion];
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="text-orange-500">
            <QuizIcon />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Pre-Test Teórico</h2>
            <p className="text-gray-400 text-sm">
              Pregunta {currentQuestion + 1} de {QUESTIONS.length}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Tiempo restante</span>
            <span className={timeLeft <= 10 ? 'text-red-500' : ''}>{timeLeft}s</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                timeLeft <= 10 ? 'bg-red-500' : 'bg-orange-500'
              }`}
              style={{ width: `${(timeLeft / 30) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <p className="text-lg text-white mb-6">{question.question}</p>
          <div className="space-y-3">
            {question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                className={`w-full p-4 rounded-lg text-left transition-all ${
                  quizAnswers[currentQuestion] === index
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderPatientStep = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="text-orange-500">
          <PatientIcon />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Configuración del Paciente</h2>
          <p className="text-gray-400 text-sm">Seleccione la antena adecuada</p>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6 space-y-4">
        <div className="border-b border-gray-700 pb-4">
          <p className="text-gray-400 text-sm">Paciente</p>
          <p className="text-white font-medium">Juan García, 65 años</p>
        </div>
        <div className="border-b border-gray-700 pb-4">
          <p className="text-gray-400 text-sm">Sospecha clínica</p>
          <p className="text-white font-medium">ACV hiperagudo</p>
        </div>
        <div>
          <p className="text-gray-400 text-sm">Orden</p>
          <p className="text-white font-medium">Evaluar simetría estructural</p>
        </div>
      </div>

      <div>
        <label className="block text-gray-300 mb-2">Seleccionar antena</label>
        <select
          value={selectedAntenna}
          onChange={(e) => {
            setSelectedAntenna(e.target.value);
            setAntennaError(false);
          }}
          className={`w-full p-3 bg-gray-800 border rounded-lg text-white ${
            antennaError ? 'border-red-500' : 'border-gray-700'
          }`}
        >
          <option value="">Seleccione una antena...</option>
          {antennaOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {antennaError && (
          <p className="text-red-400 text-sm mt-2">
            Antena incorrecta. Seleccione la antena adecuada para esta región.
          </p>
        )}
      </div>

      <button
        onClick={handleStep3Continue}
        disabled={!selectedAntenna}
        className={`w-full py-3 rounded-lg font-medium transition-all ${
          selectedAntenna
            ? 'bg-orange-600 hover:bg-orange-700 text-white cursor-pointer'
            : 'bg-gray-700 text-gray-400 cursor-not-allowed'
        }`}
      >
        Confirmar y Continuar
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="bg-[#2a2a2a] rounded-2xl p-6 shadow-2xl">
          {renderStepIndicator()}
          <div className="min-h-[400px]">
            {currentStep === 1 && renderHardwareStep()}
            {currentStep === 2 && renderQuizStep()}
            {currentStep === 3 && renderPatientStep()}
          </div>
        </div>
      </div>
    </div>
  );
}
