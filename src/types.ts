export interface MogScanResult {
  tier: "Sub-3" | "Sub-5" | "LTN" | "MTN" | "HTN" | "Chad/Stacy" | string;
  overallPercentage: string;
  canthalTilt: string;
  mirada: string;
  desarrolloOseo: string;
  medioRostroInferior: string;
  simetriaOrbital: string;
  lineaMandibula: string;
  veredictoPastillas: string;
  diagnostico: string;
  fullReportMarkdown: string;
  probabilityToAscend: string;
  mewingStreakRequired: string;
  statusMeme: string;
  recommendedProtocol: string;
  finalOrder: string;
  imageUrl?: string; // Optional local base64/blob image for displaying in history
  timestamp: string;
}

export interface GlossaryEntry {
  term: string;
  definition: string;
  category: "anatomy" | "pills" | "slang";
  severity: "low" | "medium" | "extreme";
}
