const { ChromaClient } = require('chromadb');

let client;

const getChromaClient = () => {
  if (!client) {
    const chromaUrl = process.env.CHROMA_URL || 'http://localhost:8000';
    client = new ChromaClient({ path: chromaUrl });
  }
  return client;
};

/**
 * Chroma collection names: 3–63 chars, alphanumeric + underscores, start/end alphanumeric.
 */
const toCollectionName = (name) => {
  const sanitized = String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 63);

  if (sanitized.length >= 3) return sanitized;
  return `campaign_${sanitized || 'leads'}`.slice(0, 63);
};

module.exports = { getChromaClient, toCollectionName };
