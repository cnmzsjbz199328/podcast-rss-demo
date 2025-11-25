import test from 'node:test';
import assert from 'node:assert/strict';
import { TopicRepository } from '../../src/repositories/TopicRepository.js';

const baseRow = {
  id: 1,
  title: 'AI in Education',
  description: 'Explore AI tutoring tools',
  keywords: 'ai,education',
  category: 'technology',
  is_active: 1,
  generation_interval_hours: 24,
  last_generated_at: null,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T01:00:00.000Z'
};

const createMockDb = () => {
  const calls = [];

  return {
    calls,
    prepare(sql) {
      const call = { sql, params: null };
      calls.push(call);

      return {
        bind: (...params) => {
          call.params = params;
          return {
            all: async () => ({ results: [baseRow] }),
            first: async () => baseRow,
            run: async () => ({ meta: { changes: 1 } })
          };
        }
      };
    }
  };
};

test('getTopics queries topics table with filters applied', async () => {
  const db = createMockDb();
  const repository = new TopicRepository(db);

  const topics = await repository.getTopics({
    is_active: true,
    category: 'education',
    limit: 5,
    offset: 10
  });

  assert.equal(topics.length, 1);
  assert.equal(topics[0].title, baseRow.title);

  const call = db.calls.find(entry => entry.sql.includes('SELECT * FROM topics'));
  assert(call, 'topics query should be executed');
  assert.deepEqual(call.params, [1, 'education', 5, 10]);
});

test('getTopic selects from topics table by id', async () => {
  const db = createMockDb();
  const repository = new TopicRepository(db);

  const topic = await repository.getTopic(42);

  assert.equal(topic.id, baseRow.id);

  const call = db.calls.find(entry => entry.sql.includes('SELECT * FROM topics WHERE id = ?'));
  assert(call, 'getTopic should query topics table');
  assert.deepEqual(call.params, [42]);
});
