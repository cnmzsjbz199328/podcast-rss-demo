/** 限制：每个文件不超过200行，当前行数：85行 */
/**
 * ContentDataAdapter 单元测试
 * 测试数据转换逻辑的正确性
 */

import { ContentDataAdapter } from '../../src/core/ContentDataAdapter.js';

describe('ContentDataAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = new ContentDataAdapter();
  });

  describe('adaptNewsData', () => {
    test('should return news data as-is', () => {
      const newsData = [
        {
          title: 'Test News',
          description: 'Test description',
          content: 'Test content'
        }
      ];

      const result = adapter.adaptNewsData(newsData);

      expect(result).toEqual(newsData);
    });

    test('should handle empty array', () => {
      const result = adapter.adaptNewsData([]);

      expect(result).toEqual([]);
    });
  });

  describe('adaptTopicData', () => {
    test('should convert topic data to AI format', () => {
      const topicData = {
        topic: {
          title: 'IELTS Test Strategies',
          description: 'Learn IELTS test strategies',
          keywords: ['IELTS', 'test', 'strategies'],
          category: 'Education'
        },
        content: 'Detailed content about IELTS strategies'
      };

      const result = adapter.adaptTopicData(topicData);

      expect(result).toEqual([
        {
          title: 'IELTS Test Strategies',
          description: 'Learn IELTS test strategies',
          keywords: ['IELTS', 'test', 'strategies'],
          category: 'Education',
          content: 'Detailed content about IELTS strategies'
        }
      ]);
    });

    test('should use topic description when content is null', () => {
      const topicData = {
        topic: {
          title: 'Test Topic',
          description: 'Test description',
          keywords: [],
          category: 'Test'
        },
        content: null
      };

      const result = adapter.adaptTopicData(topicData);

      expect(result[0].content).toBe('Test description');
    });
  });

  describe('adaptSeriesData', () => {
    test('should convert series data to AI format', () => {
      const seriesData = {
        topic: {
          title: 'IELTS Series',
          description: 'Series description',
          keywords: ['IELTS'],
          category: 'Education'
        },
        prompt: 'Generate the next episode in the IELTS series with focus on speaking'
      };

      const result = adapter.adaptSeriesData(seriesData);

      expect(result).toEqual([
        {
          title: 'IELTS Series',
          description: 'Generate the next episode in the IELTS series with focus on speaking',
          content: 'Generate the next episode in the IELTS series with focus on speaking'
        }
      ]);
    });
  });

  describe('adapt (unified method)', () => {
    test('should handle news type', () => {
      const data = [{ title: 'News' }];
      const result = adapter.adapt('news', data);

      expect(result).toEqual(data);
    });

    test('should handle topic type', () => {
      const data = {
        topic: { title: 'Topic', description: 'Desc', keywords: [], category: 'Cat' },
        content: 'Content'
      };
      const result = adapter.adapt('topic', data);

      expect(result).toEqual([
        {
          title: 'Topic',
          description: 'Desc',
          keywords: [],
          category: 'Cat',
          content: 'Content'
        }
      ]);
    });

    test('should handle topic-series type', () => {
      const data = {
        topic: { title: 'Series', description: 'Desc', keywords: [], category: 'Cat' },
        prompt: 'Series prompt'
      };
      const result = adapter.adapt('topic-series', data);

      expect(result).toEqual([
        {
          title: 'Series',
          description: 'Series prompt',
          content: 'Series prompt'
        }
      ]);
    });

    test('should throw error for unsupported type', () => {
      expect(() => {
        adapter.adapt('unsupported', {});
      }).toThrow('Unsupported content type: unsupported');
    });
  });
});
