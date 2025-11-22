import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { topicApi } from '@/services/topicApi';
import { topicFormatters } from '@/utils/formatters';
import type { TopicWithStats } from '@/types';

const TopicList = () => {
  const [topics, setTopics] = useState<TopicWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const response = await topicApi.getTopics({ status: 'active' });
        if (response.success) {
          setTopics(response.data.topics);
        } else {
          setError('获取主题列表失败');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        setLoading(false);
      }
    };

    fetchTopics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-secondary-text-dark">加载中...</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col">
      {/* Top App Bar */}
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between bg-background-light/80 px-4 backdrop-blur-sm dark:bg-background-dark/80">
        <button
          className="flex h-12 w-12 items-center justify-center text-slate-800 dark:text-white hover:bg-white/10 rounded-full transition-colors"
          onClick={() => navigate('/')}
        >
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </button>
        <h1 className="flex-1 text-center text-lg font-bold text-slate-900 dark:text-white">
          我的主题播客
        </h1>
        <button className="flex h-12 w-12 items-center justify-center text-slate-800 dark:text-white hover:bg-white/10 rounded-full transition-colors">
          <span className="material-symbols-outlined text-2xl">search</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Podcast List */}
        <div className="flex flex-col gap-4">
          {topics.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-16 text-center">
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800">
                <span className="material-symbols-outlined text-6xl text-slate-400 dark:text-slate-500">
                  podcasts
                </span>
              </div>
              <div className="mt-6 max-w-xs">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  开始你的第一个播客系列
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  还没有主题播客，点击下方按钮开始创作吧！
                </p>
              </div>
              <Link to="/topics/create" className="mt-8">
                <button className="flex h-10 min-w-[120px] cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-primary px-5 text-sm font-bold text-white hover:bg-primary/90 transition-colors">
                  <span>创建新系列</span>
                </button>
              </Link>
            </div>
          ) : (
            topics.map((topic) => (
              <Link
                key={topic.id}
                to={`/topics/${topic.id}`}
                className="flex cursor-pointer items-center gap-4 rounded-xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:bg-slate-800/50"
              >
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-primary/20">
                  <span className="material-symbols-outlined text-4xl text-primary">
                    {topic.id % 3 === 0
                      ? 'rocket_launch'
                      : topic.id % 3 === 1
                        ? 'self_improvement'
                        : 'history_edu'}
                  </span>
                </div>
                <div className="flex-1 overflow-hidden">
                  <h3 className="truncate text-base font-bold text-slate-900 dark:text-white">
                    {topic.title}
                  </h3>
                  <p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-400">
                    {topic.description}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="material-symbols-outlined text-sm">
                      mic_external_on
                    </span>
                    <span>
                      剧集: {topicFormatters.episodeCount(topic.episode_count)}
                    </span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-slate-400 dark:text-slate-500">
                  chevron_right
                </span>
              </Link>
            ))
          )}
        </div>
      </main>

      {/* Floating Action Button */}
      <div className="sticky bottom-0 right-0 p-6 flex justify-end">
        <Link to="/topics/create">
          <button className="flex h-14 w-14 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105 hover:shadow-xl active:scale-95">
            <span className="material-symbols-outlined text-3xl">add</span>
          </button>
        </Link>
      </div>
    </div>
  );
};

export default TopicList;
