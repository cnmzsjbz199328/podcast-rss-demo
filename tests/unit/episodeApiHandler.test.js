import test from 'node:test';
import assert from 'node:assert/strict';
import { EpisodeApiHandler } from '../../src/handlers/EpisodeApiHandler.js';

const handler = new EpisodeApiHandler();

const baseEpisode = {
  episodeId: 'news-123',
  title: 'Sample Episode',
  description: 'Desc',
  audioUrl: 'https://example.com/audio.mp3',
  duration: 120,
  createdAt: '2024-01-01T00:00:00.000Z',
  publishedAt: '2024-01-01T00:00:00.000Z',
  ttsEventId: 'evt-1',
  scriptUrl: 'https://example.com/script.txt'
};

test('handleEpisodeDetail returns transcriptUrl', async () => {
  const request = new Request('https://example.com/api/episodes/news-123');
  const services = {
    newsPodcastService: {
      getPodcastById: async (episodeId) => {
        assert.equal(episodeId, baseEpisode.episodeId);
        return { ...baseEpisode };
      }
    }
  };

  const response = await handler.handleEpisodeDetail(request, services, [baseEpisode.episodeId]);
  const body = await response.json();

  assert.equal(body.success, true);
  assert.equal(body.data.transcriptUrl, baseEpisode.scriptUrl);
  assert.equal(body.data.id, baseEpisode.episodeId);
});
