const express = require("express");
const cors = require("cors");
const Groq = require("groq-sdk");
const db = require("./firebaseAdmin");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: "*"
}));
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Health ──────────────────────────────────────────────
app.get("/", (req, res) => res.send("🚀 Ujima AI Backend running"));

// ── SCOUT AGENT ─────────────────────────────────────────
app.post("/api/scout", async (req, res) => {
  try {
    const { occupation, monthlyIncome, harvestSeason, goal } = req.body;

    const prompt = `You are a friendly financial literacy coach for SACCO members in Kenya.
Speak like a supportive community elder — warm, never condescending.
NEVER use words like "rejected", "denied", or "high risk user".

Member profile:
- Occupation: ${occupation}
- Monthly Income: KES ${monthlyIncome}
- Harvest Season: ${harvestSeason || "not specified"}
- Financial Goal: ${goal}

Respond in this EXACT JSON format (no markdown, no extra text):
{
  "savingsAdvice": "2-3 sentence practical savings tip grounded in their occupation",
  "harvestTip": "1-2 sentences about timing finances around harvest or income cycles",
  "incomeWarning": "1 sentence — only if income seems unstable, otherwise say 'Income pattern looks manageable'",
  "encouragement": "1 warm motivational sentence in community tone",
  "readinessScore": <number 0-100>,
  "readinessLabel": "one of: Strong Foundation | Building Steadily | Needs Preparation"
}`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const raw = completion.choices[0].message.content;
    let json;

    try {
      json = JSON.parse(raw.replace(/```json|```/g, "").trim());
    } catch (e) {
    console.error("JSON parse failed:", e.message);
    json = { raw };
    }

      await db.collection("scout_sessions").add({
      occupation, monthlyIncome, harvestSeason, goal,
      response: json,
      timestamp: new Date()
    });

    res.json({ success: true, data: json });
  } catch (err) {
    console.error("Scout error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GUARDIAN AGENT ───────────────────────────────────────
app.post("/api/guardian", async (req, res) => {
  try {
    const { income, loanAmount, dependents, occupation, businessType, incomeType } = req.body;

    const prompt = `You are an ethical SACCO loan triage officer in Kenya.
NEVER use "rejected", "denied", or "unreliable". Use dignified, actionable language.

Applicant:
- Occupation: ${occupation}
- Income Type: ${incomeType}
- Monthly Income: KES ${income}
- Loan Amount Requested: KES ${loanAmount}
- Dependents: ${dependents}
- Business Type: ${businessType || "general"}

Debt-to-income ratio: ${((loanAmount / (income * 12)) * 100).toFixed(1)}%

Respond in this EXACT JSON format (no markdown):
{
  "riskScore": <0-100>,
  "riskLevel": "LOW | MEDIUM | HIGH",
  "riskLabel": "human-friendly label e.g. 'Income may need seasonal adjustment'",
  "recommendation": "PROCEED | HUMAN_REVIEW | ADJUST_AMOUNT | WAIT_HARVEST",
  "recommendationText": "1 sentence action for the member",
  "reasoning": "2-3 sentences in African financial context, mention harvest cycles if relevant",
  "flags": ["array", "of", "specific", "concern", "strings"],
  "positives": ["array", "of", "strengths"],
  "suggestedAmount": <number — adjusted loan amount if needed, else same as requested>
}`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const raw = completion.choices[0].message.content;
    const json = JSON.parse(raw.replace(/```json|```/g, "").trim());

    await db.collection("loan_requests").add({
      income, loanAmount, dependents, occupation,
      aiResponse: json,
      status: json.recommendation === "PROCEED" ? "APPROVED_FOR_REVIEW" : "PENDING",
      timestamp: new Date()
    });

    res.json({ success: true, data: json });
  } catch (err) {
    console.error("Guardian error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── ETHICS EXPLAINER ─────────────────────────────────────
app.post("/api/ethics", async (req, res) => {
  try {
    const { scenario, occupation, denialReason } = req.body;

    const prompt = `You are the Chief Ethics Officer of Ujima AI, a SACCO lending system in Kenya.
Explain this scenario with full transparency, like a village elder who respects the community.

Scenario: ${scenario}
Applicant occupation: ${occupation}
Reason flagged: ${denialReason}

Respond in EXACT JSON (no markdown):
{
  "plainExplanation": "2 sentences explaining what happened in simple, dignified language",
  "biasCheck": "1 sentence — does this decision risk unfair bias against this occupation group?",
  "memberRights": ["right 1", "right 2", "right 3"],
  "nextSteps": "What the member can do next — actionable and empowering",
  "ussdCode": "*#733#",
  "dataNote": "1 sentence about how their data is protected under DPA 2022"
}`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
    });

    const raw = completion.choices[0].message.content;
    const json = JSON.parse(raw.replace(/```json|```/g, "").trim());

    res.json({ success: true, data: json });
  } catch (err) {
    console.error("Ethics error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── HUNTER AGENT (Human Review Briefing) ────────────────
app.post("/api/hunter", async (req, res) => {
  try {
    const { applicantName, occupation, income, loanAmount, dependents, riskFlags, guardianScore } = req.body;

    const prompt = `You are preparing a briefing packet for a human SACCO loan officer in Kenya.
Write concisely. The officer is busy. Highlight what matters for a fair, culturally-informed decision.

Applicant: ${applicantName}
Occupation: ${occupation}
Monthly Income: KES ${income}
Loan Request: KES ${loanAmount}
Dependents: ${dependents}
Guardian AI Risk Score: ${guardianScore}/100
Risk Flags from AI: ${riskFlags?.join(", ") || "none"}

Respond in EXACT JSON (no markdown):
{
  "summary": "2-sentence briefing — what this person needs and why it matters",
  "culturalContext": "1-2 sentences of relevant local economic context (harvest, school fees, etc.)",
  "recommendedOfficer": "Type of officer expertise best suited e.g. 'Maize farming specialist'",
  "keyQuestions": ["question for officer to ask", "question 2", "question 3"],
  "crossSellOpportunity": "1 sentence — any relevant product e.g. drought insurance, savings plan",
  "priority": "URGENT | STANDARD | LOW",
  "briefingNote": "One plain-language sentence summarizing the human decision needed"
}`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
    });

    const raw = completion.choices[0].message.content;
    const json = JSON.parse(raw.replace(/```json|```/g, "").trim());

    await db.collection("human_reviews").add({
      applicantName, occupation, income, loanAmount,
      guardianScore, briefing: json,
      status: "AWAITING_OFFICER",
      timestamp: new Date()
    });

    res.json({ success: true, data: json });
  } catch (err) {
    console.error("Hunter error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET all reviews for dashboard ───────────────────────
app.get("/api/reviews", async (req, res) => {
  try {
    const snapshot = await db.collection("human_reviews")
      .orderBy("timestamp", "desc").limit(20).get();
    const reviews = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data: reviews });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET dashboard stats ──────────────────────────────────
app.get("/api/dashboard", async (req, res) => {
  try {
    const [loans, scouts, reviews] = await Promise.all([
      db.collection("loan_requests").get(),
      db.collection("scout_sessions").get(),
      db.collection("human_reviews").get(),
    ]);

    const loanDocs = loans.docs.map(d => d.data());
    const riskCounts = { LOW: 0, MEDIUM: 0, HIGH: 0 };
    loanDocs.forEach(d => {
      const level = d.aiResponse?.riskLevel;
      if (level) riskCounts[level]++;
    });

    res.json({
      success: true,
      data: {
        totalLoans: loans.size,
        totalScoutSessions: scouts.size,
        totalHumanReviews: reviews.size,
        riskDistribution: riskCounts,
        humanReviewRate: loans.size
          ? ((reviews.size / loans.size) * 100).toFixed(1)
          : 0,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Ujima backend running on http://localhost:${PORT}`);
});

app.post("/api/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: "You are Ujima AI assistant. Be helpful and concise."
        },
        { role: "user", content: userMessage }
      ],
    });

    res.json({
      reply: completion.choices[0].message.content
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});