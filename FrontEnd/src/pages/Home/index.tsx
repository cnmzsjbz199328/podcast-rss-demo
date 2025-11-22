import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { podcastApi } from '@/services/podcastApi';
import { episodeFormatters } from '@/utils/formatters';
import Button from '@/components/common/Button';
import type { Episode } from '@/types';

const Home = () => {
  const [featuredEpisodes, setFeaturedEpisodes] = useState<Episode[]>([]);
  const [latestEpisodes, setLatestEpisodes] = useState<Episode[]>([]);
  const [recommendedEpisodes, setRecommendedEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEpisodes = async () => {
      try {
        const response = await podcastApi.getEpisodes({ limit: 20 });
        if (response.success) {
          const episodes = response.data.episodes;
          setFeaturedEpisodes(episodes.slice(0, 3));
          setLatestEpisodes(episodes.slice(0, 6));
          setRecommendedEpisodes(episodes.slice(0, 3));
        } else {
          setError('获取播客列表失败');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        setLoading(false);
      }
    };

    fetchEpisodes();
  }, []);

  if (loading && latestEpisodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-secondary-text-dark">加载中...</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
      {/* Header Bar */}
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-background-light/80 px-4 py-3 backdrop-blur-sm dark:bg-background-dark/80">
        <div className="flex flex-1 items-center gap-2 rounded-lg bg-white/10 px-3 py-2">
          <span className="material-symbols-outlined text-secondary-text-dark">search</span>
          <input
            className="w-full flex-1 bg-transparent text-white placeholder-secondary-text-dark focus:outline-none"
            placeholder="搜索新闻、主题或创作者"
            type="search"
          />
        </div>
        <button className="flex items-center justify-center">
          <img
            className="size-10 rounded-full"
            alt="User avatar"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAQadlhKnhKDNcQufIkPIKmcsy3xrKrk3TlDQgiETRizhrV7f0A7yJVt6O8WGn2bdp3GT6noc4Ca9OjAj7a0mifeh5YpyCXr-mrHD5FJ-PtNCAwt8XmzMNVJPpSbz9rAb6CLbQflEidTqUlfbqC6_XvozlZhh5WB6csjKaXXvKhW9AT-dRTla-BXXtBYTN0jmpKaLVKPoTwkAehJYSWNqTEBBglwgIX5V0hyXwEzKJmSQS5utYoW10W6ljMf6BUtuqHha7dz9V4cnk"
          />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex flex-col">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-4 py-3 m-4 rounded-lg">
            {error}
          </div>
        )}

        {/* Featured Carousel */}
        <div className="flex overflow-x-auto hide-scrollbar">
          <div className="flex items-stretch gap-3 p-4">
            {featuredEpisodes.map((episode) => (
              <Link
                key={episode.id}
                to={`/podcast/${episode.id}`}
                className="flex h-full min-w-80 flex-1 flex-col gap-4 rounded-lg bg-surface-dark shadow-[0_0_4px_rgba(0,0,0,0.1)] overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div
                  className="flex aspect-video w-full flex-col items-start justify-end rounded-t-lg bg-cover bg-center bg-no-repeat p-4"
                  style={{
                    backgroundImage: `url('${episode.imageUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuA2_9ObCfONvijhgVOs3in0B-EprZvvBQj8HmEo8C3ZrvHV13F7vylFUM1SN-SJH8FHZ1uLR1f0BL9PBJ71q8Le0dAEE0PKnBaMWZuvrzAYfpx9gsm0e87SJlE0NWzLgLGDL7NneGYtXMmTbnJ_vtZJ5PU7GtCsQtYba8dKC6fOrkRqxXzm5Y9DnIAS5qWU6R37P9PIy0YFmpAmSpfXq6HDduSTnYNEs4nq4eG1bUKANHo3kZ-wEjtaGTbllMRrHYU1FTRG-pEoJIA'}')`
                  }}
                >
                  <h3 className="text-xl font-bold leading-tight text-white line-clamp-1">
                    {episode.title}
                  </h3>
                  <p className="text-sm font-normal leading-normal text-white/80 line-clamp-1">
                    {episode.description}
                  </p>
                </div>
                <div className="flex flex-col flex-1 justify-between p-4 pt-0">
                  <Button variant="primary" size="small">
                    <span className="material-symbols-outlined">play_arrow</span>
                    <span>立即播放</span>
                  </Button>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Latest Episodes */}
        <h2 className="px-4 pb-3 pt-5 text-[22px] font-bold leading-tight tracking-[-0.015em] text-white dark:text-white">
          最新发布
        </h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(158px,1fr))] gap-3 p-4 pt-0">
          {latestEpisodes.map((episode) => (
            <Link
              key={episode.id}
              to={`/podcast/${episode.id}`}
              className="flex flex-col gap-3 pb-3 group"
            >
              <div className="relative w-full">
                <div
                  className="aspect-square w-full rounded-lg bg-cover bg-center bg-no-repeat group-hover:shadow-lg transition-shadow"
                  style={{
                    backgroundImage: `url('${episode.imageUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuB7_gVRC3I1E7bAzT4Vl0dfnXHCu-Gi_mrwvpJKx4IVW8zD3-54Vwfu_ktoHOssoYfnJELuTaaAOUC1fKV3CR1YI-NYNQhReu8k3XHpzQexURQiwUCHnxdXFKB4WTqyPb8mJRA6q8S9rYGscJDCm-8RvqcAX4eb1-yo7mVoBYFDXVUp8bDFDAwHBimufalKXut7tQvF10jNg9ae2NNTGWZTrRXb7ImpQS6eJh2SWwaVahb4rp16NuubaIWcf49_pQYXPZlIyqfsJGs'}')`
                  }}
                />
                <button className="absolute bottom-2 right-2 flex size-9 items-center justify-center rounded-full bg-primary/80 backdrop-blur-sm hover:bg-primary transition-colors">
                  <span className="material-symbols-outlined text-white pl-0.5">
                    play_arrow
                  </span>
                </button>
              </div>
              <div>
                <p className="truncate text-base font-medium leading-normal text-white dark:text-white">
                  {episode.title}
                </p>
                <p className="text-sm font-normal leading-normal text-secondary-text-dark">
                  播客 · {episodeFormatters.publishedAt(episode.publishedAt)}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Recommended Episodes */}
        <h2 className="px-4 pb-3 pt-5 text-[22px] font-bold leading-tight tracking-[-0.015em] text-white dark:text-white">
          为你推荐
        </h2>
        <div className="flex flex-col gap-4 px-4 pb-20">
          {recommendedEpisodes.map((episode) => (
            <Link
              key={episode.id}
              to={`/podcast/${episode.id}`}
              className="flex items-center gap-4 rounded-lg bg-surface-dark p-4 hover:bg-surface-dark/80 transition-colors"
            >
              <img
                className="size-20 shrink-0 rounded-lg object-cover"
                alt={episode.title}
                src={episode.imageUrl || 'https://via.placeholder.com/80'}
              />
              <div className="flex flex-1 flex-col">
                <p className="font-medium text-white dark:text-white">
                  {episode.title}
                </p>
                <p className="text-sm text-secondary-text-dark">
                  {episode.description}
                </p>
                <p className="text-xs text-secondary-text-dark/70">
                  播客 · {episodeFormatters.duration(episode.duration)}
                </p>
              </div>
              <button className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/20 hover:bg-primary/30 transition-colors">
                <span className="material-symbols-outlined text-primary pl-0.5 !text-3xl">
                  play_arrow
                </span>
              </button>
            </Link>
          ))}
        </div>
      </main>

      {/* Mini Player (Persistent) */}
      <footer className="fixed bottom-0 left-0 right-0 z-10 p-2">
        <div className="flex h-16 items-center gap-3 rounded-lg bg-surface-dark/90 p-2 pr-4 text-white backdrop-blur-md">
          <img
            className="size-12 shrink-0 rounded-md object-cover"
            alt="Current playing"
            src={
              latestEpisodes[0]?.imageUrl ||
              'https://lh3.googleusercontent.com/aida-public/AB6AXuBmkt9s0Ap8jim98WjTHEYZXD1OpOO9JJN185GSvX3xFxjFeQ3qljFscFFgvvQ9RxN3kZrM3-rnRsaLuw_OFa4DFz_vNiJlcb_ZEc3r1B5-Vb2_4tf42Jrl-tL7aYMlGgQvO5v3MdJXvoXHNx4EiPnNRX2hmfo5lU8VcMdvzTQhZLMDe_QPlcxuloWOw_twozLG2Q8DyNZCNTNTC2NLLPTZeV39T36gX_OpqxB-1Q-E_9O6Wm433IMMxt8fiSmpBLQJO1nGDFas84w'
            }
          />
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-bold">
              {latestEpisodes[0]?.title || 'AI 播客'}
            </p>
            <p className="truncate text-xs text-secondary-text-dark">
              {latestEpisodes[0]?.description || '加载中...'}
            </p>
          </div>
          <button className="flex items-center justify-center hover:opacity-80 transition-opacity">
            <span className="material-symbols-outlined !text-4xl">play_circle</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default Home;
