const OpenAI = require('openai');
const { getChromaClient, toCollectionName } = require('../config/chroma');
const { createEmbedding } = require('./embeddings');
const Campaign = require('../models/Campaign');

const CHAT_MODEL = 'gpt-4o';
const TOP_K = 10;

const SYSTEM_PROMPT =
  'You are a lead management assistant. Answer only using the lead data in context. Be concise. For count questions, count accurately. If the context lacks the answer, say so clearly.';

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

const buildContextFromResults = (documents = [], metadatas = []) =>
  documents
    .map((doc, index) => {
      const meta = metadatas[index] || {};
      const name = meta.businessName ? ` (${meta.businessName})` : '';
      return `[Lead ${index + 1}${name}]\n${doc}`;
    })
    .join('\n\n');

const askGpt = async (question, context) => {
  const openai = getOpenAIClient();

  const response = await openai.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0.2,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Lead data context:\n${context || 'No leads found.'}\n\nQuestion: ${question}`,
      },
    ],
  });

  return response.choices[0]?.message?.content?.trim() || 'No response generated.';
};

const queryCollection = async (collectionName, queryEmbedding, nResults = TOP_K) => {
  const client = getChromaClient();
  const collection = await client.getCollection({ name: collectionName });

  const results = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults,
    include: ['documents', 'metadatas', 'distances'],
  });

  return {
    documents: results.documents?.[0] || [],
    metadatas: results.metadatas?.[0] || [],
    distances: results.distances?.[0] || [],
  };
};

const mergeRankedResults = (resultSets, limit = TOP_K) => {
  const combined = [];

  for (const set of resultSets) {
    for (let i = 0; i < set.documents.length; i++) {
      combined.push({
        document: set.documents[i],
        metadata: set.metadatas[i],
        distance: set.distances[i] ?? Infinity,
      });
    }
  }

  combined.sort((a, b) => a.distance - b.distance);

  const top = combined.slice(0, limit);
  return {
    documents: top.map((item) => item.document),
    metadatas: top.map((item) => item.metadata),
  };
};

/**
 * Query leads for a single campaign using RAG.
 * @param {string} userQuestion
 * @param {string} campaignId
 * @returns {Promise<string>}
 */
const queryLeads = async (userQuestion, campaignId) => {
  const campaign = await Campaign.findById(campaignId);
  if (!campaign) {
    throw new Error('Campaign not found');
  }

  const collectionName = toCollectionName(campaign.name);
  const queryEmbedding = await createEmbedding(userQuestion);

  try {
    const results = await queryCollection(collectionName, queryEmbedding);
    if (!results.documents.length) {
      return 'No embedded leads found for this campaign. Run a scrape first to index leads.';
    }

    const context = buildContextFromResults(results.documents, results.metadatas);
    return askGpt(userQuestion, context);
  } catch (error) {
    if (error.message?.includes('does not exist') || error.name === 'ChromaNotFoundError') {
      return 'No embedded leads found for this campaign. Run a scrape first to index leads.';
    }
    throw error;
  }
};

/**
 * Query leads across all ChromaDB collections.
 * @param {string} userQuestion
 * @returns {Promise<string>}
 */
const queryAllCampaigns = async (userQuestion) => {
  const client = getChromaClient();
  const collections = await client.listCollections();

  if (!collections.length) {
    return 'No lead data has been indexed yet. Create a campaign and run a scrape first.';
  }

  const queryEmbedding = await createEmbedding(userQuestion);
  const resultSets = [];

  for (const col of collections) {
    try {
      const results = await queryCollection(col.name, queryEmbedding, TOP_K);
      if (results.documents.length) {
        resultSets.push(results);
      }
    } catch {
      // Skip collections that cannot be queried
    }
  }

  if (!resultSets.length) {
    return 'No matching leads found across any campaign.';
  }

  const merged = mergeRankedResults(resultSets, TOP_K);
  const context = buildContextFromResults(merged.documents, merged.metadatas);
  return askGpt(userQuestion, context);
};

module.exports = {
  queryLeads,
  queryAllCampaigns,
  buildContextFromResults,
  CHAT_MODEL,
};
