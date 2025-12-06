import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { topicApi } from '@/services/topicApi';
import { CATEGORY_OPTIONS } from '@/utils/constants';
import { useLocale } from '@/hooks/useLocale';
import type { TopicWithStats } from '@/types';

/**
 * TopicList 组件 - 主题播客列表页面
 * 功能特性：
 * - 显示所有主题或仅活跃主题
 * - 支持按分类筛选
 * - 显示活跃状态徽章
 * - 显示剧集数量和统计信息
 */
const TopicList = () => {
    const { t } = useLocale();
    const [topics, setTopics] = useState<TopicWithStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<{
        activeOnly: boolean
        category?: string
    }>({
        activeOnly: true,
        category: undefined,
    });
    const navigate = useNavigate();

    const fetchTopics = useCallback(async () => {
        try {
            setLoading(true);
            const response = await topicApi.getTopics({
                is_active: filter.activeOnly ? true : undefined,
                category: filter.category,
            });
            if (response.success) {
                setTopics(response.data.topics);
            } else {
                setError(t('topicList.fetchFailed'));
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : t('common.unknown'));
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        fetchTopics();
    }, [fetchTopics]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-secondary-text-dark">{t('common.loading')}</p>
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
                    {t('topicList.title')}
                </h1>
                <button className="flex h-12 w-12 items-center justify-center text-slate-800 dark:text-white hover:bg-white/10 rounded-full transition-colors">
                    <span className="material-symbols-outlined text-2xl">search</span>
                </button>
            </header>

            {/* Filter Bar */}
            <div className="sticky top-16 z-9 bg-background-light/80 dark:bg-background-dark/80 px-4 py-3 border-b border-slate-200 dark:border-slate-700 backdrop-blur-sm space-y-3">
                {/* 活跃状态过滤 */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter((prev) => ({ ...prev, activeOnly: true }))}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${filter.activeOnly
                                ? 'bg-primary/20 text-primary ring-1 ring-primary'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                    >
                        {t('topicList.activeOnly')}
                    </button>
                    <button
                        onClick={() => setFilter((prev) => ({ ...prev, activeOnly: false }))}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${!filter.activeOnly
                                ? 'bg-primary/20 text-primary ring-1 ring-primary'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                    >
                        {t('topicList.allTopics')}
                    </button>
                </div>

                {/* 分类过滤 */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                    <button
                        onClick={() => setFilter((prev) => ({ ...prev, category: undefined }))}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${!filter.category
                                ? 'bg-slate-300 dark:bg-slate-600 text-slate-900 dark:text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                            }`}
                    >
                        {t('topicList.allCategories')}
                    </button>
                    {CATEGORY_OPTIONS.map((cat) => (
                        <button
                            key={cat.value}
                            onClick={() => setFilter((prev) => ({ ...prev, category: cat.value }))}
                            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${filter.category === cat.value
                                    ? 'bg-slate-300 dark:bg-slate-600 text-slate-900 dark:text-white'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                                }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

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
                                    {t('topicList.noTopics')}
                                </h2>
                                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                                    {t('topicList.startFirstDesc')}
                                </p>
                            </div>
                            <Link to="/topics/create" className="mt-8">
                                <button className="flex h-10 min-w-[120px] cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-primary px-5 text-sm font-bold text-white hover:bg-primary/90 transition-colors">
                                    <span>{t('topicList.createSeries')}</span>
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
                                    <div className="flex items-center gap-2 mb-1">
                                         <h3 className="truncate text-base font-bold text-slate-900 dark:text-white flex-1">
                                             {topic.title}
                                         </h3>
                                         {topic.is_active && (
                                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full whitespace-nowrap flex-shrink-0">
                                                  <span className="w-1.5 h-1.5 bg-green-600 dark:bg-green-400 rounded-full" />
                                                  {t('topicList.activeOnly')}
                                              </span>
                                          )}
                                     </div>
                                     <p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-400">
                                         {topic.description}
                                     </p>
                                </div>
                                <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 flex-shrink-0">
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
