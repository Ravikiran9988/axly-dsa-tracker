const { defaultProvider } = require('../src/services/embeddingService');

if (defaultProvider) {
  defaultProvider.getEmbedding = jest.fn().mockResolvedValue(new Array(3072).fill(0.1));
  defaultProvider.getEmbeddings = jest.fn(async (texts) => texts.map(() => new Array(3072).fill(0.1)));
}
