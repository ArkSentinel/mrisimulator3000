import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Clock, AlertTriangle, User, FileText, ArrowLeft } from 'lucide-react';
import { useExam } from '../../context/ExamContext';
import api from '../../services/api';
import type { Paciente } from '../../services/api';

interface Protocol {
  id: number;
  nombre: string;
}

export function SchedulerScreen() {
  const navigate = useNavigate();
  const { setExam } = useExam();
  const [patients, setPatients] = useState<Paciente[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Paciente | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    lastName: '',
    firstName: '',
    title: '',
    suffix: '',
    middleName: '',
    patientId: '',
    dob: '',
    age: '',
    sex: 'Masculino',
    
    admittingDiagnosis: '',
    medicalAlerts: '',
    allergies: '',
    
    institution: '',
    performingPhysician: '',
    referringPhysician: '',
    requestingPhysician: '',
    operator: '',
    
    procedure: '',
    accessionNr: '',
    reqProcId: '',
    studyDescription: '',
    studyComment: '',
    
    programPath: '',
    loadToQueue: false,
    rfTransmitMode: 'Cualquier Polarización',
    bodyPart: 'Cerebro',
    laterality: 'No Aplica',
    patientOrientation: 'Cabeza Primero - Supino',
    
    protocol: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [patientsData, protocolsData] = await Promise.all([
          api.getPatients(),
          api.getProtocols()
        ]);
        setPatients(patientsData);
        setProtocols(protocolsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredPatients = patients.filter(p => {
    const search = searchTerm.toLowerCase();
    return p.nombre.toLowerCase().includes(search) ||
           p.accession.toLowerCase().includes(search) ||
           p.fecha_nacimiento.includes(search);
  });

  const handlePatientSelect = (patient: Paciente) => {
    setSelectedPatient(patient);
    const birthYear = parseInt(patient.fecha_nacimiento.split('/')[2]);
    const age = new Date().getFullYear() - birthYear;
    setFormData(prev => ({
      ...prev,
      lastName: patient.nombre,
      patientId: String(patient.id),
      dob: patient.fecha_nacimiento,
      age: String(age),
      accessionNr: patient.accession,
      procedure: patient.procedure_type || ''
    }));
  };

  const handleStartExam = () => {
    if (formData.lastName && formData.patientId && formData.protocol) {
      const selectedProtocolObj = protocols.find(p => p.nombre === formData.protocol);
      const patientRecord: Record<string, unknown> = { ...formData };
      setExam({
        patient: patientRecord,
        protocolId: selectedProtocolObj?.id ?? null,
        protocolName: formData.protocol,
        sequences: [],
      });
      navigate('/console', {
        state: {
          patient: patientRecord,
          protocol: formData.protocol,
          protocolId: selectedProtocolObj?.id,
        }
      });
    }
  };

  const handleAutoFill = () => {
    setFormData({
      lastName: 'Test',
      firstName: 'Patient',
      title: 'Mr.',
      suffix: '',
      middleName: '',
      patientId: '99999',
      dob: '01/01/1990',
      age: '35',
      sex: 'Male',
      admittingDiagnosis: 'Chronic headache',
      medicalAlerts: 'None',
      allergies: 'None known',
      institution: 'University Hospital',
      performingPhysician: 'Dr. Smith',
      referringPhysician: 'Dr. Jones',
      requestingPhysician: 'Dr. Jones',
      operator: 'Tech001',
      procedure: '1',
      accessionNr: 'ACC123456',
      reqProcId: 'REQ001',
      studyDescription: 'MRI Brain with contrast',
      studyComment: 'Standard protocol',
      programPath: 'USER » Brain » Standard',
      loadToQueue: true,
      rfTransmitMode: 'Any Polarization',
      bodyPart: 'Brain',
      laterality: 'Unpaired',
      patientOrientation: 'Head First - Supine',
      protocol: protocols[0]?.nombre || ''
    });
  };

  const inputClass = "w-full h-6 bg-[#232323] border border-slate-700 px-2 text-xs text-white focus:outline-none focus:border-orange-500";
  const selectClass = "w-full h-6 bg-[#232323] border border-slate-700 px-2 text-xs text-white focus:outline-none";

  if (loading) {
    return (
      <div className="flex h-screen bg-black text-gray-300 items-center justify-center">
        Cargando...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-black text-gray-300 pt-10">
      {/* HEADER */}
      <div className="absolute top-0 left-0 right-0 h-10 bg-[#1a1a1a] border-b border-slate-700 flex items-center justify-between px-4 z-10">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>
        <span className="text-xs font-bold text-orange-500">Scheduler</span>
        <div className="w-16" />
      </div>

      {/* LEFT COLUMN - Patient List */}
      <div className="w-1/4 border-r border-slate-700 flex flex-col">
        <div className="p-3 bg-[#1a1a1a] border-b border-slate-700">
          <h2 className="text-xs font-bold text-gray-500 uppercase mb-2">Pacientes</h2>
          <div className="relative">
            <Search className="absolute left-2 top-1 w-3 h-3 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-6 bg-[#232323] border border-slate-700 pl-7 pr-2 text-xs text-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#1a1a1a] sticky top-0">
              <tr className="text-left text-gray-500">
                <th className="p-2 font-medium"></th>
                <th className="p-2 font-medium">Paciente</th>
                <th className="p-2 font-medium">F. Nac.</th>
                <th className="p-2 font-medium">Hora</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map((patient) => (
                <tr
                  key={patient.id}
                  onClick={() => handlePatientSelect(patient)}
                  className={`border-b border-slate-800 cursor-pointer transition-colors ${
                    selectedPatient?.id === patient.id 
                      ? 'bg-emerald-900/50' 
                      : 'hover:bg-[#252525]'
                  }`}
                >
                  <td className="p-2">
                    <Clock className="w-3 h-3 text-yellow-500" />
                  </td>
                  <td className="p-2">
                    <div className="font-medium">{patient.nombre}</div>
                    <div className="text-gray-500 text-[10px]">ID: {patient.id}</div>
                  </td>
                  <td className="p-2 text-gray-400">{patient.fecha_nacimiento}</td>
                  <td className="p-2 font-mono text-gray-500">{patient.hora}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CENTER COLUMN - Patient Registration */}
      <div className="w-2/4 border-r border-slate-700 flex flex-col overflow-auto">
        <div className="p-3 bg-[#1a1a1a] border-b border-slate-700">
          <h2 className="text-xs font-bold text-gray-500 uppercase">Registro de Paciente</h2>
        </div>

        <div className="p-4 space-y-4">
          {/* Demographics */}
          <div>
            <div className="text-[10px] text-orange-500 uppercase mb-2 flex items-center gap-1">
              <User className="w-3 h-3" /> Datos Demográficos *
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex items-center gap-1">
                <label className="text-xs text-gray-400 w-12">Título</label>
                <select 
                  value={formData.title} 
                  onChange={(e) => setFormData(prev => ({...prev, title: e.target.value}))}
                  className={selectClass}
                >
                  <option value="">-</option>
                  <option value="Sr.">Sr.</option>
                  <option value="Sra.">Sra.</option>
                  <option value="Srta.">Srta.</option>
                  <option value="Dr.">Dr.</option>
                </select>
              </div>
              <div className="flex items-center gap-1">
                <label className="text-xs text-gray-400 w-12">Sufijo</label>
                <input type="text" value={formData.suffix} onChange={(e) => setFormData(prev => ({...prev, suffix: e.target.value}))} className={inputClass} />
              </div>
              <div></div>
              
              <div className="flex items-center gap-1 col-span-2">
                <label className="text-xs text-gray-400 w-12">Apellido *</label>
                <input type="text" value={formData.lastName} onChange={(e) => setFormData(prev => ({...prev, lastName: e.target.value}))} className={inputClass} />
              </div>
              <div className="flex items-center gap-1">
                <label className="text-xs text-gray-400 w-12">Nombre</label>
                <input type="text" value={formData.firstName} onChange={(e) => setFormData(prev => ({...prev, firstName: e.target.value}))} className={inputClass} />
              </div>

              <div className="flex items-center gap-1 col-span-2">
                <label className="text-xs text-gray-400 w-12">2do Nombre</label>
                <input type="text" value={formData.middleName} onChange={(e) => setFormData(prev => ({...prev, middleName: e.target.value}))} className={inputClass} />
              </div>
              <div></div>

              <div className="flex items-center gap-1 col-span-2">
                <label className="text-xs text-gray-400 w-12">ID Paciente *</label>
                <input type="text" value={formData.patientId} onChange={(e) => setFormData(prev => ({...prev, patientId: e.target.value}))} className={inputClass} />
              </div>
              <div className="flex items-center gap-1">
                <label className="text-xs text-gray-400 w-12">Sexo</label>
                <select value={formData.sex} onChange={(e) => setFormData(prev => ({...prev, sex: e.target.value}))} className={selectClass}>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div className="flex items-center gap-1 col-span-2">
                <label className="text-xs text-gray-400 w-12">F. Nacimiento *</label>
                <input type="text" placeholder="dd/mm/yyyy" value={formData.dob} onChange={(e) => setFormData(prev => ({...prev, dob: e.target.value}))} className={inputClass} />
              </div>
              <div className="flex items-center gap-1">
                <label className="text-xs text-gray-400 w-12">Edad</label>
                <input type="text" value={formData.age} readOnly className="w-full h-6 bg-[#1a1a1a] border border-slate-700 px-2 text-xs text-gray-400" />
              </div>
            </div>
          </div>

          {/* Medical Information */}
          <div>
            <div className="text-[10px] text-orange-500 uppercase mb-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Información Médica
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400 w-24">Diagnóstico</label>
                <input type="text" value={formData.admittingDiagnosis} onChange={(e) => setFormData(prev => ({...prev, admittingDiagnosis: e.target.value}))} className={inputClass} />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400 w-24">Alertas Médicas</label>
                <input type="text" value={formData.medicalAlerts} onChange={(e) => setFormData(prev => ({...prev, medicalAlerts: e.target.value}))} className={inputClass} />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400 w-24">Alergias</label>
                <input type="text" value={formData.allergies} onChange={(e) => setFormData(prev => ({...prev, allergies: e.target.value}))} className={inputClass} />
              </div>
            </div>
          </div>

          {/* Institution & Staff */}
          <div>
            <div className="text-[10px] text-orange-500 uppercase mb-2">Institución y Personal</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1">
                <label className="text-xs text-gray-400 w-20">Institución</label>
                <input type="text" value={formData.institution} onChange={(e) => setFormData(prev => ({...prev, institution: e.target.value}))} className={inputClass} />
              </div>
              <div className="flex items-center gap-1">
                <label className="text-xs text-gray-400 w-20">Méd. Ejecuta</label>
                <input type="text" value={formData.performingPhysician} onChange={(e) => setFormData(prev => ({...prev, performingPhysician: e.target.value}))} className={inputClass} />
              </div>
              <div className="flex items-center gap-1">
                <label className="text-xs text-gray-400 w-20">Méd. Deriva</label>
                <input type="text" value={formData.referringPhysician} onChange={(e) => setFormData(prev => ({...prev, referringPhysician: e.target.value}))} className={inputClass} />
              </div>
              <div className="flex items-center gap-1">
                <label className="text-xs text-gray-400 w-20">Méd. Solicita</label>
                <input type="text" value={formData.requestingPhysician} onChange={(e) => setFormData(prev => ({...prev, requestingPhysician: e.target.value}))} className={inputClass} />
              </div>
              <div className="flex items-center gap-1 col-span-2">
                <label className="text-xs text-gray-400 w-20">Operador</label>
                <input type="text" value={formData.operator} onChange={(e) => setFormData(prev => ({...prev, operator: e.target.value}))} className={inputClass} />
              </div>
            </div>
          </div>

          {/* Examination Info */}
          <div>
            <div className="text-[10px] text-orange-500 uppercase mb-2 flex items-center gap-1">
              <FileText className="w-3 h-3" /> Información del Examen
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1">
                <label className="text-xs text-gray-400 w-20">Procedimiento</label>
                <input type="text" value={formData.procedure} onChange={(e) => setFormData(prev => ({...prev, procedure: e.target.value}))} className={inputClass} />
              </div>
              <div className="flex items-center gap-1">
                <label className="text-xs text-gray-400 w-20">Nro. Acceso</label>
                <input type="text" value={formData.accessionNr} onChange={(e) => setFormData(prev => ({...prev, accessionNr: e.target.value}))} className={inputClass} />
              </div>
              <div className="flex items-center gap-1">
                <label className="text-xs text-gray-400 w-20">ID Proc. Sol.</label>
                <input type="text" value={formData.reqProcId} onChange={(e) => setFormData(prev => ({...prev, reqProcId: e.target.value}))} className={inputClass} />
              </div>
              <div className="flex items-center gap-1">
                <label className="text-xs text-gray-400 w-20">Desc. Estudio</label>
                <input type="text" value={formData.studyDescription} onChange={(e) => setFormData(prev => ({...prev, studyDescription: e.target.value}))} className={inputClass} />
              </div>
              <div className="col-span-2 flex items-center gap-1">
                <label className="text-xs text-gray-400 w-20">Comentario</label>
                <input type="text" value={formData.studyComment} onChange={(e) => setFormData(prev => ({...prev, studyComment: e.target.value}))} className={inputClass} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN - Exam Config */}
      <div className="w-1/4 flex flex-col overflow-auto">
        <div className="p-3 bg-[#1a1a1a] border-b border-slate-700">
          <h2 className="text-xs font-bold text-gray-500 uppercase">Configuración del Examen</h2>
        </div>

        <div className="p-4 space-y-4">
          {/* Program Selection */}
          <div>
            <div className="text-[10px] text-orange-500 uppercase mb-2">Selección de Programa</div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400 w-24">Ruta del Prog.</label>
                <input type="text" value={formData.programPath} onChange={(e) => setFormData(prev => ({...prev, programPath: e.target.value}))} className={inputClass} />
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={formData.loadToQueue}
                  onChange={(e) => setFormData(prev => ({...prev, loadToQueue: e.target.checked}))}
                  className="w-3 h-3"
                />
                <label className="text-xs text-gray-400">Cargar Prog. a Cola</label>
              </div>
            </div>
          </div>

          {/* RF Transmit Mode */}
          <div>
            <div className="text-[10px] text-orange-500 uppercase mb-2">Modo de Transmisión RF</div>
            <select 
              value={formData.rfTransmitMode}
              onChange={(e) => setFormData(prev => ({...prev, rfTransmitMode: e.target.value}))}
              className={selectClass}
            >
              <option value="Cualquier Polarización">Cualquier Polarización</option>
              <option value="Circular">Circular</option>
              <option value="Lineal">Lineal</option>
            </select>
          </div>

          {/* Body Part & Laterality */}
          <div>
            <div className="text-[10px] text-orange-500 uppercase mb-2">Parte del Cuerpo y Lateralidad</div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400 w-20">Parte Cuerpo</label>
                <select 
                  value={formData.bodyPart}
                  onChange={(e) => setFormData(prev => ({...prev, bodyPart: e.target.value}))}
                  className={selectClass}
                >
                  <option value="Cerebro">Cerebro</option>
                  <option value="Columna">Columna</option>
                  <option value="Rodilla">Rodilla</option>
                  <option value="Hombro">Hombro</option>
                  <option value="Cadera">Cadera</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400 w-20">Lateralidad</label>
                <select 
                  value={formData.laterality}
                  onChange={(e) => setFormData(prev => ({...prev, laterality: e.target.value}))}
                  className={selectClass}
                >
                  <option value="No Aplica">No Aplica</option>
                  <option value="Izquierdo">Izquierdo</option>
                  <option value="Derecho">Derecho</option>
                  <option value="Bilateral">Bilateral</option>
                </select>
              </div>
            </div>
          </div>

          {/* Patient Orientation */}
          <div>
            <div className="text-[10px] text-orange-500 uppercase mb-2">Orientación del Paciente</div>
            <select 
              value={formData.patientOrientation}
              onChange={(e) => setFormData(prev => ({...prev, patientOrientation: e.target.value}))}
              className={selectClass}
            >
              <option value="Cabeza Primero - Supino">Cabeza Primero - Supino</option>
              <option value="Cabeza Primero - Prono">Cabeza Primero - Prono</option>
              <option value="Pies Primero - Supino">Pies Primero - Supino</option>
              <option value="Pies Primero - Prono">Pies Primero - Prono</option>
            </select>
          </div>

          {/* Protocol Selection */}
          <div>
            <div className="text-[10px] text-orange-500 uppercase mb-2">Protocol</div>
            <select 
              value={formData.protocol}
              onChange={(e) => setFormData(prev => ({...prev, protocol: e.target.value}))}
              className={selectClass}
            >
              <option value="">Seleccionar Protocolo...</option>
              {protocols.map((protocol) => (
                <option key={protocol.id} value={protocol.nombre}>
                  {protocol.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-auto p-4 border-t border-slate-700 flex flex-col gap-2">
          <div className="flex gap-2">
            <button className="flex-1 py-2 text-xs bg-gray-700 hover:bg-gray-600 rounded">Guardar</button>
            <button className="flex-1 py-2 text-xs bg-gray-700 hover:bg-gray-600 rounded">Cancelar</button>
            <button className="flex-1 py-2 text-xs bg-gray-700 hover:bg-gray-600 rounded">Eliminar</button>
          </div>
          <button className="w-full py-2 text-xs bg-gray-700 hover:bg-gray-600 rounded">Estudios Previos</button>
          <button
            onClick={handleAutoFill}
            className="w-full py-2 text-xs bg-gray-700 hover:bg-gray-600 rounded"
          >
            Auto-completar
          </button>
          <button
            onClick={handleStartExam}
            disabled={!formData.lastName || !formData.patientId || !formData.protocol}
            className={`w-full py-3 text-sm font-bold rounded transition-colors ${
              formData.lastName && formData.patientId && formData.protocol
                ? 'bg-orange-600 hover:bg-orange-500 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            Iniciar Examen
          </button>
        </div>
      </div>
    </div>
  );
}