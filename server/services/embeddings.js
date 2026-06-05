const OpenAI = require('openai');
const { getChromaClient, toCollectionName } = require('../config/chroma');

const EMBEDDING_MODEL = 'text-embedding-3-small';
const BATCH_SIZE = 100;

let openaiClient;

const getOpenAIClient = () => {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
};

const leadToDocument = (lead) =>
  `Business: ${lead.businessName || 'N/A'}, Email: ${lead.email || 'N/A'}, Phone: ${lead.phone || 'N/A'}, Address: ${lead.address || 'N/A'}, Industry: ${lead.industry || 'N/A'}`;

const buildLeadId = (campaignId, lead, index) => {
  const key = lead.email || lead.phone || `row_${index}`;
  return `${campaignId}_${key}`.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128);
};

/**
 * Create a single embedding vector from text.
 * @param {string} text
 * @returns {Promise<number[]>}
 */
const createEmbedding = async (text) => {
  const openai = getOpenAIClient();
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });

  return response.data[0].embedding;
};

/**
 * Batch-create embeddings (max 100 texts per OpenAI request).
 * @param {string[]} texts
 * @returns {Promise<number[][]>}
 */
const createEmbeddingsBatch = async (texts) => {
  if (!texts.length) return [];

  const openai = getOpenAIClient();
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });

  return response.data.sort((a, b) => a.index - b.index).map((item) => item.embedding);
};

/**
 * Embed leads and store them in a ChromaDB collection named after the campaign.
 * @param {Array} leads
 * @param {string} campaignName
 * @param {string} campaignId
 * @returns {Promise<{ collectionName: string, count: number }>}
 */
const embedLeads = async (leads, campaignName, campaignId) => {
  if (!leads?.length) {
    return { collectionName: toCollectionName(campaignName), count: 0 };
  }

  const collectionName = toCollectionName(campaignName);
  const client = getChromaClient();
  const collection = await client.getOrCreateCollection({ name: collectionName });

  let totalEmbedded = 0;

  for (let i = 0; i < leads.length; i += BATCH_SIZE) {
    const batch = leads.slice(i, i + BATCH_SIZE);
    const documents = batch.map(leadToDocument);
    const embeddings = await createEmbeddingsBatch(documents);

    const ids = batch.map((lead, idx) => buildLeadId(campaignId, lead, i + idx));
    const metadatas = batch.map((lead) => ({
      campaignId: String(campaignId),
      email: lead.email || '',
      phone: lead.phone || '',
      businessName: lead.businessName || '',
    }));

    await collection.upsert({
      ids,
      embeddings,
      documents,
      metadatas,
    });

    totalEmbedded += batch.length;
  }

  return { collectionName, count: totalEmbedded };
};

module.exports = {
  createEmbedding,
  createEmbeddingsBatch,
  embedLeads,
  leadToDocument,
  EMBEDDING_MODEL,
};
