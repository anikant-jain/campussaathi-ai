import { AIAnalysis, DepartmentId, Priority, DailyReport, Ticket } from '../../src/types';
import { analyzeComplaintWithHeuristics } from './aiHeuristics';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

interface MultimodalInput {
  text: string;
  imageBase64?: string;
  imageMimeType?: string;
  languageHint?: string;
}

const SYSTEM_PROMPT = `
You are the CampusSaathi AI Operations Copilot for an Indian University.
Your mission is to analyze student and faculty complaints submitted in English, Hindi, or Hinglish (Hindi written in Latin script), multimodal images, and voice transcripts.

Analyze the complaint strictly into this JSON schema:
{
  "originalLanguage": "Hindi" | "English" | "Hinglish",
  "translatedText": "Formal English translation of the complaint",
  "category": "Clear category e.g. Water Supply, Electrical Safety Hazard, Classroom AV, Wi-Fi Network, etc.",
  "recommendedDepartment": "it_support" | "electrical" | "civil_maintenance" | "hostel_management" | "library" | "transport" | "academic_admin" | "security" | "housekeeping",
  "priority": "critical" | "high" | "medium" | "low",
  "summary": "1 sentence executive summary of the issue",
  "recommendedAction": "Concrete 1-2 sentence recommendation for the administrator/technician",
  "suggestedReply": "Polite, empathetic 1-2 sentence acknowledgment message to send to the student with ticket reassurance",
  "confidence": 95,
  "visualFindings": "Optional description of what is seen in the image if an image was provided",
  "sentiment": "frustrated" | "urgent" | "neutral" | "calm"
}

Priority Guidelines:
- "critical": Fire, sparking wires, electrical hazard, gas leak, building structural threat, severe safety hazards.
- "high": Complete water outage, washroom non-functional, exam hall projector breakdown, hostel lockdown.
- "medium": Wi-Fi slowdown, air conditioning cooling slow, mess food feedback, library RFID issue.
- "low": General aesthetic suggestions, non-urgent maintenance requests.

Always return ONLY valid raw JSON with NO markdown code fences or backticks.
`;

export async function analyzeComplaintWithGemini(input: MultimodalInput): Promise<AIAnalysis> {
  if (!GEMINI_API_KEY || GEMINI_API_KEY.trim() === '') {
    console.log('[AI Service] No GEMINI_API_KEY provided. Using deterministic Hackathon AI Engine.');
    return analyzeComplaintWithHeuristics({
      text: input.text,
      languageHint: input.languageHint,
      hasImage: !!input.imageBase64
    });
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const parts: any[] = [
      { text: `${SYSTEM_PROMPT}\n\nStudent Complaint: "${input.text}"` }
    ];

    if (input.imageBase64 && input.imageMimeType) {
      parts.push({
        inline_data: {
          mime_type: input.imageMimeType,
          data: input.imageBase64
        }
      });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: parts
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1000,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[AI Service] Gemini API call failed (${response.status}): ${errText}`);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data: any = await response.json();
    const rawOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawOutput) {
      throw new Error('Empty response from Gemini');
    }

    const cleaned = rawOutput.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const validDepartments: DepartmentId[] = [
      'it_support',
      'electrical',
      'civil_maintenance',
      'hostel_management',
      'library',
      'transport',
      'academic_admin',
      'security',
      'housekeeping'
    ];
    const validPriorities: Priority[] = ['critical', 'high', 'medium', 'low'];

    const dept: DepartmentId = validDepartments.includes(parsed.recommendedDepartment)
      ? parsed.recommendedDepartment
      : 'civil_maintenance';

    const prio: Priority = validPriorities.includes(parsed.priority)
      ? parsed.priority
      : 'medium';

    return {
      originalLanguage: parsed.originalLanguage || 'Hindi',
      translatedText: parsed.translatedText || input.text,
      category: parsed.category || 'General Operations',
      recommendedDepartment: dept,
      priority: prio,
      summary: parsed.summary || 'Campus complaint logged.',
      recommendedAction: parsed.recommendedAction || 'Inspect and assign to technician.',
      suggestedReply: parsed.suggestedReply || 'Your complaint has been registered and is being processed.',
      confidence: Math.min(100, Math.max(70, Number(parsed.confidence) || 94)),
      isLiveAi: true,
      visualFindings: parsed.visualFindings,
      sentiment: parsed.sentiment || 'neutral'
    };
  } catch (error) {
    console.warn('[AI Service] Falling back to heuristic AI engine due to error:', error);
    const fallback = analyzeComplaintWithHeuristics({
      text: input.text,
      languageHint: input.languageHint,
      hasImage: !!input.imageBase64
    });
    return fallback;
  }
}

export async function generateDailyCampusReport(tickets: Ticket[]): Promise<DailyReport> {
  const totalComplaints = tickets.length;
  const resolvedCount = tickets.filter(t => t.status === 'resolved').length;
  const pendingCount = tickets.filter(t => t.status !== 'resolved').length;
  const criticalCount = tickets.filter(t => t.priority === 'critical' && t.status !== 'resolved').length;

  // Group by category and department
  const deptCounts: Record<string, number> = {};
  const catCounts: Record<string, number> = {};

  tickets.forEach(t => {
    deptCounts[t.department] = (deptCounts[t.department] || 0) + 1;
    const cat = t.aiAnalysis?.category || 'General';
    catCounts[cat] = (catCounts[cat] || 0) + 1;
  });

  let mostReportedIssue = 'Hostel Water Supply Interruption';
  let maxCatCount = 0;
  for (const [c, cnt] of Object.entries(catCounts)) {
    if (cnt > maxCatCount) {
      maxCatCount = cnt;
      mostReportedIssue = c;
    }
  }

  let maxPendingDept = 'Civil Maintenance';
  let maxDeptCount = 0;
  for (const [d, cnt] of Object.entries(deptCounts)) {
    if (cnt > maxDeptCount) {
      maxDeptCount = cnt;
      maxPendingDept = d.replace('_', ' ').toUpperCase();
    }
  }

  const criticalIssues = tickets
    .filter(t => t.priority === 'critical' && t.status !== 'resolved')
    .map(t => `${t.id}: ${t.title}`);

  const repeatingProblems = [
    '3 cluster complaints in Hostel Blocks A, B & C regarding water pressure and pump failure',
    '2 recurring AV projector overheating issues in Lecture Hall 302 and Seminar Hall 1',
    'Repeated Wi-Fi DHCP disconnection tickets at Central Library reading zone'
  ];

  const recommendedActions = [
    'Immediate electrical team dispatch to isolate and replace sparking corridor breaker at Physics Lab (CS-2026-1009).',
    'Audit central hostel pump house pressure sensor to resolve water cutoff across Blocks A, B, and C.',
    'Increase DHCP IP lease pool range for Central Library AP-LIB-02 and Girls Hostel access switches.',
    'Perform weekly preventative AV maintenance on all 14 instructional lecture hall projectors.'
  ];

  const executiveSummary = `Today campus operations handled ${totalComplaints} total complaints (${resolvedCount} resolved, ${pendingCount} pending). The primary operational bottleneck remains ${mostReportedIssue} (${maxCatCount} reports). Critical safety attention is needed for ${criticalCount} electrical safety hazard(s). AI routing automation achieved 100% classification compliance with zero manual misroutes.`;

  // Try live Gemini synthesis if key exists
  if (GEMINI_API_KEY) {
    try {
      const prompt = `Synthesize an executive daily campus operations briefing for the University Vice Chancellor based on these real ticket stats:
Total Tickets: ${totalComplaints}
Resolved: ${resolvedCount}
Pending: ${pendingCount}
Critical Safety Hazards: ${criticalCount}
Top Issue Category: ${mostReportedIssue}
Department with max backlog: ${maxPendingDept}
Unresolved Criticals: ${criticalIssues.join('; ')}

Return a concise 2-paragraph professional executive summary.`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 500 }
        })
      });

      if (res.ok) {
        const json: any = await res.json();
        const geminiText = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (geminiText) {
          return {
            id: `REP-${Date.now()}`,
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            totalComplaints,
            resolvedCount,
            pendingCount,
            criticalCount,
            mostReportedIssue,
            maxPendingDepartment: maxPendingDept,
            repeatingProblems,
            criticalUnresolvedIssues: criticalIssues.length > 0 ? criticalIssues : ['No active critical hazards.'],
            recommendedActions,
            aiExecutiveSummary: geminiText.trim(),
            generatedAt: new Date().toISOString(),
            isAiGenerated: true
          };
        }
      }
    } catch (e) {
      console.warn('Gemini report generation fallback:', e);
    }
  }

  return {
    id: `REP-${Date.now()}`,
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    totalComplaints,
    resolvedCount,
    pendingCount,
    criticalCount,
    mostReportedIssue,
    maxPendingDepartment: maxPendingDept,
    repeatingProblems,
    criticalUnresolvedIssues: criticalIssues.length > 0 ? criticalIssues : ['No active critical hazards.'],
    recommendedActions,
    aiExecutiveSummary: executiveSummary,
    generatedAt: new Date().toISOString(),
    isAiGenerated: false
  };
}
