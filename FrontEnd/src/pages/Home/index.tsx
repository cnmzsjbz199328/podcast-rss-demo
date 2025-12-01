import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { podcastApi } from '@/services/podcastApi';
import { episodeFormatters } from '@/utils/formatters';
import { getRandomCoverImage } from '@/utils/helpers';
import Button from '@/components/common/Button';
import { EpisodeSearchBar } from '@/components/EpisodeSearchBar';
import type { Episode, SearchedEpisode } from '@/types';

/**
 * Home 组件 - 首页
 * 展示精选和最新播客剧集
 */
const Home = () => {
    const navigate = useNavigate();
    const [featuredEpisodes, setFeaturedEpisodes] = useState<Episode[]>([]);
    const [latestEpisodes, setLatestEpisodes] = useState<Episode[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchResults, setSearchResults] = useState<SearchedEpisode[] | null>(null);

    useEffect(() => {
        const fetchEpisodes = async () => {
            try {
                const response = await podcastApi.getEpisodes({ limit: 20 });
                if (response.success) {
                    const episodes = response.data.episodes;
                    setFeaturedEpisodes(episodes.slice(0, 3));
                    setLatestEpisodes(episodes.slice(0, 6));
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
                <div className="flex-1">
                    <EpisodeSearchBar
                        onResults={(results) => setSearchResults(results)}
                        onSelect={(episode) => navigate(`/podcast/${episode.id}`)}
                        placeholder="搜索新闻、主题或创作者"
                    />
                </div>
                <Link to="/topics" className="flex items-center justify-center hover:opacity-80 transition-opacity" aria-label="我的主题">
                    <span className="material-symbols-outlined text-white text-2xl">podcasts</span>
                </Link>
            </header>

            {/* Main Content */}
            <main className="flex flex-col">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-4 py-3 m-4 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Show search results if available */}
                {searchResults !== null && searchResults.length > 0 ? (
                    <div className="flex flex-col">
                        <h2 className="text-[22px] font-bold leading-tight tracking-[-0.015em] text-white dark:text-white px-4 py-4">
                            搜索结果 ({searchResults.length})
                        </h2>
                        <div className="flex flex-col gap-2 px-4 pb-4">
                            {searchResults.map((episode) => (
                                <Link
                                    key={episode.id}
                                    to={`/podcast/${episode.id}`}
                                    className="flex items-center gap-4 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-700 transition-colors group"
                                >
                                    <button className="flex-shrink-0 flex size-9 items-center justify-center rounded-full bg-primary/80 hover:bg-primary transition-colors">
                                        <span className="material-symbols-outlined text-white pl-0.5 text-lg">
                                            play_arrow
                                        </span>
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <p className="truncate text-base font-medium leading-normal text-white dark:text-white">
                                            {episode.title}
                                        </p>
                                        <p className="text-sm font-normal leading-normal text-slate-400 dark:text-slate-400 truncate">
                                            {episode.description}
                                        </p>
                                    </div>
                                    <span className="material-symbols-outlined text-slate-400 flex-shrink-0">
                                        chevron_right
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* No search results message */}
                        {searchResults !== null && searchResults.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <span className="material-symbols-outlined text-6xl text-slate-400 dark:text-slate-500 mb-4">
                                    search
                                </span>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-8">
                                    未找到匹配的剧集
                                </h2>
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
                                        backgroundImage: `url('${episode.imageUrl || getRandomCoverImage(episode.id)}')`
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
                <div className="grid grid-cols-[repeat(auto-fit,minmax(158px,1fr))] gap-3 p-4 pt-0 pb-20">
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
                                        backgroundImage: `url('${episode.imageUrl || getRandomCoverImage(episode.id)}')`
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
                    </>
                )}
            </main>
        </div>
    );
};

export default Home;
