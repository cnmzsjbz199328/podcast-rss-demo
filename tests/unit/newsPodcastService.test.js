import test from 'node:test';
import assert from 'node:assert/strict';
import { NewsPodcastService } from '../../src/core/NewsPodcastService.js';

const createService = (overrides = {}) => {
  const baseServices = {
    database: {
      getEpisodeById: async () => null,
      updateEpisodeAudio: async () => {}
    },
    asyncVoiceService: {
      pollAudioStatus: async () => ({ status: 'processing' }),
      initiateGeneration: async () => ({ eventId: 'evt', status: 'processing' })
    },
    rssService: {
      fetchNews: async () => []
    },
    scriptService: {
      generateScript: async () => ({ content: '', metadata: {} })
    },
    voiceService: {
      generateAudio: async () => ({ duration: 0, fileSize: 0 })
    },
    subtitleService: {
      generateSubtitles: async () => ({ metadata: {} })
    },
    storageService: {
      storeFiles: async () => ({ scriptUrl: '', audioUrl: '', srtUrl: '', vttUrl: '', jsonUrl: '' })
    }
  };

  const mergedServices = {
    ...baseServices,
    ...overrides,
    database: {
      ...baseServices.database,
      ...(overrides.database || {})
    }
  };

  return new NewsPodcastService(mergedServices);
};

const sampleEpisode = {
  id: 'news-123',
  title: 'Sample Episode',
  description: 'Details',
  status: 'published',
  audio_url: 'https://example.com/audio.mp3',
  transcript: 'https://example.com/script.txt',
  duration: 120,
  created_at: '2024-01-01T00:00:00.000Z',
  published_at: '2024-01-01T00:00:00.000Z'
};

test('getPodcastById returns formatted episode details', async () => {
  const service = createService({
    database: {
      getEpisodeById: async (id) => {
        assert.equal(id, sampleEpisode.id);
        return { ...sampleEpisode };
      }
    }
  });

  const result = await service.getPodcastById(sampleEpisode.id);

  assert.equal(result.episodeId, sampleEpisode.id);
  assert.equal(result.audioUrl, sampleEpisode.audio_url);
  assert.equal(result.scriptUrl, sampleEpisode.transcript);
});

test('getPodcastById throws when episode missing', async () => {
  const service = createService({
    database: {
      getEpisodeById: async () => null
    }
  });

  await assert.rejects(() => service.getPodcastById('missing'), {
    message: /not found/i
  });
});
