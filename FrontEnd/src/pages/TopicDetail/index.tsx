import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { topicApi } from '@/services/topicApi';
import { topicFormatters, statsFormatters } from '@/utils/formatters';
import Button from '@/components/common/Button';
import type { Topic, TopicStats } from '@/types';

const TopicDetail = () => {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [stats, setStats] = useState<TopicStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!topicId) return;

    const fetchTopic = async () => {
      try {
        const response = await topicApi.getTopic(parseInt(topicId));
        if (response.success) {
          setTopic(response.data.topic);
          setStats(response.data.stats);
        } else {
          setError('获取主题详情失败');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        setLoading(false);
      }
    };

    fetchTopic();
  }, [topicId]);

  const handleGenerateNext = async () => {
    if (!topicId) return;

    try {
      setGenerating(true);
      const response = await topicApi.generateNextTopicEpisode(parseInt(topicId));
      if (response.success) {
        const topicResponse = await topicApi.getTopic(parseInt(topicId));
        if (topicResponse.success) {
          setTopic(topicResponse.data.topic);
          setStats(topicResponse.data.stats);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-secondary-text-dark">加载中...</p>
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-6 py-4 rounded-lg">
          {error || '主题不存在'}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden bg-background-light dark:bg-background-dark pb-28">
      {/* TopAppBar */}
      <div className="sticky top-0 z-10 flex items-center justify-between bg-background-light/80 p-4 pb-2 backdrop-blur-sm dark:bg-background-dark/80">
        <div
          className="flex size-10 shrink-0 items-center justify-center text-slate-900 dark:text-white cursor-pointer hover:bg-white/10 rounded-full transition-colors"
          onClick={() => navigate(-1)}
        >
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </div>
        <h2 className="flex-1 text-center text-lg font-bold leading-tight tracking-[-0.015em] text-slate-900 dark:text-white">
          {topic.title}
        </h2>
        <div className="flex w-10 items-center justify-center">
          <button className="flex h-10 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-transparent text-slate-900 dark:text-white hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-2xl">more_vert</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {/* ProfileHeader */}
        <div className="flex p-4 @container">
          <div className="flex w-full flex-col items-start gap-4">
            <div className="flex w-full flex-col items-start gap-4 sm:flex-row">
              <div
                className="aspect-square w-32 shrink-0 rounded-lg bg-cover bg-center bg-no-repeat"
                style={{
                  backgroundImage: `url('${topic.imageUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuA-yEMgFZPUZZe7fWEMdOAMOy3y9yS3BLBjVGoFcviBBZItsS0wYYbUnX2zARX1GJ82Oqgpl31lCbG-ldq6GFj8Z9KnZNn5ZWBHJNuiVG0aaERlUyTNwlxsuTbFAPGc36kbTrFBeQ7t2o7PdG1H8PM1rVuiDJtb0LmSauEGQ6UOA4-SOstyvppRa-AghKhvPd4s2YN65BAj0qyCpY48K4bKozYNdm1EOfvMXK7ekUfqzD25Q7KRMGXray5o35qm4WxR7XRCeERswcI'}')`
                }}
              />
              <div className="flex flex-col">
                <p className="text-[22px] font-bold leading-tight tracking-[-0.015em] text-slate-900 dark:text-white">
                  {topic.title}
                </p>
                <p className="mt-1 text-base font-normal leading-normal text-slate-600 dark:text-secondary-text-dark">
                  {topic.description}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-4 px-4">
          <div className="flex min-w-[158px] flex-1 flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 dark:border-border-dark dark:bg-card-dark">
            <p className="text-base font-medium leading-normal text-slate-600 dark:text-secondary-text-dark">
              生成剧集
            </p>
            <p className="text-2xl font-bold leading-tight tracking-tight text-slate-900 dark:text-white">
              {topic.episode_count}集
            </p>
          </div>
          <div className="flex min-w-[158px] flex-1 flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 dark:border-border-dark dark:bg-card-dark">
            <p className="text-base font-medium leading-normal text-slate-600 dark:text-secondary-text-dark">
              总时长
            </p>
            <p className="text-2xl font-bold leading-tight tracking-tight text-slate-900 dark:text-white">
              {stats ? statsFormatters.totalDuration(stats.totalDuration) : '-'}
            </p>
          </div>
        </div>

        {/* SectionHeader */}
        <h3 className="px-4 pb-2 pt-4 text-lg font-bold leading-tight tracking-[-0.015em] text-slate-900 dark:text-white">
          最新剧集
        </h3>

        {/* Episode List */}
        {stats && stats.recentEpisodes.length > 0 ? (
          stats.recentEpisodes.slice(0, 5).map((episode) => (
            <Link
              key={episode.episodeNumber}
              to={`/podcast/${episode.episodeId}`}
              className="flex min-h-[72px] items-center justify-between gap-4 px-4 py-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
                  <span className="material-symbols-outlined text-3xl">
                    play_circle
                  </span>
                </div>
                <div className="flex flex-col justify-center">
                  <p className="text-base font-medium leading-normal text-slate-900 dark:text-white line-clamp-1">
                    第 {episode.episodeNumber} 集
                  </p>
                  <p className="text-sm font-normal leading-normal text-slate-600 dark:text-secondary-text-dark line-clamp-2">
                    创建于 {topicFormatters.createdAt(episode.createdAt)}
                  </p>
                </div>
              </div>
              <div className="shrink-0">
                <div className="flex size-7 items-center justify-center text-slate-600 dark:text-secondary-text-dark hover:text-slate-900 dark:hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-2xl">download</span>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 px-4 py-16 text-center">
            <div className="flex size-24 items-center justify-center rounded-full bg-primary/10 text-primary">
              <span className="material-symbols-outlined !text-5xl">podcasts</span>
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              暂无剧集
            </p>
            <p className="max-w-xs text-slate-600 dark:text-secondary-text-dark">
              点击下方按钮生成第一集！
            </p>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6">
        <Button
          onClick={handleGenerateNext}
          disabled={generating}
          className="flex h-16 w-16 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full shadow-lg"
        >
          <span className="material-symbols-outlined !text-3xl">auto_awesome</span>
        </Button>
      </div>
    </div>
  );
};

export default TopicDetail;
