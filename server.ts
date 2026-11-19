import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_CATEGORIES = [
  'Electrical',
  'Plumbing',
  'Internet / Wi-Fi',
  'Furniture',
  'Cleaning',
  'Laboratory Equipment',
  'Infrastructure',
  'Safety',
  'Other',
] as const;

const ALLOWED_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'] as const;

const ALLOWED_DEPARTMENTS = [
  'Electrical Maintenance',
  'Plumbing & Water Systems',
  'Campus IT & Networking',
  'General Facilities & Carpentry',
  'Campus Safety & Compliance',
  'Custodial & Sanitation Services',
  'Laboratory Engineering Support',
  'Building Infrastructure & HVAC',
] as const;

let cachedAiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured on the server. Add it in Settings > Secrets.'
    );
  }
  if (!cachedAiClient) {
    cachedAiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return cachedAiClient;
}

async function withRetry<T>(fn: () => Promise<T>, retries = 1): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('400') || msg.includes('403') || msg.includes('404')) {
        throw err;
      }
      if (i < retries) {
        await new Promise((r) => setTimeout(r, 250 * Math.pow(2, i)));
      }
    }
  }
  throw lastError;
}

function formatApiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('GEMINI_API_KEY is not configured')) {
    return { status: 503, message: raw };
  }
  if (raw.includes('API_KEY_INVALID') || raw.includes('400')) {
    return {
      status: 400,
      message: 'Invalid AI request or API key. Check GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (raw.includes('PERMISSION_DENIED') || raw.includes('403')) {
    return {
      status: 403,
      message: 'AI service permission denied. Verify GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      message: 'AI service quota temporarily reached. Please retry shortly.',
    };
  }
  return {
    status: 502,
    message: raw || 'AI analysis service is temporarily unavailable.',
  };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '15mb' }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'unifix', timestamp: new Date().toISOString() });
  });

  // Feature 1-5: Fast, High-Accuracy Multimodal Issue Analysis, Priority Detection, Description Polish & Duplicate Check
  app.post('/api/ai/analyze-issue', async (req, res) => {
    try {
      const {
        title = '',
        description = '',
        category = '',
        building = '',
        roomNumber = '',
        imageBase64,
        imageMimeType,
        existingReportsSummary = [],
      } = req.body ?? {};

      if (!String(title).trim() && !String(description).trim() && !imageBase64) {
        return res.status(400).json({
          error: 'Provide an issue title, description, or image for UniFix AI analysis.',
        });
      }

      const ai = getGeminiClient();

      const normalizedBuilding = String(building || '').trim().toLowerCase();
      const candidateReports = Array.isArray(existingReportsSummary)
        ? [...existingReportsSummary]
            .filter((r) => r && r.status !== 'Resolved')
            .sort((a, b) => {
              const aSameBld =
                normalizedBuilding &&
                String(a.building || '').toLowerCase().includes(normalizedBuilding)
                  ? 1
                  : 0;
              const bSameBld =
                normalizedBuilding &&
                String(b.building || '').toLowerCase().includes(normalizedBuilding)
                  ? 1
                  : 0;
              return bSameBld - aSameBld;
            })
            .slice(0, 12)
        : [];

      const existingListText =
        candidateReports.length > 0
          ? candidateReports
              .map(
                (r: {
                  reportId?: string;
                  title?: string;
                  category?: string;
                  building?: string;
                  location?: string;
                  status?: string;
                }) =>
                  `- [${r.reportId || 'Unknown'}] "${String(r.title || '').slice(0, 100)}" | Category: ${r.category || 'Other'} | Location: ${r.location || r.building || 'Unknown'} | Status: ${r.status || 'Pending'}`
              )
              .join('\n')
          : 'No open candidate reports provided.';

      const systemInstruction = `You are UniFix AI, an expert university facilities triage engineer.
Analyze the submitted issue (text and optional photograph) and return strictly valid JSON matching the schema.

1. CATEGORY CLASSIFICATION RUBRIC (choose the SINGLE best fit):
- "Electrical": Lighting fixtures, flickering/dead bulbs, tripped breakers, outlets, AC/fan power, projector power, burning electrical smell without immediate structural fire.
- "Plumbing": Pipe leaks, clogged sinks/toilets/drains, water pooling, low water pressure, ceiling water seepage, leaking taps/valves.
- "Internet / Wi-Fi": Campus Wi-Fi/eduroam drops, dead Ethernet jacks, slow/unstable AP connectivity, DNS timeouts.
- "Furniture": Broken chairs, desks, tables, whiteboards, cabinet hinges, door handles/locks, window latches.
- "Cleaning": Trash overflow, spills, sanitation/restroom cleanliness, pest sightings, foul odor (non-electrical/non-gas).
- "Laboratory Equipment": Lab fume hoods, gas/vacuum bench valves, microscopes, oscilloscopes, biosafety cabinets, lab instruments.
- "Infrastructure": Structural cracks, ceiling tiles falling, stair treads, handrails, flooring damage, HVAC airflow/temperature, elevator faults.
- "Safety": IMMEDIATE physical/life hazards — exposed live wires, sparks/smoke, gas/chemical odor, blocked fire exits, flooding near electrical outlets, shattered glass on walkways, slippery unbarricaded stairwells. Escalate to "Safety" whenever active danger exists.
- "Other": Only if none of the above fit.

2. PRIORITY CALIBRATION RUBRIC (advisory for human triage):
- "Urgent": Immediate life/safety hazard (fire/smoke/sparks, exposed live conductor, gas/chemical leak, water near electrical panels, blocked emergency egress, security breach on exterior door, or critical whole-building outage).
- "High": Active facility damage or wide disruption (active water leak, HVAC/cooling failure in labs/servers, broken classroom lock, disabled lab fume hood, unusable restroom block).
- "Medium": Localized functional failure affecting a single fixture or partial zone without immediate hazard (flickering single tube, single broken chair, intermittent Wi-Fi in one study wing, slow drain).
- "Low": Minor cosmetic wear or non-blocking inconvenience (scuffed paint, squeaky hinge, minor stain).
Be concise and cite the specific risk factor in "priorityReason".

3. DEPARTMENT ROUTING:
Choose the most accurate team from: ${ALLOWED_DEPARTMENTS.join(', ')}.

4. MULTIMODAL PHOTOGRAPH RULES:
- Base "visualFindings" strictly on what is visibly observable in the image (damage, moisture, scorch marks, loose components, cable state, illumination).
- Cross-check the photo against the student's text. Never invent hidden internal causes.
- If no photo is provided, state "No photograph attached; assessment based on text description." and set "imageUnclear": false.
- If a photo IS provided but is blurry, dark, obstructed, or unrelated to the text, set "imageUnclear": true, "needsHumanReview": true, and state clearly why it is inconclusive.

5. DESCRIPTION POLISH:
Rewrite the student's notes into 1–3 crisp, factual sentences in "description" suitable for a maintenance work order. Preserve every real detail (location, symptoms, duration); NEVER invent facts.

6. DUPLICATE DETECTION:
Compare against the open candidate reports list. Set "potentialDuplicate.isPotentialDuplicate": true ONLY if BOTH the location (same building/room/area) AND root issue closely match an open ticket. Never recommend auto-closing; defer to human verification.

7. CONFIDENCE & REVIEW:
- "High": Clear symptom + clear location (and photo corroborates if attached).
- "Medium": Some ambiguity in scope, severity, or missing room details.
- "Low": Very vague text or unclear/contradictory photo (always set "needsHumanReview": true).

8. MULTILINGUAL INPUTS (ENGLISH, SINHALA & SINGLISH):
Student titles and descriptions may be written in English, Sinhala Unicode (සිංහල), or Singlish (Romanized Sinhala such as "light eka flicker wenawa", "fan eka wada na", "vathura leak wenawa"). Interpret their meaning accurately, translate/summarize cleanly into crisp work-order English for "summary", "description", "priorityReason", and "recommendation" while preserving every factual detail (room numbers, symptoms, hazards), and always output exact schema enum values for "category", "priority", and "department".`;

      const promptText = `Campus Maintenance Submission:
- Title: ${String(title).slice(0, 200)}
- Student Pre-selected Category: ${String(category || 'Not selected').slice(0, 80)}
- Building: ${String(building || 'Not specified').slice(0, 120)}
- Room / Specific Spot: ${String(roomNumber || 'Not specified').slice(0, 80)}
- Student Description: ${String(description).slice(0, 2000)}

Open Campus Reports for Duplicate Screening:
${existingListText}`;

      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
      if (imageBase64 && typeof imageBase64 === 'string' && imageMimeType && typeof imageMimeType === 'string') {
        const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
        parts.push({
          inlineData: {
            mimeType: imageMimeType,
            data: cleanBase64,
          },
        });
      }
      parts.push({ text: promptText });

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: { parts },
          config: {
            systemInstruction,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                category: {
                  type: Type.STRING,
                  enum: [...ALLOWED_CATEGORIES],
                  description: 'Exact matching category from the campus taxonomy.',
                },
                priority: {
                  type: Type.STRING,
                  enum: [...ALLOWED_PRIORITIES],
                  description: 'Calibrated advisory priority level.',
                },
                priorityReason: {
                  type: Type.STRING,
                  description: '1 concise sentence justifying the priority based on safety/disruption.',
                },
                summary: {
                  type: Type.STRING,
                  description: '1 crisp factual sentence summarizing the problem.',
                },
                description: {
                  type: Type.STRING,
                  description: '1-3 concise, work-order-ready sentences preserving original facts.',
                },
                department: {
                  type: Type.STRING,
                  enum: [...ALLOWED_DEPARTMENTS],
                  description: 'Best matching campus maintenance department.',
                },
                recommendation: {
                  type: Type.STRING,
                  description: '1-2 actionable inspection or safety next steps for the crew.',
                },
                visualFindings: {
                  type: Type.STRING,
                  description: 'Factual visual observations from the photo, or note that no photo was attached.',
                },
                imageUnclear: {
                  type: Type.BOOLEAN,
                  description: 'True only if an attached photo is blurry, dark, or irrelevant.',
                },
                confidence: {
                  type: Type.STRING,
                  enum: ['High', 'Medium', 'Low'],
                  description: 'Assessment confidence level.',
                },
                needsHumanReview: {
                  type: Type.BOOLEAN,
                  description: 'True if urgent safety risk, unclear photo, duplicate, or ambiguous info.',
                },
                potentialDuplicate: {
                  type: Type.OBJECT,
                  properties: {
                    isPotentialDuplicate: { type: Type.BOOLEAN },
                    matchedReportId: { type: Type.STRING },
                    reason: { type: Type.STRING },
                  },
                  required: ['isPotentialDuplicate', 'matchedReportId', 'reason'],
                },
              },
              required: [
                'category',
                'priority',
                'priorityReason',
                'summary',
                'description',
                'department',
                'recommendation',
                'visualFindings',
                'imageUnclear',
                'confidence',
                'needsHumanReview',
                'potentialDuplicate',
              ],
            },
          },
        })
      );

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText);

      const validated = {
        category: ALLOWED_CATEGORIES.includes(parsed.category) ? parsed.category : 'Other',
        priority: ALLOWED_PRIORITIES.includes(parsed.priority) ? parsed.priority : 'Medium',
        priorityReason: String(parsed.priorityReason || 'Advisory priority based on reported impact.').slice(0, 400),
        summary: String(parsed.summary || title || 'Campus maintenance issue reported.').slice(0, 300),
        description: String(parsed.description || description || title).slice(0, 3000),
        department: String(parsed.department || 'General Facilities & Carpentry').slice(0, 120),
        recommendation: String(parsed.recommendation || 'Schedule facilities inspection.').slice(0, 500),
        visualFindings: String(
          parsed.visualFindings ||
            (imageBase64
              ? 'Photograph analyzed.'
              : 'No photograph attached; assessment based on text description.')
        ).slice(0, 500),
        imageUnclear: Boolean(parsed.imageUnclear),
        confidence: ['High', 'Medium', 'Low'].includes(parsed.confidence) ? parsed.confidence : 'Medium',
        needsHumanReview: Boolean(parsed.needsHumanReview ?? false),
        potentialDuplicate: {
          isPotentialDuplicate: Boolean(parsed.potentialDuplicate?.isPotentialDuplicate),
          matchedReportId: String(parsed.potentialDuplicate?.matchedReportId || '').slice(0, 64),
          reason: String(parsed.potentialDuplicate?.reason || '').slice(0, 300),
        },
        analyzedAt: new Date().toISOString(),
      };

      return res.json(validated);
    } catch (err) {
      const { status, message } = formatApiError(err);
      return res.status(status).json({ error: message });
    }
  });

  // Feature 6: Fast Multilingual UniFix AI Assistant Chatbot (English, Sinhala, Singlish)
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const { message, history = [], userRole = 'student', language = 'auto' } = req.body ?? {};
      if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ error: 'Message is required.' });
      }

      const normalizedLang: 'auto' | 'english' | 'sinhala' | 'singlish' =
        language === 'sinhala' || language === 'singlish' || language === 'english'
          ? language
          : 'auto';

      const languageGuidance =
        normalizedLang === 'sinhala'
          ? `LANGUAGE REQUIREMENT (SINHALA UNICODE):
- You MUST reply in natural, polite, grammatically accurate Sinhala Unicode (සිංහල අකුරු).
- Keep exact UniFix interface labels, categories, and status names clear so the user can find them in the app (e.g., "Report an Issue", "My Reports", "Electrical", "Plumbing", "Pending", "Under Review", "In Progress", "Resolved").`
          : normalizedLang === 'singlish'
            ? `LANGUAGE REQUIREMENT (SINGLISH - ROMANIZED SINHALA):
- You MUST reply in natural, friendly Sri Lankan campus Singlish (Sinhala written in English letters, mixed smoothly with English campus/technical terms).
- Example Singlish tone: "Meka 'Electrical' category ekata danna puluwan. Oya 'Report an Issue' page ekata gihin, building/room eka select karala, photo ekakuth upload karala submit karanna."
- Always keep exact UniFix UI labels ("Report an Issue", "My Reports", "Electrical", "Plumbing", "Pending", "Under Review", "In Progress", "Resolved") recognizable so the user can navigate the app easily.`
            : normalizedLang === 'english'
              ? `LANGUAGE REQUIREMENT (ENGLISH):
- Reply in clear, concise, friendly English.`
              : `LANGUAGE REQUIREMENT (AUTO-DETECT ENGLISH, SINHALA & SINGLISH):
- Understand English, Sinhala Unicode (සිංහල අකුරු), and Singlish (Romanized Sinhala / Sinhala-English mix such as "eka", "mokakda", "kohomada", "wada na", "hadanna", "danna", "thiyenawa", "mage", "kaduwela") fluently.
- AUTOMATICALLY MIRROR THE USER'S LANGUAGE AND SCRIPT:
  * If the user writes in Sinhala Unicode (සිංහල) -> reply in natural, clear Sinhala Unicode (සිංහල), keeping UniFix UI labels ("Report an Issue", "My Reports", category & status names) clear.
  * If the user writes in Singlish (Romanized Sinhala) -> reply in natural, friendly Sri Lankan campus Singlish (e.g., "Meka 'Electrical' category ekata danna puluwan. Oya 'Report an Issue' ekata gihin photo ekakuth ekka submit karanna.").
  * If the user writes in English -> reply in clear, concise English.
- If the user explicitly asks to switch language in their message (e.g., "Sinhalen kiyanna" or "Singlish walin kiyanna" or "in English"), follow their explicit request.`;

      const ai = getGeminiClient();

      const systemInstruction = `You are the UniFix AI Assistant for a university smart campus issue reporting platform.
Your role:
- Help students and staff understand how to report campus maintenance and safety issues.
- Help users select the best issue category from: ${ALLOWED_CATEGORIES.join(', ')}.
- Explain UniFix report statuses clearly:
  1. Pending: Submitted and awaiting initial facilities triage.
  2. Under Review: Assigned or being evaluated by campus administrators.
  3. In Progress: Maintenance technician or department is actively working on resolution.
  4. Resolved: Issue has been addressed and closed.
- Explain how priority levels (Low, Medium, High, Urgent) work as advisory triage indicators.
- Keep responses concise, helpful, and structured with clear bullet points when helpful.

${languageGuidance}

CRITICAL PRIVACY & ACCURACY GUARDRAILS:
- NEVER invent, guess, or fabricate specific report statuses, ticket numbers, or resolution dates.
- Explain that users can check their real-time report status under "My Reports" in their dashboard.
- NEVER claim access to another student's private reports or personal information.
- Current user role context: ${userRole}.`;

      const formattedHistory = Array.isArray(history)
        ? history
            .slice(-10)
            .filter((m: { role?: string; text?: string }) => m && typeof m.text === 'string' && m.text.trim())
            .map((m: { role?: string; text?: string }) => ({
              role: m.role === 'model' ? 'model' : 'user',
              parts: [{ text: String(m.text).slice(0, 2000) }],
            }))
        : [];

      const contents = [
        ...formattedHistory,
        { role: 'user', parts: [{ text: message.slice(0, 2000) }] },
      ];

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents,
          config: {
            systemInstruction,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        })
      );

      return res.json({
        reply: response.text || 'I could not generate a response right now. Please try again.',
      });
    } catch (err) {
      const { status, message } = formatApiError(err);
      return res.status(status).json({ error: message });
    }
  });

  // Feature 7: UniFix AI Intelligence (Admin AI Observations grounded strictly in verified stats)
  app.post('/api/ai/intelligence', async (req, res) => {
    try {
      const { stats } = req.body ?? {};
      if (!stats || typeof stats !== 'object') {
        return res.status(400).json({ error: 'Aggregated Firestore statistics are required.' });
      }

      const ai = getGeminiClient();

      const systemInstruction = `You are UniFix AI Intelligence, an analytical advisor for university campus facilities administrators.
You receive VERIFIED aggregated statistics computed directly from the campus Firestore database.
Strict integrity rules:
1. NEVER fabricate, extrapolate, or invent numbers, buildings, or incidents that are not present in the provided statistics.
2. Distinguish clearly that your output consists of AI-generated operational observations and recommendations based solely on the provided verified figures.
3. If totalReports is 0, clearly state that there are no recorded incidents yet and provide constructive readiness guidance.
4. Keep observations concrete, executive-ready, and focused on maintenance prioritization and recurring location patterns.`;

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: `Generate executive UniFix AI Intelligence observations from these verified Firestore statistics:\n${JSON.stringify(stats, null, 2)}`,
          config: {
            systemInstruction,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                executiveSummary: {
                  type: Type.STRING,
                  description: '2-3 sentence summary strictly grounded in the provided numbers.',
                },
                observations: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      detail: { type: Type.STRING },
                      focusArea: { type: Type.STRING },
                    },
                    required: ['title', 'detail', 'focusArea'],
                  },
                },
                recommendedActions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ['executiveSummary', 'observations', 'recommendedActions'],
            },
          },
        })
      );

      const parsed = JSON.parse((response.text ?? '{}').trim());
      return res.json({
        executiveSummary: String(parsed.executiveSummary || ''),
        observations: Array.isArray(parsed.observations) ? parsed.observations.slice(0, 6) : [],
        recommendedActions: Array.isArray(parsed.recommendedActions)
          ? parsed.recommendedActions.slice(0, 5)
          : [],
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      const { status, message } = formatApiError(err);
      return res.status(status).json({ error: message });
    }
  });

  // Vite middleware in development; static serving in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Production build not found. Run npm run build.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`UniFix server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start UniFix server:', err);
  process.exit(1);
});
