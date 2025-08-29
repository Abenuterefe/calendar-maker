const axios = require('axios');
const env = require('../config/env');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

async function getAIEventSuggestion(userText) {
  const today = new Date();
  const currentDateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

  const systemPrompt = `
    You are a calendar assistant. Extract event details from user requests.
    Always respond in JSON with these keys:

    {
      "status": true|false,
      "action": "create", // Can be "create" or "read"
      "summary": "",
      "description": "",
      "dateTime": "",
      "durationMinutes": 60,
      "recurrenceCount": 1, // New field for recurring events
      "startDate": "", // For read actions
      "endDate": "",   // For read actions
      "attendees": [], // New field for meeting attendees (array of emails)
      "feedback": ""
    }

    Rules:
    -if the user asks to create an event at the past days since that is impossible return status: false and feedback explaining why.and also tha padt time is impossible.for example one hour ago or even one minute ago.
    - If the request is irrelevant (not about calendar events), return status: false and feedback explaining why.
    - If time is vague/missing (like 'today' or 'tomorrow' without hours) for a 'create' action, return status: false with feedback "Please provide specific time for the event."
    - If the user asks for a recurring event (e.g., "for the next 10 days"), set recurrenceCount to the specified number of days. Default to 1 if not specified.
    - If the user asks to see their calendar for today or upcoming days (e.g., "what's on my calendar today?", "show me events for tomorrow", "what's planned for next week?"), set "action": "read" and populate "startDate" and "endDate" accordingly. For "today", startDate and endDate should be the current date. For "tomorrow", startDate and endDate should be tomorrow's date. For "next week", set the startDate to the next Monday and endDate to the following Sunday.
    - If request is valid, status: true with full event info. For 'create' actions, ensure summary, dateTime are present. For 'read' actions, ensure startDate and endDate are present.
    - Assume today is ${currentDateStr}.
    -if the user just say " i have a meeting " this does not necessarily mean he wants google meeting.to create google meeting link,it should specify that it wantd google meeting
  `;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent({
      contents: [
        { role: "user", parts: [{ text: userText }] },
      ],
      systemInstruction: { parts: [{ text: systemPrompt }] },
    });

    const response = await result.response;
    const aiContent = response.text();

    // Gemini often returns pure JSON, but keeping cleaning for robustness.
    const cleaned = aiContent.replace(/```json|```/gi, "").trim();

    let suggestion;
    try {
      suggestion = JSON.parse(cleaned);
    } catch (err) {
      console.warn("❌ Failed to parse AI JSON:", err.message);
      throw new Error("AI returned invalid JSON");
    }

    return suggestion;
  } catch (err) {
    console.error("❌ AI API call failed:", err.message || err.response?.data);
    throw err;
  }
}

module.exports = { getAIEventSuggestion };