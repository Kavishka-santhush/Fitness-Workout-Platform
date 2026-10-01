/**
 * OpenRouter AI client — thin axios wrapper with JSON-mode helpers.
 * All AI features funnel through `chat()` so usage logging + model config
 * stay in one place (see ai.service.js for quota enforcement).
 */
const axios = require('axios');

const BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 120000,
  headers: {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:3000',
    'X-Title': 'Fitness & Workout Platform',
    'Content-Type': 'application/json',
  },
});

/**
 * @param {Array<{role:string, content:string}>} messages
 * @param {object} opts { model, temperature, maxTokens, json }
 * @returns {Promise<{content:string, usage:object}>}
 */
async function chat(messages, opts = {}) {
  const body = {
    model: opts.model || DEFAULT_MODEL,
    messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 4000,
  };
  if (opts.json) {
    body.response_format = { type: 'json_object' };
  }
  const res = await client.post('/chat/completions', body);
  const choice = res.data?.choices?.[0];
  if (!choice?.message?.content) {
    throw new Error('OpenRouter returned an empty completion');
  }
  return {
    content: choice.message.content,
    usage: res.data.usage || {},
    model: res.data.model,
  };
}

/** chat + parse a JSON object out of the reply (tolerates code fences). */
async function chatJson(messages, opts = {}) {
  const { content, ...rest } = await chat(messages, { ...opts, json: true });
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    parsed = JSON.parse(match ? match[1] : content);
  }
  return { data: parsed, ...rest };
}

module.exports = { chat, chatJson, DEFAULT_MODEL };
