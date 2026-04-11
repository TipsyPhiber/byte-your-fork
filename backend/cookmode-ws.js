const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { GoogleGenerativeAI } = require('@google/generative-ai');

function buildSystemInstruction(recipe, currentStep) {
  const ingredientsList = (recipe.ingredients || [])
    .map(i => `${i.amount} ${i.name}`.trim())
    .join(', ');
  const stepsList = (recipe.steps || [])
    .map((s, i) => `Step ${i + 1}: ${s}`)
    .join('\n');

  return `You are a friendly, concise kitchen assistant helping someone cook "${recipe.title}".

Recipe:
- Time to cook: ${recipe.ttc} minutes
- Ingredients: ${ingredientsList}
- Steps:
${stepsList}

Current step: Step ${currentStep + 1} of ${recipe.steps?.length || 0}: "${recipe.steps?.[currentStep] || ''}"

Rules:
- Keep all responses short and natural — they are spoken aloud, not read
- No markdown, bullet points, or special characters in responses
- If the user says "next" or "next step" — respond with exactly: Moving to the next step.
- If the user says "back", "previous", or "go back" — respond with exactly: Going back a step.
- If the user says "repeat" or "say that again" — repeat the current step text
- Answer any cooking questions using the recipe above`;
}

function setupCookModeWS(server) {
  const wss = new WebSocket.Server({ server, path: '/ws/cook-mode' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');
    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      ws.close(1008, 'Unauthorized');
      return;
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    let recipe = null;
    let currentStep = 0;

    const send = (data) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
    };

    const askGemini = async (userText) => {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
        const result = await model.generateContent([
          { text: buildSystemInstruction(recipe, currentStep) },
          { text: `User said: "${userText}"` }
        ]);
        const text = result.response.text().trim();
        let action = null;
        if (/moving to the next step/i.test(text)) action = 'next';
        else if (/going back a step/i.test(text)) action = 'prev';
        send({ type: 'text', text, action });
      } catch (err) {
        console.error('Gemini error:', err.message);
        send({ type: 'error', message: 'Assistant unavailable.' });
      }
    };

    ws.on('message', async (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }

      if (msg.type === 'init') {
        const NOISE = /^(instructions|directions|method|steps|preparation|how to make|procedure)\.?$/i;
        msg.recipe.steps = (msg.recipe.steps || []).filter(s => s && !NOISE.test(s.trim()));
        recipe = msg.recipe;
        currentStep = msg.currentStep || 0;
        send({ type: 'ready' });
        // Read the first step aloud
        const stepText = recipe.steps?.[currentStep] || '';
        send({ type: 'text', text: `Step ${currentStep + 1}: ${stepText}`, action: null });

      } else if (msg.type === 'message' && recipe) {
        await askGemini(msg.text);

      } else if (msg.type === 'update_step' && recipe) {
        currentStep = msg.step;
        const stepText = recipe.steps?.[currentStep] || '';
        send({ type: 'text', text: `Step ${currentStep + 1}: ${stepText}`, action: null });
      }
    });

    ws.on('error', (err) => console.error('Cook mode WS error:', err.message));
  });

  console.log('Cook Mode WebSocket ready at /ws/cook-mode');
}

module.exports = { setupCookModeWS };
