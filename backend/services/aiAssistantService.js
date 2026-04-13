const { all } = require('../db');

const OPENAI_API_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

function normalizeProduct(product) {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    category: product.category || 'general',
    price: Number(product.price || 0),
    inventory: Number(product.inventory || 0),
    sellerName: product.sellerName || 'Marketplace seller',
    rating: Number(product.rating || 0),
    reviewCount: Number(product.reviewCount || 0),
  };
}

async function getCatalogContext(limit = 12) {
  const products = await all(
    `SELECT p.id, p.name, p.description, p.category, p.price, p.inventory, p.rating, p.reviewCount, u.name AS sellerName
     FROM products p
     LEFT JOIN users u ON u.id = p.sellerId
     ORDER BY p.rating DESC, p.reviewCount DESC, p.createdAt DESC
     LIMIT ?`,
    [limit]
  );

  return (products || []).map(normalizeProduct);
}

function scoreProduct(product, message) {
  const query = message.toLowerCase();
  let score = product.rating * 10;

  if (query.includes(product.category.toLowerCase())) score += 20;
  if (query.includes('beginner') && /guide|starter|kit|education/.test(`${product.name} ${product.description} ${product.category}`.toLowerCase())) score += 18;
  if (query.includes('gift') && /collectible|art|bundle|print/.test(`${product.name} ${product.description}`.toLowerCase())) score += 16;
  if (query.includes('hardware') && product.category === 'hardware') score += 14;
  if (query.includes('gaming') && product.category === 'gaming') score += 14;
  if (query.includes('art') && product.category === 'art') score += 14;
  if (query.includes('cheap') || query.includes('budget') || query.includes('under')) {
    score += Math.max(0, 40 - product.price / 5);
  }
  if (product.inventory > 0) score += 8;

  const searchableText = `${product.name} ${product.description} ${product.category} ${product.sellerName}`.toLowerCase();
  query.split(/\s+/).forEach((term) => {
    if (term.length > 2 && searchableText.includes(term)) score += 4;
  });

  return score;
}

function buildFallbackReply(message, catalog) {
  const ranked = [...catalog]
    .sort((a, b) => scoreProduct(b, message) - scoreProduct(a, message))
    .slice(0, 3);

  if (ranked.length === 0) {
    return {
      reply: "I couldn't find products in the catalog yet, but I can help once listings are available.",
      suggestions: [],
      source: 'fallback',
    };
  }

  const suggestions = ranked.map((product) => ({
    id: product.id,
    name: product.name,
    price: product.price,
    category: product.category,
    reason: `${product.category} pick from ${product.sellerName} with a ${product.rating.toFixed(1)} rating`,
  }));

  const reply = `Here are a few strong matches for "${message}": ${ranked
    .map((product) => `${product.name} at $${product.price.toFixed(2)}`)
    .join(', ')}. ${
    ranked[0].inventory > 0
      ? `My top pick is ${ranked[0].name} because it fits the request and is currently in stock.`
      : `My top pick is ${ranked[0].name} because it best matches the request.`
  }`;

  return {
    reply,
    suggestions,
    source: 'fallback',
  };
}

async function callOpenAI(message, catalog) {
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text:
                'You are the Satoshi Stop shopping concierge. Give concise, practical buying guidance. Only recommend items from the provided catalog. Mention uncertainty when needed. Return JSON with keys: reply and suggestions. Each suggestion should include id, name, price, category, and reason.',
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: `Customer request: ${message}\n\nCatalog:\n${JSON.stringify(catalog, null, 2)}`,
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'shopping_assistant_response',
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['reply', 'suggestions'],
            properties: {
              reply: { type: 'string' },
              suggestions: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['id', 'name', 'price', 'category', 'reason'],
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    price: { type: 'number' },
                    category: { type: 'string' },
                    reason: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
      max_output_tokens: 500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  const content = payload.output?.[0]?.content || [];
  const jsonText = content.find((item) => item.type === 'output_text')?.text;

  if (!jsonText) {
    throw new Error('OpenAI response did not include structured output');
  }

  return {
    ...JSON.parse(jsonText),
    source: 'openai',
  };
}

async function generateAssistantReply(message) {
  const catalog = await getCatalogContext();

  if (!process.env.OPENAI_API_KEY) {
    return buildFallbackReply(message, catalog);
  }

  try {
    return await callOpenAI(message, catalog);
  } catch (error) {
    return {
      ...buildFallbackReply(message, catalog),
      warning: 'OpenAI was unavailable, so a local recommendation fallback was used.',
      error: error.message,
    };
  }
}

module.exports = {
  generateAssistantReply,
};
