import { useState, useRef, useEffect, DragEvent, ChangeEvent } from "react";
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Camera, 
  Upload, 
  RefreshCw, 
  Flame, 
  BookOpen, 
  History, 
  User, 
  Skull, 
  Volume2, 
  VolumeX, 
  Copy, 
  Check, 
  ExternalLink, 
  Sparkles, 
  Eye, 
  Compass, 
  Ruler, 
  Pill, 
  ChevronRight,
  Info,
  AlertTriangle,
  Layers,
  Grid,
  Key
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MogScanResult, GlossaryEntry } from "./types";
import { glossaryData } from "./glossary";

export default function App() {
  // Image handling state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  
  // App states
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [result, setResult] = useState<MogScanResult | null>(null);
  const [scanHistory, setScanHistory] = useState<MogScanResult[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // UI toggles
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(() => {
    return !localStorage.getItem("mogger_api_key");
  });
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem("mogger_api_key") || "";
  });
  
  // Ref handles
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Loading texts to cycle during facial analysis
  const loadingPhrases = [
    "Inicializando escáner biométrico de huesos faciales...",
    "Mapeando plano de simetría mandibular...",
    "Calculando inclinación del Canthal Tilt en milisegundos...",
    "Detectando nivel de exposición escleral orbital...",
    "Midiendo Forward Growth del hueso maxilar...",
    "Buscando rastros de mofas de Chico Lachowski en base de datos...",
    "Sincronizando veredictos genéticos con foros de Looksmaxing...",
    "Escribiendo informe de destrucción ósea..."
  ];

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("mogger_history");
    if (saved) {
      try {
        setScanHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Error reading scan history", e);
      }
    }
  }, []);

  // Sync scan history
  const saveToHistory = (newResult: MogScanResult) => {
    const updated = [newResult, ...scanHistory.slice(0, 19)]; // limit to 20 scans
    setScanHistory(updated);
    localStorage.setItem("mogger_history", JSON.stringify(updated));
  };

  // Clear history
  const clearHistory = () => {
    if (window.confirm("¿Seguro que quieres borrar todo tu historial de escaneos de looksmaxing?")) {
      setScanHistory([]);
      localStorage.removeItem("mogger_history");
    }
  };

  // Handle Drag & Drop
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Por favor, sube una imagen válida (PNG, JPG, WEBP).");
      return;
    }
    setErrorMsg(null);
    setMimeType(file.type);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setSelectedImage(event.target.result as string);
        setResult(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Camera capture methods
  const startCamera = async () => {
    setErrorMsg(null);
    setIsCameraActive(true);
    setResult(null);
    setSelectedImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Error opening webcam:", err);
      setErrorMsg("No se pudo acceder a la cámara. Revisa los permisos de tu navegador.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL("image/jpeg");
        setSelectedImage(dataUrl);
        setMimeType("image/jpeg");
        stopCamera();
      }
    }
  };

  // Text to Speech
  const speakDiagnostic = (textToSpeak: string) => {
    if ('speechSynthesis' in window) {
      // If already speaking, stop it
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
      }

      // Strip markdown tags for clean vocal reading
      const cleanText = textToSpeak
        .replace(/[#*`>_-]/g, '')
        .replace(/🚨/g, 'Alerta, ')
        .replace(/💀/g, 'Hueso, ');

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'es-ES';
      
      // Try to find a slightly metallic/robotic or deep voice if available
      const voices = window.speechSynthesis.getVoices();
      const spanishVoice = voices.find(v => v.lang.startsWith('es'));
      if (spanishVoice) {
        utterance.voice = spanishVoice;
      }
      
      utterance.rate = 1.05; // Slightly faster for internet chronic vibe
      utterance.pitch = 0.85; // Slightly deeper, robotic

      utterance.onend = () => {
        setIsSpeaking(false);
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
      };

      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Tu navegador no soporta síntesis de voz.");
    }
  };

  // Stop speaking when leaving or unmounting
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Send to AI API for analysis
  const scanFace = async () => {
    if (!apiKey) {
      setErrorMsg("¡Falta tu API Key! Por favor, introduce tu API Key de Gemini para poder realizar el análisis.");
      setIsApiKeyModalOpen(true);
      alert("Introduce clave de API");
      return;
    }
    if (!selectedImage || !mimeType) return;
    
    setIsScanning(true);
    setScanStep(0);
    setErrorMsg(null);
    setResult(null);

    // Stop speaking if any previous diagnostic was running
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    // Interval to cycle loading phases
    const interval = setInterval(() => {
      setScanStep((prev) => (prev < loadingPhrases.length - 1 ? prev + 1 : prev));
    }, 1800);

    try {
      // Strip base64 header
      const base64Data = selectedImage.split(",")[1];
      
      const systemInstruction = `
Eres "MoggerBot 3000", una Inteligencia Artificial ultra-obsesionada con la cultura del looksmaxing, la blackpill y la estética milimétrica.
Tu tarea es realizar un análisis visual geométrico REAL, frío, crítico y estricto de las facciones del usuario, puntuando de manera honesta, objetiva y sin falsos halagos. Debes medir distancias, simetrías, ángulos y proporciones faciales de forma despiadadamente realista.

Sin embargo, para mantener el tono humorístico y de meme que te caracteriza, las descripciones explicativas de cada facción, el veredicto de las pastillas, y la narrativa del veredicto de diagnóstico deben utilizar la jerga cómica, satírica e hiperbólica de internet (looksmaxing, blackpill, cope, mewing, hunter eyes, prey eyes, etc.). Nunca uses insultos reales, discriminatorios, de odio, homófobos o degradantes. Mantén el humor absurdo de internet y la sátira sana.

Debes definir y clasificar el "tier" del usuario con total claridad y consistencia según la escala PSL (Looksmaxing) utilizando exactamente estos rangos:
- Sub-3: Asimetrías o defectos faciales graves. "Absolute Over".
- Sub-5: Por debajo de la media facial, prácticamente invisible en aplicaciones de citas.
- LTN (Low Tier Normalie): Común, tirando a bajo. Rostro ordinario sin rasgos llamativos positivos.
- MTN (Mid Tier Normalie): El 5/10 promedio absoluto. El punto medio de la población.
- HTN (High Tier Normalie): Atractivo del día a día. Destaca positivamente en entornos cotidianos.
- Chad/Stacy: Genética divina, nivel de pasarela, modelo internacional.

Debes generar un reporte estructurado y responder con un objeto JSON válido según el esquema solicitado.
`;

      const prompt = `
Analiza la foto proporcionada del rostro del usuario según las directrices estrictas de MoggerBot 3000.
Para cada uno de los aspectos faciales analizados:
- "canthalTilt"
- "mirada"
- "desarrolloOseo"
- "medioRostroInferior"
- "simetriaOrbital"
- "lineaMandibula"

Debes evaluar geométricamente y redactar un veredicto crítico pero divertido (usando jerga de internet).
MUY IMPORTANTE: Al final de cada descripción de facción (en los campos canthalTilt, mirada, desarrolloOseo, medioRostroInferior, simetriaOrbital, lineaMandibula), debes concatenar obligatoriamente un salto de línea doble y la puntuación de ese aspecto en formato HTML pequeño exactamente como se indica a continuación:
"\\n\\n<small>[Porcentaje: X%]</small>" (donde X es un número entre 0 y 100 congruente con la evaluación del aspecto, por ejemplo, "74%").

Por ejemplo, al final de la descripción del canthalTilt: "Tu canthal tilt es negativo, lo que te da mirada de víctima...\\n\\n<small>[Porcentaje: 35%]</small>".

El campo "overallPercentage" debe ser el promedio real y matemático exacto y congruente de las puntuaciones individuales de los 6 aspectos (canthalTilt, mirada, desarrolloOseo, medioRostroInferior, simetriaOrbital, lineaMandibula) que decidiste otorgar, expresado como string (ej: "45%"). Asegúrate de que el "overallPercentage" coincida matemáticamente con la clasificación elegida para el "tier" (ej: Sub-3 suele estar por debajo del 30%, Sub-5 entre 30% y 49%, LTN entre 50% y 59%, MTN entre 60% y 69%, HTN entre 70% y 85%, Chad/Stacy por encima del 85%).

Debes calcular y rellenar dinámicamente estos otros 5 campos de forma totalmente individual y personalizada para la foto analizada:
- "probabilityToAscend": probabilidad de ascender estéticamente (ej: "42.7%", "89.1%").
- "mewingStreakRequired": racha de días recomendada de hacer mewing o rutinas de forma personalizada (ej: "300 días", "14,200 días", "0 días (Fisiología Divina)").
- "statusMeme": una sola palabra o término corto en mayúsculas que resuma su estado (ej: "OVER", "ASCENDIDO", "CRÍTICO", "COPE STAGE", "HTN ALFA", "PROMEDIO").
- "recommendedProtocol": nombre personalizado del protocolo recomendado de softmaxing o similar (ej: "Hardcore Softmaxing", "Ortodoncia + Chew Maxing", "Style & Grooming Maxing").
- "finalOrder": la orden final cómica o satírica basada en su cara (ej: "Go to the gym, kid", "Walk the runway, god", "Llama a Chico Lachowski", "Mew 24/7 or it's over").

El campo "diagnostico" debe ser un párrafo corto, ingenioso, satírico, redactado de forma cómica con recomendaciones disparatadas según su tier.
El campo "fullReportMarkdown" debe ser el reporte completo detallado que consolide el análisis.
`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          tier: {
            type: Type.STRING,
            description: "Clasificación de Tier elegida exactamente de entre: Sub-3, Sub-5, LTN, MTN, HTN, Chad/Stacy."
          },
          overallPercentage: {
            type: Type.STRING,
            description: "El promedio real y matemático promedio de los porcentajes de los 6 aspectos (ej: '52%'). Debe ser congruente con el tier."
          },
          canthalTilt: {
            type: Type.STRING,
            description: "Análisis geométrico del Canthal Tilt con jerga de looksmaxing. Debe terminar obligatoriamente con \\n\\n<small>[Porcentaje: X%]</small>."
          },
          mirada: {
            type: Type.STRING,
            description: "Hunter Eyes vs Prey Eyes, etc., explicado con humor de looksmaxing. Debe terminar obligatoriamente con \\n\\n<small>[Porcentaje: X%]</small>."
          },
          desarrolloOseo: {
            type: Type.STRING,
            description: "Evaluación geométrica del Forward Growth, pómulos y desarrollo facial superior. Debe terminar obligatoriamente con \\n\\n<small>[Porcentaje: X%]</small>."
          },
          medioRostroInferior: {
            type: Type.STRING,
            description: "Evaluación del tercio facial inferior, proporción de la boca, mentón y relación nariz-mentón. Debe terminar obligatoriamente con \\n\\n<small>[Porcentaje: X%]</small>."
          },
          simetriaOrbital: {
            type: Type.STRING,
            description: "Evaluación de la asimetría o simetría de las órbitas oculares y cejas. Debe terminar obligatoriamente con \\n\\n<small>[Porcentaje: X%]</small>."
          },
          lineaMandibula: {
            type: Type.STRING,
            description: "Evaluación del gonión, ángulo mandibular, definición y grasa submentoniana. Debe terminar obligatoriamente con \\n\\n<small>[Porcentaje: X%]</small>."
          },
          veredictoPastillas: {
            type: Type.STRING,
            description: "Si necesita Redpill, está en la Blackpill absoluta o vive feliz en la Bluepill."
          },
          diagnostico: {
            type: Type.STRING,
            description: "El diagnóstico del Mogger: párrafo corto, ingenioso, satírico y lleno de ironía con consejos disparatados."
          },
          probabilityToAscend: {
            type: Type.STRING,
            description: "Probabilidad porcentual calculada dinámicamente según sus facciones (ej: '42.7%', '89.1%')."
          },
          mewingStreakRequired: {
            type: Type.STRING,
            description: "Racha de días de mewing o disciplina requerida (ej: '14,200 días', '0 días (Divino)')."
          },
          statusMeme: {
            type: Type.STRING,
            description: "Estado o veredicto corto en mayúsculas (ej: 'OVER', 'ASCENDIDO', 'CRÍTICO')."
          },
          recommendedProtocol: {
            type: Type.STRING,
            description: "Nombre personalizado del protocolo recomendado (ej: 'Hardcore Softmaxing', 'Gym & Style Maxing')."
          },
          finalOrder: {
            type: Type.STRING,
            description: "Orden final cómica o satírica dirigida al usuario (ej: 'Go to the gym, kid', 'Mew 24/7 or it's over')."
          },
          fullReportMarkdown: {
            type: Type.STRING,
            description: "El reporte completo formateado con markdown para el usuario, con un desglose divertido e implacable."
          }
        },
        required: [
          "tier",
          "overallPercentage",
          "canthalTilt",
          "mirada",
          "desarrolloOseo",
          "medioRostroInferior",
          "simetriaOrbital",
          "lineaMandibula",
          "veredictoPastillas",
          "diagnostico",
          "probabilityToAscend",
          "mewingStreakRequired",
          "statusMeme",
          "recommendedProtocol",
          "finalOrder",
          "fullReportMarkdown"
        ]
      };

      const ai = new GoogleGenAI({ apiKey: apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          prompt
        ],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: responseSchema
        }
      });

      if (!response.text) {
        throw new Error("Respuesta vacía de la API de Gemini.");
      }

      const scanResult: MogScanResult = JSON.parse(response.text);
      scanResult.timestamp = new Date().toLocaleString();
      scanResult.imageUrl = selectedImage; // save thumbnail in result

      // Finish loading
      clearInterval(interval);
      setResult(scanResult);
      saveToHistory(scanResult);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Error al conectar con el servidor de looksmaxing. Inténtalo de nuevo.");
    } finally {
      clearInterval(interval);
      setIsScanning(false);
    }
  };

  // Copy full report to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Get color configurations for different tiers
  const getTierBadgeConfig = (tier: string) => {
    const t = tier.toUpperCase();
    if (t.includes("CHAD") || t.includes("STACY")) {
      return {
        bg: "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]",
        label: "Tier Divino: CHAD / STACY",
        textColor: "text-amber-400",
        pillColor: "from-amber-500 to-yellow-400"
      };
    }
    if (t.includes("HTN") || t.includes("HIGH TIER")) {
      return {
        bg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]",
        label: "High Tier Normal (HTN)",
        textColor: "text-emerald-400",
        pillColor: "from-emerald-500 to-green-400"
      };
    }
    if (t.includes("MTN") || t.includes("MID TIER")) {
      return {
        bg: "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.2)]",
        label: "Mid Tier Normal (MTN)",
        textColor: "text-cyan-400",
        pillColor: "from-cyan-500 to-blue-400"
      };
    }
    if (t.includes("LTN") || t.includes("LOW TIER")) {
      return {
        bg: "bg-orange-500/20 text-orange-300 border-orange-500/50",
        label: "Low Tier Normal (LTN)",
        textColor: "text-orange-400",
        pillColor: "from-orange-500 to-amber-600"
      };
    }
    if (t.includes("SUB-5") || t.includes("SUB 5")) {
      return {
        bg: "bg-red-500/10 text-red-400 border-red-500/30",
        label: "Sub-5 (Infracomún)",
        textColor: "text-red-400",
        pillColor: "from-red-500 to-rose-600"
      };
    }
    return {
      bg: "bg-rose-950/40 text-rose-500 border-rose-950/80 animate-pulse",
      label: "Sub-3 (It's Over Absolute)",
      textColor: "text-rose-500",
      pillColor: "from-rose-800 to-black"
    };
  };

  // Dynamic color helper for status text based on tier
  const getStatusColorClass = (tier: string) => {
    const t = (tier || "").toUpperCase();
    if (t.includes("CHAD") || t.includes("STACY")) {
      return "text-amber-400 border-amber-500/30";
    }
    if (t.includes("HTN") || t.includes("HIGH")) {
      return "text-emerald-400 border-emerald-500/30";
    }
    if (t.includes("MTN") || t.includes("MID")) {
      return "text-cyan-400 border-cyan-500/30";
    }
    if (t.includes("LTN") || t.includes("LOW")) {
      return "text-orange-400 border-orange-500/30";
    }
    return "text-red-400 border-red-500/30";
  };

  return (
    <div className="min-h-screen flex flex-col justify-between relative bg-[#050505] text-[#e0e0e0] mog-grid-bg selection:bg-[#ff3e3e]/30 selection:text-white" id="mogger-app">
      
      {/* Decorative red glow background effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#ff3e3e]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-red-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-[#ff3e3e]/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header aligned with Sophisticated Dark template */}
      <header className="border-b border-[#333] bg-[#050505]/95 backdrop-blur-md z-40 sticky top-0" id="mog-header">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div className="flex flex-col">
            <div className="text-[#ff3e3e] font-mono text-xs tracking-[0.3em] uppercase mb-1">
              System Status: Optimal // Blackpill Protocol Activated
            </div>
            <h1 className="font-display font-black text-4xl tracking-tighter uppercase italic text-white flex items-center gap-2">
              MoggerBot <span className="text-[#ff3e3e]">3000</span>
            </h1>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="text-left font-mono text-[10px] opacity-50 uppercase hidden md:block">
              v4.2.0-Alpha<br />
              Target: User_Cope_Protocol
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsApiKeyModalOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all duration-200 ${
                  apiKey 
                    ? "border-emerald-500/30 bg-[#0c1a12] text-emerald-300 hover:border-emerald-500/60" 
                    : "border-[#333] bg-[#111] text-gray-300 hover:text-white hover:border-[#ff3e3e]/50 hover:bg-[#ff3e3e]/10"
                }`}
                id="btn-apikey"
              >
                <Key className={`w-3.5 h-3.5 ${apiKey ? "text-emerald-400 animate-pulse" : "text-[#ff3e3e]"}`} />
                <span>{apiKey ? "API Key Activa" : "Configurar API Key"}</span>
              </button>

              <button
                onClick={() => setIsGlossaryOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#333] bg-[#111] text-xs text-gray-300 hover:text-white hover:border-[#ff3e3e]/50 hover:bg-[#ff3e3e]/10 transition-all duration-200"
                id="btn-glossary"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#ff3e3e]" />
                <span>Diccionario</span>
              </button>
              
              <button
                onClick={() => setIsHistoryOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#333] bg-[#111] text-xs text-gray-300 hover:text-white hover:border-[#ff3e3e]/50 hover:bg-[#ff3e3e]/10 transition-all duration-200"
                id="btn-history"
              >
                <History className="w-3.5 h-3.5 text-[#ff3e3e]" />
                <span>Historial ({scanHistory.length})</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow max-w-6xl w-full mx-auto px-6 py-8 relative z-30 flex flex-col" id="mog-main">
        
        {/* Welcome Banner */}
        <div className="mb-8 text-center max-w-2xl mx-auto" id="welcome-banner">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#ff3e3e]/10 border border-[#ff3e3e]/30 rounded-full text-xs font-mono text-[#ff3e3e] mb-4 animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            SISTEMA BIOMÉTRICO LOOKSMAXING EN LÍNEA
          </div>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight mb-3 uppercase italic">
            ¿Tienes ojos de cazador o eres una presa indefensa?
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Sube una selfie o enciende tu cámara. MoggerBot 3000 escaneará tu estructura facial con la blackpill más destructiva y cómica de los foros de internet.
          </p>
        </div>

        {/* Responsive Grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start flex-grow" id="analysis-grid">
          
          {/* Columna Izquierda: Capturador / Visor de Imagen */}
          <div className="lg:col-span-5 flex flex-col gap-4" id="image-column">
            <div 
              className={`border border-[#333] rounded-xl overflow-hidden relative aspect-square flex flex-col items-center justify-center bg-[#111] transition-all duration-300 ${
                selectedImage ? "border-[#ff3e3e]/40 shadow-[0_0_30px_rgba(255,62,62,0.05)]" : "border-[#333] hover:border-[#ff3e3e]/30"
              }`}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              id="capture-box"
            >
              {/* Scan laser overlay during scanning */}
              <AnimatePresence>
                {isScanning && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-20 bg-black/75 pointer-events-none"
                  >
                    {/* Horizontal laser scan line in Red */}
                    <div className="absolute left-0 right-0 h-[2px] bg-[#ff3e3e] shadow-[0_0_15px_#ff3e3e] animate-scan" />
                    {/* High tech grid elements */}
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ff3e3e_1px,transparent_1px)] [background-size:16px_16px]" />
                    {/* Targeting reticles */}
                    <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-[#ff3e3e]" />
                    <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-[#ff3e3e]" />
                    <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-[#ff3e3e]" />
                    <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-[#ff3e3e]" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error warning bar */}
              {errorMsg && (
                <div className="absolute top-3 left-3 right-3 z-30 bg-rose-500/20 border border-rose-500/50 rounded-lg p-2.5 flex items-start gap-2 text-xs text-rose-300">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* State 1: Active camera stream */}
              {isCameraActive && (
                <div className="w-full h-full relative" id="webcam-viewer">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3 px-4 z-20">
                    <button
                      onClick={capturePhoto}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#ff3e3e] text-white font-semibold text-xs shadow-[0_0_20px_rgba(255,62,62,0.4)] hover:scale-105 active:scale-95 transition-all duration-150 uppercase tracking-widest"
                      id="btn-capture"
                    >
                      <Camera className="w-4 h-4" />
                      Capturar
                    </button>
                    <button
                      onClick={stopCamera}
                      className="px-4 py-2 rounded-lg bg-[#111] text-white border border-[#333] font-semibold text-xs hover:bg-[#1a1a1a] transition-all duration-150 uppercase"
                      id="btn-cancel-camera"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* State 2: Display chosen image */}
              {!isCameraActive && selectedImage && (
                <div className="w-full h-full relative group" id="photo-viewer">
                  <img 
                    src={selectedImage} 
                    alt="Facial scan target" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center p-4">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => { setSelectedImage(null); setResult(null); }}
                        className="px-3 py-1.5 bg-[#ff3e3e] text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-all uppercase tracking-wider"
                        id="btn-remove-photo"
                      >
                        Quitar Foto
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* State 3: Empty state */}
              {!isCameraActive && !selectedImage && (
                <div className="p-8 text-center flex flex-col items-center gap-4" id="empty-uploader">
                  <div className="w-16 h-16 rounded-full bg-[#111] border border-[#333] flex items-center justify-center text-gray-400 hover:text-white transition-all">
                    <Upload className="w-8 h-8 text-[#ff3e3e] animate-pulse" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-200 font-semibold mb-1 uppercase tracking-wider">
                      Arrastra tu selfie aquí
                    </p>
                    <p className="text-xs text-gray-500 font-mono">
                      PNG, JPG o WEBP // Drag & Drop
                    </p>
                  </div>
                  <div className="flex gap-2.5 mt-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 rounded-lg border border-[#333] bg-[#1a1a1a] text-xs text-gray-300 hover:text-white hover:bg-[#222] transition-all uppercase tracking-wider font-mono"
                      id="btn-select-file"
                    >
                      Buscar archivo
                    </button>
                    <button
                      onClick={startCamera}
                      className="px-4 py-2 rounded-lg bg-[#ff3e3e]/10 border border-[#ff3e3e]/30 text-xs text-[#ff3e3e] hover:bg-[#ff3e3e]/20 transition-all uppercase tracking-wider font-mono"
                      id="btn-start-camera"
                    >
                      Cámara
                    </button>
                  </div>
                </div>
              )}

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                accept="image/*" 
                className="hidden" 
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Scan Action Controls */}
            {selectedImage && !isScanning && !result && (
              <button
                onClick={scanFace}
                className="w-full py-4 rounded-lg bg-[#ff3e3e] text-white font-extrabold tracking-wider text-xs shadow-[0_0_30px_rgba(255,62,62,0.3)] hover:bg-red-700 transition-all duration-200 relative overflow-hidden group uppercase"
                id="btn-scan"
              >
                <span className="absolute inset-0 w-full h-full bg-white/10 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <span className="flex items-center justify-center gap-2">
                  <Flame className="w-4 h-4 animate-bounce" />
                  ESCANEAR ESTADÍSTICAS ÓSEAS
                </span>
              </button>
            )}

            {/* Loading terminal simulation while scanning */}
            {isScanning && (
              <div className="bg-[#111] border border-[#333] rounded-lg p-4 font-mono text-xs text-gray-400 shadow-[0_0_20px_rgba(255,62,62,0.02)]" id="scan-terminal">
                <div className="flex items-center gap-1.5 text-[#ff3e3e] mb-2 border-b border-[#222] pb-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ff3e3e] animate-ping" />
                  <span>MOGGER_METRIC_SCAN_V4.SYS</span>
                </div>
                <div className="space-y-1">
                  {loadingPhrases.slice(0, scanStep + 1).map((phrase, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex gap-1.5 ${i === scanStep ? "text-white font-semibold" : "text-gray-500"}`}
                    >
                      <span className="text-[#ff3e3e]">&gt;</span>
                      <span>{phrase}</span>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-[#222] pt-2 text-[10px] text-gray-500">
                  <span>PROCESANDO ROSTRO...</span>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#ff3e3e]" />
                </div>
              </div>
            )}

            {/* Diagnostic complete options */}
            {result && (
              <button
                onClick={() => { setSelectedImage(null); setResult(null); }}
                className="w-full py-3.5 rounded-lg border border-[#333] bg-[#111] text-xs text-gray-300 font-semibold hover:text-white hover:bg-[#1a1a1a] transition-all flex items-center justify-center gap-2 uppercase tracking-widest font-mono"
                id="btn-reset"
              >
                <RefreshCw className="w-4 h-4" />
                ESCANEAR NUEVO ROSTRO
              </button>
            )}
          </div>

          {/* Columna Derecha: Reporte de Resultados */}
          <div className="lg:col-span-7" id="results-column">
            <AnimatePresence mode="wait">
              
              {/* Empty placeholder state */}
              {!isScanning && !result && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="border border-[#333] bg-[#111]/30 rounded-xl p-8 text-center flex flex-col items-center justify-center min-h-[400px] select-none"
                  id="results-placeholder"
                >
                  <div className="w-20 h-20 rounded-full bg-[#111] border border-[#333] flex items-center justify-center text-gray-600 mb-4 animate-float">
                    <Compass className="w-10 h-10 text-gray-500" />
                  </div>
                  <h3 className="font-display font-semibold text-lg text-gray-300 mb-2 uppercase tracking-wider">Espera de datos biométricos</h3>
                  <p className="text-gray-500 text-xs max-w-sm">
                    Sube una selfie o tómate una foto para que MoggerBot 3000 analice tus ángulos faciales milimétricos y diagnostique tu destino estético.
                  </p>
                </motion.div>
              )}

              {/* Scan Results Screen */}
              {result && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="space-y-6"
                  id="results-display"
                >
                  
                  {/* Tier Card */}
                  <div className="border border-[#333] bg-[#111] rounded-lg p-5 relative overflow-hidden transition-all duration-300" id="tier-card">
                    {/* Corner border in red styling */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-transparent to-red-500/5 pointer-events-none" />
                    
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
                      <div>
                        <div className="text-[10px] font-mono tracking-widest text-[#ff3e3e] uppercase mb-1 font-bold">
                          🚨 ESCANEO DE NEURONAS DE LOOKSMAXING 🚨
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="font-display font-black text-3xl tracking-tight uppercase italic text-white">
                            {result.tier}
                          </h3>
                          <span className="inline-flex items-center px-3 py-1 rounded bg-gradient-to-r from-[#ff3e3e]/20 to-[#ff3e3e]/5 border border-[#ff3e3e]/30 text-xs sm:text-sm font-mono font-black text-[#ff3e3e] uppercase tracking-wider shadow-[0_0_15px_rgba(255,62,62,0.15)] animate-pulse">
                            SCORE: {result.overallPercentage}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                          <span>Rango detectado: <strong className="text-white">{getTierBadgeConfig(result.tier).label}</strong>.</span>
                        </p>
                      </div>

                      <div className="shrink-0 flex items-center">
                        {/* Graphical representation of tier scale */}
                        <div className="flex flex-col items-end gap-1.5">
                          <div className="flex gap-1 bg-[#050505] p-1 border border-[#222] rounded">
                            {["Sub-3", "Sub-5", "LTN", "MTN", "HTN", "Chad/Stacy"].map((t, idx) => {
                              const isCurrent = result.tier.toUpperCase().includes(t.toUpperCase());
                              return (
                                <div 
                                  key={idx} 
                                  className={`h-5 w-8 rounded-sm text-[8px] font-mono flex items-center justify-center font-bold transition-all ${
                                    isCurrent 
                                      ? "bg-[#ff3e3e] text-white scale-110 shadow-[0_0_10px_rgba(255,62,62,0.5)]" 
                                      : "text-gray-500 hover:text-gray-400"
                                  }`}
                                  title={t}
                                >
                                  {t}
                                </div>
                              );
                            })}
                          </div>
                          <span className="text-[9px] font-mono text-gray-500 tracking-wider">PSL ESCALA ESTIMADA</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Anatomical Metrics Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="metrics-grid">
                    
                    {/* Canthal Tilt */}
                    <div className="bg-[#0a0a0a] border border-[#333] rounded-lg p-4 flex gap-3 items-start hover:border-[#ff3e3e]/30 transition-all duration-200">
                      <div className="p-2 bg-[#ff3e3e]/10 rounded-lg text-[#ff3e3e] shrink-0">
                        <Compass className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-display font-bold text-xs text-white tracking-wider uppercase">Canthal Tilt</h4>
                        <p className="text-gray-400 text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: result.canthalTilt }} />
                      </div>
                    </div>

                    {/* Mirada */}
                    <div className="bg-[#0a0a0a] border border-[#333] rounded-lg p-4 flex gap-3 items-start hover:border-[#ff3e3e]/30 transition-all duration-200">
                      <div className="p-2 bg-[#ff3e3e]/10 rounded-lg text-[#ff3e3e] shrink-0">
                        <Eye className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-display font-bold text-xs text-white tracking-wider uppercase">Tipo de Mirada</h4>
                        <p className="text-gray-400 text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: result.mirada }} />
                      </div>
                    </div>

                    {/* Desarrollo Óseo */}
                    <div className="bg-[#0a0a0a] border border-[#333] rounded-lg p-4 flex gap-3 items-start hover:border-[#ff3e3e]/30 transition-all duration-200">
                      <div className="p-2 bg-[#ff3e3e]/10 rounded-lg text-[#ff3e3e] shrink-0">
                        <Ruler className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-display font-bold text-xs text-white tracking-wider uppercase">Desarrollo Óseo</h4>
                        <p className="text-gray-400 text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: result.desarrolloOseo }} />
                      </div>
                    </div>

                    {/* Medio Rostro Inferior */}
                    <div className="bg-[#0a0a0a] border border-[#333] rounded-lg p-4 flex gap-3 items-start hover:border-[#ff3e3e]/30 transition-all duration-200">
                      <div className="p-2 bg-[#ff3e3e]/10 rounded-lg text-[#ff3e3e] shrink-0">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-display font-bold text-xs text-white tracking-wider uppercase">Medio Rostro Inferior</h4>
                        <p className="text-gray-400 text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: result.medioRostroInferior }} />
                      </div>
                    </div>

                    {/* Simetría Orbital */}
                    <div className="bg-[#0a0a0a] border border-[#333] rounded-lg p-4 flex gap-3 items-start hover:border-[#ff3e3e]/30 transition-all duration-200">
                      <div className="p-2 bg-[#ff3e3e]/10 rounded-lg text-[#ff3e3e] shrink-0">
                        <Grid className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-display font-bold text-xs text-white tracking-wider uppercase">Simetría Orbital</h4>
                        <p className="text-gray-400 text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: result.simetriaOrbital }} />
                      </div>
                    </div>

                    {/* Línea de la Mandíbula */}
                    <div className="bg-[#0a0a0a] border border-[#333] rounded-lg p-4 flex gap-3 items-start hover:border-[#ff3e3e]/30 transition-all duration-200">
                      <div className="p-2 bg-[#ff3e3e]/10 rounded-lg text-[#ff3e3e] shrink-0">
                        <Flame className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-display font-bold text-xs text-white tracking-wider uppercase">Línea de la Mandíbula</h4>
                        <p className="text-gray-400 text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: result.lineaMandibula }} />
                      </div>
                    </div>

                    {/* Veredicto Pastillas */}
                    <div className="bg-[#0a0a0a] border border-[#333] rounded-lg p-4 flex gap-3 items-start hover:border-[#ff3e3e]/30 transition-all duration-200 md:col-span-2">
                      <div className="p-2 bg-[#ff3e3e]/10 rounded-lg text-[#ff3e3e] shrink-0">
                        <Pill className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-display font-bold text-xs text-white tracking-wider uppercase">Veredicto de la Pastilla</h4>
                        <p className="text-gray-400 text-xs leading-relaxed">{result.veredictoPastillas}</p>
                      </div>
                    </div>

                  </div>

                  {/* El Diagnóstico Principal */}
                  <div className="bg-[#111] border-l-4 border-[#ff3e3e] p-6 flex flex-col justify-between space-y-4" id="diagnostic-card">
                    
                    <div className="flex items-center justify-between gap-3 border-b border-[#222] pb-3">
                      <div className="flex items-center gap-2">
                        <Skull className="w-5 h-5 text-[#ff3e3e]" />
                        <h3 className="font-display font-black text-xl italic uppercase tracking-tighter text-white">
                          💀 EL DIAGNÓSTICO DEL MOGGER
                        </h3>
                      </div>

                      {/* TTS speaker button */}
                      <button
                        onClick={() => speakDiagnostic(result.diagnostico)}
                        className={`p-1.5 rounded border transition-all duration-150 flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider ${
                          isSpeaking 
                            ? "bg-[#ff3e3e]/10 text-[#ff3e3e] border-[#ff3e3e] shadow-[0_0_10px_rgba(255,62,62,0.2)]" 
                            : "bg-[#1a1a1a] border-[#333] text-gray-400 hover:text-white"
                        }`}
                        title="Escuchar veredicto"
                        id="btn-tts"
                      >
                        {isSpeaking ? (
                          <>
                            <VolumeX className="w-3 h-3 text-[#ff3e3e]" />
                            <span>Silenciar</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3 h-3 text-[#ff3e3e]" />
                            <span>Escuchar IA</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div>
                      <p className="font-serif text-xl sm:text-2xl leading-relaxed text-[#bbb] italic">
                        &ldquo;{result.diagnostico}&rdquo;
                      </p>
                    </div>

                    {/* Integrated Dynamic Stats panels from the Sophisticated Dark template */}
                    <div className="flex flex-wrap md:flex-nowrap gap-4 pt-4 border-t border-[#222]">
                      
                      <div className="flex-1 min-w-[120px] bg-[#1a1a1a] p-4 text-center border border-[#333] rounded">
                        <div className="text-[10px] uppercase font-mono tracking-wider opacity-50 mb-1">Probability of Ascending</div>
                        <div className="text-2xl font-mono font-bold text-white">
                          {result.probabilityToAscend || "0%"}
                        </div>
                      </div>

                      <div className="flex-1 min-w-[120px] bg-[#1a1a1a] p-4 text-center border border-[#333] rounded">
                        <div className="text-[10px] uppercase font-mono tracking-wider opacity-50 mb-1">Mewing Streak Required</div>
                        <div className="text-2xl font-mono font-bold text-white">
                          {result.mewingStreakRequired || "N/A"}
                        </div>
                      </div>

                      <div className="flex-1 min-w-[120px] bg-[#1a1a1a] p-4 text-center border border-[#333] rounded">
                        <div className="text-[10px] uppercase font-mono tracking-wider opacity-50 mb-1">Status</div>
                        <div className={`text-2xl font-mono font-black ${getStatusColorClass(result.tier)}`}>
                          {result.statusMeme || "UNANALYZED"}
                        </div>
                      </div>

                    </div>

                    {/* Recommended Action Protocols */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="bg-white text-black p-4 flex flex-col justify-center items-center rounded font-black uppercase text-center border border-white">
                        <div className="text-[9px] tracking-widest text-black/60 font-mono mb-1">Recommended Protocol</div>
                        <div className="text-base sm:text-lg tracking-tight font-display text-black">
                          {result.recommendedProtocol || "N/A"}
                        </div>
                      </div>

                      <div className="bg-[#ff3e3e] text-white p-4 flex flex-col justify-center items-center rounded font-black uppercase text-center border border-[#ff3e3e]">
                        <div className="text-[9px] tracking-widest text-white/60 font-mono mb-1">Final Order</div>
                        <div className="text-base sm:text-lg tracking-tight font-display text-white">
                          {result.finalOrder || "N/A"}
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Full Report Copy/Paste Block */}
                  <div className="bg-[#111] border border-[#333] rounded-lg p-4 space-y-3" id="markdown-copy-container">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                        INFORME COMPLETO (MARKDOWN PARA FOROS/CHATS)
                      </div>
                      <button
                        onClick={() => copyToClipboard(result.fullReportMarkdown)}
                        className="px-2.5 py-1 rounded bg-[#1a1a1a] hover:bg-[#222] text-[10px] font-mono text-gray-300 hover:text-white border border-[#333] flex items-center gap-1 transition-all"
                        id="btn-copy-report"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3 h-3 text-[#39ff14]" />
                            <span>Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-[#ff3e3e]" />
                            <span>Copiar Reporte</span>
                          </>
                        )}
                      </button>
                    </div>
                    
                    <pre className="p-3.5 bg-[#050505] rounded text-[10px] font-mono text-gray-400 border border-[#222] max-h-36 overflow-y-auto whitespace-pre-wrap select-all">
                      {result.fullReportMarkdown}
                    </pre>
                  </div>

                </motion.div>
              )}

            </AnimatePresence>
          </div>

        </div>

      </main>

      {/* Glossary / Dictionary Sidebar-Modal */}
      <AnimatePresence>
        {isGlossaryOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md" id="glossary-modal">
            {/* Backdrop click to close */}
            <div className="absolute inset-0" onClick={() => setIsGlossaryOpen(false)} />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111] border border-[#333] rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden relative z-10 shadow-[0_0_50px_rgba(255,62,62,0.1)]"
            >
              {/* Header */}
              <div className="border-b border-[#222] px-6 py-4 flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#ff3e3e]" />
                  <h3 className="font-display font-extrabold text-lg text-white">GLOSARIO LOOKSMAXING & BIOMETRÍA</h3>
                </div>
                <button 
                  onClick={() => setIsGlossaryOpen(false)}
                  className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/5 transition-all text-xs font-mono"
                  id="btn-close-glossary"
                >
                  [ESC] X
                </button>
              </div>

              {/* Glossary list */}
              <div className="p-6 overflow-y-auto space-y-4 flex-grow">
                <p className="text-xs text-gray-400 mb-2 leading-relaxed">
                  Para los no iniciados: un resumen rápido de las obsesiones estéticas que maneja MoggerBot 3000 para catalogar los rostros de los mortales.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {glossaryData.map((item, idx) => (
                    <div key={idx} className="bg-black/30 border border-[#222] rounded-lg p-4 space-y-1.5 hover:border-[#333] transition-all">
                      <div className="flex items-center justify-between">
                        <span className="font-display font-bold text-sm text-white">{item.term}</span>
                        <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded uppercase font-semibold ${
                          item.category === "anatomy" 
                            ? "bg-[#ff3e3e]/10 text-[#ff3e3e] border border-[#ff3e3e]/20" 
                            : item.category === "pills"
                              ? "bg-[#39ff14]/10 text-[#39ff14] border border-[#39ff14]/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}>
                          {item.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 leading-relaxed">{item.definition}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom advice bar */}
              <div className="border-t border-[#222] bg-black/60 px-6 py-3 flex items-center justify-between text-[10px] font-mono text-gray-500">
                <span>REGLA 1: NUNCA DEJAR DE HACER MEWING</span>
                <span className="text-[#ff3e3e] font-bold">ESTÉTICA ABSOLUTA</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* History Slide-Over / Modal */}
      <AnimatePresence>
        {isHistoryOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-end p-0 bg-black/80 backdrop-blur-sm" id="history-modal">
            {/* Backdrop click to close */}
            <div className="absolute inset-0" onClick={() => setIsHistoryOpen(false)} />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-[#111] border-l border-[#333] h-full w-full max-w-md flex flex-col justify-between overflow-hidden relative z-10 shadow-[-10px_0_40px_rgba(0,0,0,0.5)]"
            >
              {/* Header */}
              <div className="border-b border-[#222] px-6 py-5 flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-[#ff3e3e]" />
                  <h3 className="font-display font-extrabold text-lg text-white">HISTORIAL DE ESCANEOS</h3>
                </div>
                <button 
                  onClick={() => setIsHistoryOpen(false)}
                  className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-white/5 transition-all text-xs font-mono"
                  id="btn-close-history"
                >
                  CERRAR →
                </button>
              </div>

              {/* History list content */}
              <div className="p-6 overflow-y-auto space-y-4 flex-grow">
                {scanHistory.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 select-none space-y-3">
                    <Skull className="w-10 h-10 text-gray-600 mx-auto animate-pulse" />
                    <p className="text-xs font-mono uppercase">NINGÚN EXPEDIENTE BIOMÉTRICO ARCHIVADO</p>
                    <p className="text-[10px] text-gray-600">Sube tu primer rostro para desbloquear el archivo criminal.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-[#222]">
                      <span className="text-[10px] font-mono text-gray-500 uppercase">EXPEDIENTES GUARDADOS</span>
                      <button 
                        onClick={clearHistory}
                        className="text-[9px] font-mono text-rose-400 hover:text-rose-300 underline"
                        id="btn-clear-history"
                      >
                        Limpiar Historial
                      </button>
                    </div>

                    <div className="space-y-3">
                      {scanHistory.map((scan, i) => (
                        <div 
                          key={i} 
                          className="bg-black/30 border border-[#222] hover:border-[#333] rounded-lg p-3 flex gap-3 items-center group cursor-pointer transition-all"
                          onClick={() => {
                            setResult(scan);
                            if (scan.imageUrl) setSelectedImage(scan.imageUrl);
                            setIsHistoryOpen(false);
                          }}
                        >
                          {scan.imageUrl ? (
                            <img 
                              src={scan.imageUrl} 
                              alt="Thumbnail scan" 
                              className="w-12 h-12 rounded object-cover shrink-0 border border-[#222]"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded bg-[#050505] flex items-center justify-center shrink-0 border border-[#222]">
                              <User className="w-6 h-6 text-gray-600" />
                            </div>
                          )}

                          <div className="flex-grow min-w-0">
                            <div className="flex items-center justify-between gap-1.5">
                              <span className={`font-display font-black text-sm tracking-tight ${getTierBadgeConfig(scan.tier).textColor}`}>
                                {scan.tier}
                              </span>
                              <span className="text-[9px] font-mono text-gray-500 shrink-0">{scan.timestamp.split(",")[0]}</span>
                            </div>
                            <p className="text-[11px] text-gray-400 truncate mt-0.5 italic">
                              "{scan.diagnostico}"
                            </p>
                          </div>
                          
                          <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom bar */}
              <div className="border-t border-[#222] bg-black/60 px-6 py-4 text-center text-[10px] font-mono text-gray-500">
                <span>EXPEDIENTE COOP-SCALE ARCHIVED</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* API Key Config Modal */}
      <AnimatePresence>
        {isApiKeyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md" id="apikey-modal">
            {/* Backdrop click to close - blocked if no key */}
            <div className="absolute inset-0" onClick={() => {
              if (!apiKey) {
                alert("introduce clave key");
                return;
              }
              setIsApiKeyModalOpen(false);
            }} />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-[#111] border border-[#333] rounded-xl w-full max-w-lg flex flex-col overflow-hidden relative z-10 shadow-[0_0_50px_rgba(255,62,62,0.15)] max-h-[90vh]"
            >
              {/* Header */}
              <div className="border-b border-[#222] px-6 py-4 flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-[#ff3e3e]" />
                  <h3 className="font-display font-extrabold text-base text-white tracking-wide uppercase">API KEY REQUERIDA</h3>
                </div>
                {apiKey && (
                  <button 
                    onClick={() => setIsApiKeyModalOpen(false)}
                    className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/5 transition-all text-xs font-mono"
                    id="btn-close-apikey"
                  >
                    [CERRAR] X
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto space-y-6 flex-grow text-left">
                <div className="bg-[#ff3e3e]/5 border border-[#ff3e3e]/20 rounded-lg p-3 text-xs text-gray-300 leading-relaxed flex gap-2.5 items-start">
                  <Sparkles className="w-4 h-4 text-[#ff3e3e] shrink-0 mt-0.5" />
                  <span>
                    Para garantizar un análisis facial ultrarrápido y sin límites, es necesario introducir tu propia clave de API gratuita de Google Gemini.
                  </span>
                </div>

                {/* Steps Description */}
                <div className="space-y-3">
                  <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider font-bold">Pasos para obtener tu clave:</div>
                  <ol className="space-y-3 text-xs text-gray-300 font-sans">
                    <li className="flex items-start gap-2.5">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#ff3e3e]/10 text-[#ff3e3e] font-mono text-[10px] shrink-0 font-bold">1</span>
                      <div>
                        Entra en:{" "}
                        <a 
                          href="https://aistudio.google.com/api-keys" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-[#ff3e3e] underline inline-flex items-center gap-0.5 hover:text-red-400 font-bold"
                        >
                          aistudio.google.com/api-keys <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#ff3e3e]/10 text-[#ff3e3e] font-mono text-[10px] shrink-0 font-bold">2</span>
                      <div>Inicia sesión con tu cuenta de Google.</div>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#ff3e3e]/10 text-[#ff3e3e] font-mono text-[10px] shrink-0 font-bold">3</span>
                      <div>Haz clic en <strong>"Crear clave de API"</strong> (Create API key) y cópiala.</div>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#ff3e3e]/10 text-[#ff3e3e] font-mono text-[10px] shrink-0 font-bold">4</span>
                      <div>Pégala en el campo de abajo y guarda.</div>
                    </li>
                  </ol>
                </div>

                {/* Input field */}
                <div className="space-y-2 pt-4 border-t border-[#222]">
                  <label className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block font-bold">
                    Tu API Key de Gemini:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      placeholder="AIzaSy..."
                      value={apiKey}
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        setApiKey(val);
                        localStorage.setItem("mogger_api_key", val);
                      }}
                      className="flex-grow bg-black border border-[#333] rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-gray-700 focus:outline-none focus:border-[#ff3e3e]/50"
                    />
                    {apiKey && (
                      <button
                        onClick={() => {
                          setApiKey("");
                          localStorage.removeItem("mogger_api_key");
                        }}
                        className="px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-950/20 text-rose-300 text-xs font-mono hover:bg-rose-950/40"
                        title="Borrar Clave"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>
                  <p className="text-[9px] text-gray-500 font-mono">
                    * Tu clave se guarda localmente en localStorage. No se comparte ni se almacena en servidores de terceros.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-[#222] bg-black/60 px-6 py-4 flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    if (!apiKey) {
                      alert("introduce clave key");
                      return;
                    }
                    setIsApiKeyModalOpen(false);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded bg-[#ff3e3e] text-white font-bold text-xs uppercase tracking-wider hover:bg-red-700 transition-all shadow-[0_0_15px_rgba(255,62,62,0.2)]"
                  id="btn-save-apikey"
                >
                  Confirmar y Acceder
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer styled to Sophisticated Dark template */}
      <footer className="border-t border-[#333] bg-[#050505] py-5 z-40 text-center" id="mog-footer">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] font-mono opacity-50 uppercase tracking-[0.2em]">
          <div>
            <span>Analysis generated by looksmaxing neural engine // No refunds for damaged egos</span>
          </div>
          <div>
            <span>© 2026 MoggerBot Systems Int.</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
