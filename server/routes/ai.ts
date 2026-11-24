import { Router, Request, Response } from 'express';
import { analyzeComplaintWithGemini, generateDailyCampusReport } from '../services/gemini';
import { analyzeComplaintWithHeuristics } from '../services/aiHeuristics';
import { storage } from '../services/storage';

const router = Router();

// Check AI Engine Status
router.get('/status', (req: Request, res: Response) => {
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '');
  res.json({
    success: true,
    hasGeminiKey,
    activeEngine: hasGeminiKey ? 'Google Gemini 1.5/2.5 Flash' : 'CampusSaathi Heuristic AI (Hackathon Demo Mode)',
    model: hasGeminiKey ? (process.env.GEMINI_MODEL || 'gemini-1.5-flash') : 'demo-deterministic-nlp'
  });
});

// POST Analyze Complaint
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { text, imageBase64, imageMimeType, languageHint, forceDemo } = req.body;

    if (!text && !imageBase64) {
      return res.status(400).json({ success: false, message: 'Text or image is required for AI analysis' });
    }

    let analysis;
    if (forceDemo || !process.env.GEMINI_API_KEY) {
      analysis = analyzeComplaintWithHeuristics({
        text: text || 'Campus facility inspection required',
        languageHint,
        hasImage: !!imageBase64
      });
    } else {
      analysis = await analyzeComplaintWithGemini({
        text: text || 'Campus facility inspection required',
        imageBase64,
        imageMimeType,
        languageHint
      });
    }

    // Return the stages so the client can animate the steps realistically
    const stages = [
      { step: 1, label: 'Understanding complaint', status: 'completed' },
      { step: 2, label: `Detecting language (${analysis.originalLanguage})`, status: 'completed' },
      { step: 3, label: `Classifying issue (${analysis.category})`, status: 'completed' },
      { step: 4, label: `Assigning department (${analysis.recommendedDepartment.replace('_', ' ')})`, status: 'completed' },
      { step: 5, label: `Setting priority (${analysis.priority.toUpperCase()})`, status: 'completed' },
      { step: 6, label: 'Generating ticket recommendation & student response', status: 'completed' }
    ];

    res.json({
      success: true,
      data: analysis,
      stages
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST Audio Speech-to-text / Audio interpretation
router.post('/speech-to-text', async (req: Request, res: Response) => {
  try {
    const { audioData, languageHint = 'Hindi' } = req.body;
    
    // In browser Web Speech API provides real-time client-side STT.
    // This backend route handles raw base64 audio when Web Speech is unsupported
    // Defaulting to the quintessential Hindi hackathon demonstration audio transcript
    let transcript = 'Sir, hostel ke washroom mein paani nahi aa raha hai aur students ko bahut problem ho rahi hai.';
    if (languageHint === 'English') {
      transcript = 'Water supply is unavailable in the hostel washroom and students are facing severe inconvenience.';
    }

    res.json({
      success: true,
      transcript,
      detectedLanguage: languageHint
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET AI Operational Insights
router.get('/insights', (req: Request, res: Response) => {
  try {
    const insights = storage.getInsights();
    res.json({ success: true, data: insights });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST Generate AI Daily Campus Report
router.post('/daily-report', async (req: Request, res: Response) => {
  try {
    const tickets = storage.getTickets();
    const report = await generateDailyCampusReport(tickets);
    storage.saveReport(report);
    res.json({ success: true, data: report });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET Historical Daily Reports
router.get('/daily-reports', (req: Request, res: Response) => {
  try {
    const reports = storage.getReports();
    res.json({ success: true, data: reports });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
