// The kitchen assistant's agent loop.
//
// One call to runAgent() answers one user message:
//   1. Send the conversation and the tool list to Claude.
//   2. If Claude asks for tools, run them here and send the results back.
//   3. Repeat until Claude answers in plain text, or the step limit is hit.
//
// The client and the database are passed in, so tests can swap in fakes.

const { definitions, runTool } = require('./tools');

const DEFAULT_MODEL = 'claude-opus-5-5';
const MAX_STEPS = 6;

const SYSTEM_PROMPT = `You are the kitchen assistant inside Byte Your Fork, a recipe app.
You help the signed-in user decide what to cook, using only recipes from the app's catalog.

How to work:
- Use the tools to look things up. Never invent a recipe, ingredient list, cook time, or rating.
- Search results already respect the user's dietary restrictions. If nothing fits, say so plainly
  and suggest a broader search. Never suggest a recipe the tools did not return.
- When you mention a recipe, write its title exactly as the tool returned it, followed by its id
  in this form: [recipe:42]. The app turns that into a link.
- If the user wants to cook something, you may offer to add its ingredients to their shopping list
  with propose_shopping_list_add. That only shows them a button; say so, and don't claim the items
  were added.
- Keep answers short: a sentence or two, then a short list if you are suggesting recipes.
- You only help with cooking and this app. Politely decline anything else.`;

function textOf(content) {
  return content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
}

async function runAgent({ client, db, userId, history, model = DEFAULT_MODEL, maxSteps = MAX_STEPS }) {
  const messages = history.map((m) => ({ role: m.role, content: m.content }));
  const proposals = [];
  const toolCalls = [];
  const ctx = { db, userId, proposals };

  for (let step = 0; step < maxSteps; step++) {
    const response = await client.beta.messages.create({
      model,
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      tools: definitions.map((t) => ({ ...t, strict: true })),
      messages,
      // Chat replies don't need deep reasoning; low effort keeps them quick.
      output_config: { effort: 'low' },
      // If a safety classifier declines, the API retries on a fallback model
      // inside the same call instead of returning an empty refusal.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    });

    if (response.stop_reason === 'refusal') {
      return { reply: "Sorry, I can't help with that one. Ask me about recipes or cooking.", proposals, toolCalls };
    }

    // Append the full content (including any thinking blocks) unchanged.
    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'pause_turn') continue;

    if (response.stop_reason !== 'tool_use') {
      const reply = textOf(response.content);
      return { reply: reply || "I couldn't come up with an answer. Try asking another way.", proposals, toolCalls };
    }

    const uses = response.content.filter((b) => b.type === 'tool_use');
    const results = await Promise.all(
      uses.map(async (use) => {
        toolCalls.push({ name: use.name, input: use.input });
        const { isError, content } = await runTool(use.name, use.input, ctx);
        return { type: 'tool_result', tool_use_id: use.id, content, ...(isError ? { is_error: true } : {}) };
      })
    );
    // All results for one turn go back in a single user message.
    messages.push({ role: 'user', content: results });
  }

  return {
    reply: 'That took more lookups than I can do at once. Try a narrower question.',
    proposals,
    toolCalls,
  };
}

module.exports = { runAgent, SYSTEM_PROMPT, DEFAULT_MODEL, MAX_STEPS };
