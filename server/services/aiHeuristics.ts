import { AIAnalysis, DepartmentId, Priority } from '../../src/types';

interface AnalysisInput {
  text: string;
  languageHint?: string;
  hasImage?: boolean;
  imageHint?: string;
}

export function analyzeComplaintWithHeuristics(input: AnalysisInput): AIAnalysis {
  const rawText = input.text.trim();
  const lower = rawText.toLowerCase();

  // 1. Language Detection
  let detectedLang: 'Hindi' | 'English' | 'Hinglish' | 'Other' = 'English';
  const devanagariRegex = /[\u0900-\u097F]/;
  const hindiWords = [
    'paani', 'pani', 'nahi', 'aa', 'raha', 'hai', 'bahut', 'problem', 'washroom',
    'bathroom', 'bijli', 'pankha', 'light', 'karein', 'hona', 'chahiye', 'sir',
    'baje', 'subah', 'shyam', 'hostel', 'khana', 'mess', 'kamre', 'tapak', 'chal',
    'gaya', 'band', 'tuta', 'kharab'
  ];

  if (devanagariRegex.test(rawText)) {
    detectedLang = 'Hindi';
  } else {
    const matchedHinglish = hindiWords.filter(w => lower.includes(w));
    if (matchedHinglish.length >= 2) {
      detectedLang = 'Hinglish';
    }
  }

  // 2. Exact Match for Master Prompt Demo Complaint
  // "Sir, hostel ke bathroom mein paani nahi aa raha hai aur students ko bahut problem ho rahi hai."
  // or "Sir, hostel ke washroom mein paani nahi aa raha hai."
  if (
    (lower.includes('hostel') && (lower.includes('paani') || lower.includes('pani') || lower.includes('water')) && (lower.includes('washroom') || lower.includes('bathroom')))
  ) {
    return {
      originalLanguage: detectedLang === 'English' ? 'Hinglish' : detectedLang,
      translatedText: 'Water supply is unavailable in the hostel washroom and students are facing severe inconvenience.',
      category: 'Water Supply',
      recommendedDepartment: 'civil_maintenance',
      priority: 'high',
      summary: 'Hostel washroom water supply interruption reported.',
      recommendedAction: 'Assign maintenance staff and plumbing supervisor to inspect the overhead booster pump and supply line.',
      suggestedReply: 'Your complaint has been registered. The maintenance department has been notified. You can track your complaint using your ticket ID.',
      confidence: 94,
      isLiveAi: false,
      sentiment: 'urgent'
    };
  }

  // 3. Category, Department & Priority Detection Rules
  let category = 'General Facility Operations';
  let department: DepartmentId = 'civil_maintenance';
  let priority: Priority = 'medium';
  let translatedText = rawText;
  let summary = 'Campus facility issue reported.';
  let recommendedAction = 'Conduct on-site evaluation and resolve within department SLA.';
  let suggestedReply = 'Your complaint has been registered and forwarded to the relevant campus team.';
  let confidence = 92;

  // Electrical / Spark / Fire Hazard (CRITICAL)
  if (
    lower.includes('spark') ||
    lower.includes('shock') ||
    lower.includes('fire') ||
    lower.includes('burning wire') ||
    lower.includes('short circuit') ||
    lower.includes('smoke') ||
    lower.includes('current lag raha') ||
    lower.includes('hazard')
  ) {
    category = 'Electrical Safety Hazard';
    department = 'electrical';
    priority = 'critical';
    confidence = 98;
    translatedText = detectedLang !== 'English' 
      ? 'Critical electrical hazard reported with active sparking or burning odor. Immediate safety risk to students and faculty.' 
      : rawText;
    summary = 'Severe electrical hazard and arcing risk identified on premises.';
    recommendedAction = 'Immediately trip relevant sub-panel breaker, cordon off perimeter, and dispatch emergency response electrician.';
    suggestedReply = 'CRITICAL ALERT LOGGED: Electrical emergency team and campus safety marshals have been dispatched immediately.';
  }
  // General Electrical (Lights, Fans, Power cuts)
  else if (
    lower.includes('bijli') ||
    lower.includes('power cut') ||
    lower.includes('generator') ||
    lower.includes('light off') ||
    lower.includes('pankha') ||
    lower.includes('fan') ||
    lower.includes('switchboard') ||
    lower.includes('mcb') ||
    lower.includes('socket')
  ) {
    category = 'Electrical Maintenance';
    department = 'electrical';
    priority = 'medium';
    confidence = 94;
    translatedText = detectedLang !== 'English'
      ? 'Classroom/hostel electrical fittings, lighting fixtures or fans are non-functional.'
      : rawText;
    summary = 'Electrical fitting or power socket malfunctioning.';
    recommendedAction = 'Replace faulty capacitor/switch and verify line voltage.';
    suggestedReply = 'Your electrical service ticket has been routed to the Electrical Maintenance division.';
  }
  // Wi-Fi / IT Support
  else if (
    lower.includes('wi-fi') ||
    lower.includes('wifi') ||
    lower.includes('internet') ||
    lower.includes('router') ||
    lower.includes('network') ||
    lower.includes('dns') ||
    lower.includes('portal') ||
    lower.includes('erp') ||
    lower.includes('login') ||
    lower.includes('disconnect') ||
    lower.includes('slow speed')
  ) {
    category = 'IT & Campus Network';
    department = 'it_support';
    priority = lower.includes('lab') || lower.includes('exam') ? 'high' : 'medium';
    confidence = 95;
    translatedText = detectedLang !== 'English'
      ? 'Campus Wi-Fi connectivity interruption or network authentication failure.'
      : rawText;
    summary = 'Campus network connectivity instability reported.';
    recommendedAction = 'Inspect local access point DHCP lease pool and reboot PoE switch port.';
    suggestedReply = 'IT Support NOC has logged your ticket. Our network engineers will verify access point diagnostics.';
  }
  // AV / Projector / Classroom
  else if (
    lower.includes('projector') ||
    lower.includes('screen') ||
    lower.includes('hdmi') ||
    lower.includes('mic') ||
    lower.includes('speaker') ||
    lower.includes('smart board') ||
    lower.includes('lecture hall') ||
    lower.includes('podium') ||
    lower.includes('audio')
  ) {
    category = 'Classroom AV Equipment';
    department = 'academic_admin';
    priority = 'high';
    confidence = 96;
    translatedText = detectedLang !== 'English'
      ? 'Lecture hall presentation system or overhead projector is malfunctioning, interrupting instructional delivery.'
      : rawText;
    summary = 'Classroom audio-visual equipment malfunction in instructional area.';
    recommendedAction = 'Dispatch AV technician with replacement HDMI cables and projector lamp unit before next period.';
    suggestedReply = 'Academic Administration AV division has received your ticket. A technician has been prioritized.';
  }
  // Water / Plumbing / Sanitation
  else if (
    lower.includes('paani') ||
    lower.includes('water') ||
    lower.includes('leak') ||
    lower.includes('tank') ||
    lower.includes('cooler') ||
    lower.includes('flush') ||
    lower.includes('drain') ||
    lower.includes('pipe') ||
    lower.includes('tap') ||
    lower.includes('plumber')
  ) {
    category = 'Water Supply & Plumbing';
    department = lower.includes('hostel') ? 'hostel_management' : 'civil_maintenance';
    priority = 'high';
    confidence = 95;
    translatedText = detectedLang !== 'English'
      ? 'Water supply interruption or active pipeline leakage causing inconvenience.'
      : rawText;
    summary = 'Plumbing breakdown or water shortage affecting daily operations.';
    recommendedAction = 'Isolate leaking branch line or trigger secondary pump to restore pressurized water supply.';
    suggestedReply = 'Your water service complaint has been assigned to Civil Maintenance & Hostel Ops.';
  }
  // Library
  else if (
    lower.includes('library') ||
    lower.includes('book') ||
    lower.includes('rfid') ||
    lower.includes('reading room') ||
    lower.includes('journal')
  ) {
    category = 'Library Services';
    department = 'library';
    priority = 'medium';
    confidence = 93;
    translatedText = detectedLang !== 'English'
      ? 'Library facilities, self-issue kiosk or reading room services encountered an issue.'
      : rawText;
    summary = 'Library infrastructure or catalog service issue.';
    recommendedAction = 'Perform maintenance on library kiosk and notify digital resource manager.';
    suggestedReply = 'Central Library desk has logged your request and will address it promptly.';
  }
  // Housekeeping & Hygiene
  else if (
    lower.includes('clean') ||
    lower.includes('garbage') ||
    lower.includes('kachra') ||
    lower.includes('smell') ||
    lower.includes('dustbin') ||
    lower.includes('corridor') ||
    lower.includes('pest') ||
    lower.includes('mosquito')
  ) {
    category = 'Housekeeping & Sanitation';
    department = 'housekeeping';
    priority = 'medium';
    confidence = 92;
    translatedText = detectedLang !== 'English'
      ? 'Sanitation and cleanliness attention required in specified campus zone.'
      : rawText;
    summary = 'Hygiene or debris clearing required in campus premises.';
    recommendedAction = 'Deploy custodial housekeeping crew for immediate deep cleaning and sanitization.';
    suggestedReply = 'Housekeeping supervisor has received the cleanup request.';
  }
  // Security
  else if (
    lower.includes('security') ||
    lower.includes('theft') ||
    lower.includes('stolen') ||
    lower.includes('gate') ||
    lower.includes('cctv') ||
    lower.includes('trespass') ||
    lower.includes('lost')
  ) {
    category = 'Security & Campus Safety';
    department = 'security';
    priority = 'high';
    confidence = 95;
    translatedText = detectedLang !== 'English'
      ? 'Campus security or lost property concern reported.'
      : rawText;
    summary = 'Campus security notification requiring verification.';
    recommendedAction = 'Review CCTV camera archives and deploy security patrol guards to location.';
    suggestedReply = 'Chief Security Officer notified. Campus vigilance patrol has been deployed.';
  }
  // Transport
  else if (
    lower.includes('bus') ||
    lower.includes('shuttle') ||
    lower.includes('transport') ||
    lower.includes('driver') ||
    lower.includes('route')
  ) {
    category = 'Campus Transport';
    department = 'transport';
    priority = 'medium';
    confidence = 93;
    translatedText = detectedLang !== 'English'
      ? 'Campus shuttle transit delay or route operational problem reported.'
      : rawText;
    summary = 'Campus transport schedule or vehicle operational disruption.';
    recommendedAction = 'Coordinate with route supervisor and dispatch reserve campus feeder shuttle.';
    suggestedReply = 'Transport logistics desk notified. Shuttle coordination underway.';
  }

  // Handle generic English text translation
  if (detectedLang === 'English') {
    translatedText = rawText;
  }

  return {
    originalLanguage: detectedLang,
    translatedText,
    category,
    recommendedDepartment: department,
    priority,
    summary,
    recommendedAction,
    suggestedReply,
    confidence,
    isLiveAi: false,
    sentiment: priority === 'critical' ? 'urgent' : priority === 'high' ? 'frustrated' : 'neutral'
  };
}
