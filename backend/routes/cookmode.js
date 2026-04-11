const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { authenticateToken } = require('../middleware/auth');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/chat', authenticateToken, async (req, res) => {
  const { message, recipe, currentStep } = req.body;
  if (!message || !recipe) return res.status(400).json({ error: 'Missing message or recipe' });

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const ingredientsList = (recipe.ingredients || [])
      .map(i => `${i.amount} ${i.name}`.trim())
      .join(', ');

    const stepsList = (recipe.steps || [])
      .map((s, i) => `Step ${i + 1}: ${s}`)
      .join('\n');

    const systemContext = `You are a friendly, concise kitchen assistant helping someone cook "${recipe.title}".

Recipe details:
- Time to cook: ${recipe.ttc} minutes
- Ingredients: ${ingredientsList}
- Steps:
${stepsList}

The user is currently on Step ${currentStep + 1} of ${recipe.steps?.length || 0}:
"${recipe.steps?.[currentStep] || ''}"

Your role:
- Answer cooking questions about this recipe clearly and briefly (2-3 sentences max)
- If the user says "next", "next step", or similar — respond with "Moving to the next step." only
- If the user says "back", "previous", "go back" — respond with "Going back a step." only
- If the user says "repeat" or "say that again" — repeat the current step instructions
- If the user asks about ingredients or amounts, answer from the recipe above
- Keep responses short — they will be read aloud while someone is cooking
- Do not use markdown, bullet points, or special characters in your response`;

    const result = await model.generateContent([
      { text: systemContext },
      { text: `User said: "${message}"` }
    ]);

    const text = result.response.text().trim();

    // Detect navigation intent from Gemini's response
    let action = null;
    if (/moving to the next step/i.test(text)) action = 'next';
    else if (/going back a step/i.test(text)) action = 'prev';

    res.json({ response: text, action });
  } catch (err) {
    console.error('Gemini error:', err.message);
    res.status(500).json({ error: 'AI assistant unavailable' });
  }
});

module.exports = router;
