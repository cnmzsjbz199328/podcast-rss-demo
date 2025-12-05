import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { topicApi } from '@/services/topicApi';
import { topicFormatters } from '@/utils/formatters';
import { getRandomCoverImage } from '@/utils/helpers';
import { CATEGORY_OPTIONS, DEFAULT_GENERATION_INTERVAL_HOURS, FORM_VALIDATION } from '@/utils/constants';
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
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [editValues, setEditValues] = useState<{
        is_active: boolean;
        generation_interval_hours: number | string;
    }>({
        is_active: true,
        generation_interval_hours: DEFAULT_GENERATION_INTERVAL_HOURS,
    });
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!topicId) return;

        const fetchTopic = async () => {
            try {
                const [topicResponse, podcastResponse] = await Promise.all([
                    topicApi.getTopic(parseInt(topicId)),
                    topicApi.getTopicPodcasts(parseInt(topicId))
                ]);

                if (topicResponse.success) {
                    setTopic(topicResponse.data.topic);

                    // Merge stats with full podcast list
                    const stats = topicResponse.data.stats || {
                        totalEpisodes: 0,
                        totalDuration: 0,
                        avgDuration: 0,
                        totalWordCount: 0,
                        avgWordCount: 0,
                        recentEpisodes: []
                    };

                    if (podcastResponse.success && podcastResponse.data?.podcasts) {
                        // 按创建时间排序，然后分配剧集编号
                        const sortedPodcasts = [...podcastResponse.data.podcasts].sort((a: any, b: any) =>
                            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                        );
                        stats.recentEpisodes = sortedPodcasts.map((p: any, index: number) => ({
                            episodeNumber: index + 1,
                            episodeId: p.episodeId,
                            title: p.title,
                            createdAt: p.createdAt
                        }));
                        stats.totalEpisodes = podcastResponse.data.pagination.total || sortedPodcasts.length;
                    }
                    setStats(stats);

                    setEditValues({
                        is_active: topicResponse.data.topic.is_active,
                        generation_interval_hours: topicResponse.data.topic.generation_interval_hours,
                    });
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
            setError(null);
            setSuccessMessage(null);
            const response = await topicApi.generateNextTopicEpisode(parseInt(topicId));

            if (response.success) {
                setSuccessMessage('下一集已生成成功！');
                const [topicResponse, podcastResponse] = await Promise.all([
                    topicApi.getTopic(parseInt(topicId)),
                    topicApi.getTopicPodcasts(parseInt(topicId))
                ]);

                if (topicResponse.success) {
                    setTopic(topicResponse.data.topic);
                    const stats = topicResponse.data.stats || {
                        totalEpisodes: 0,
                        totalDuration: 0,
                        avgDuration: 0,
                        totalWordCount: 0,
                        avgWordCount: 0,
                        recentEpisodes: []
                    };

                    if (podcastResponse.success && podcastResponse.data?.podcasts) {
                        const sortedPodcasts = [...podcastResponse.data.podcasts].sort((a: any, b: any) =>
                            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                        );
                        stats.recentEpisodes = sortedPodcasts.map((p: any, index: number) => ({
                            episodeNumber: index + 1,
                            episodeId: p.episodeId,
                            title: p.title,
                            createdAt: p.createdAt
                        }));
                        stats.totalEpisodes = podcastResponse.data.pagination.total || sortedPodcasts.length;
                    }
                    setStats(stats);
                }
                // 3秒后自动清除成功提示
                setTimeout(() => setSuccessMessage(null), 3000);
            } else {
                // 处理业务错误（如生成间隔未达到）
                const errorMsg = response.message || '生成失败';
                setError(errorMsg);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '生成失败');
        } finally {
            setGenerating(false);
        }
    };

    const handleChangeActiveStatus = (value: boolean) => {
        setEditValues((prev) => ({
            ...prev,
            is_active: value,
        }));
        setHasChanges(true);
    };

    const clampGenerationInterval = (value: number) => {
        if (Number.isNaN(value)) {
            return DEFAULT_GENERATION_INTERVAL_HOURS;
        }
        return Math.min(
            FORM_VALIDATION.GENERATION_INTERVAL.MAX,
            Math.max(FORM_VALIDATION.GENERATION_INTERVAL.MIN, value)
        );
    };

    const handleGenerationIntervalInput = (value: string) => {
        // Allow empty string to let users clear the input
        if (value === '') {
            setEditValues((prev) => ({
                ...prev,
                generation_interval_hours: '',
            }));
        } else {
            const numValue = parseInt(value, 10);
            if (!Number.isNaN(numValue)) {
                setEditValues((prev) => ({
                    ...prev,
                    generation_interval_hours: clampGenerationInterval(numValue),
                }));
            }
        }
        setHasChanges(true);
    };

    const handleSaveChanges = async () => {
        if (!topicId || !topic || !hasChanges) return;

        try {
            setIsSaving(true);
            setError(null);
            
            // Validate generation_interval_hours
            let intervalValue = editValues.generation_interval_hours;
            if (intervalValue === '' || Number.isNaN(intervalValue)) {
                setError('请输入有效的生成间隔时间');
                setIsSaving(false);
                return;
            }
            
            const numericInterval = typeof intervalValue === 'string' 
                ? parseInt(intervalValue, 10) 
                : intervalValue;
            
            const response = await topicApi.updateTopic(parseInt(topicId), {
                is_active: editValues.is_active,
                generation_interval_hours: numericInterval,
            });

            // 判断保存是否成功（API返回success: true即为成功）
            if (response.success) {
                // 无论API返回什么，直接用editValues更新本地状态
                // （因为已经成功保存到数据库）
                setTopic((prev) =>
                    prev
                        ? {
                            ...prev,
                            is_active: editValues.is_active,
                            generation_interval_hours: numericInterval,
                        }
                        : null
                );
                setHasChanges(false);
            } else {
                setError('保存失败，请稍后重试');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '保存失败');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-secondary-text-dark">加载中...</p>
            </div>
        );
    }

    if (!topic) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-6 py-4 rounded-lg">
                    主题不存在
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
                <div className="flex w-10 items-center justify-center" />
            </div>

            {/* Error Alert */}
            {error && (
                <div className="mx-4 mt-4 flex items-start gap-3 rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-red-600 dark:text-red-400">
                    <span className="material-symbols-outlined shrink-0 text-xl">error</span>
                    <div className="flex-1">
                        <p className="font-medium">{error}</p>
                    </div>
                    <button
                        onClick={() => setError(null)}
                        className="shrink-0 hover:opacity-70 transition-opacity"
                    >
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>
            )}

            {/* Success Alert */}
            {successMessage && (
                <div className="mx-4 mt-4 flex items-start gap-3 rounded-lg bg-green-500/10 border border-green-500/20 p-4 text-green-600 dark:text-green-400">
                    <span className="material-symbols-outlined shrink-0 text-xl">check_circle</span>
                    <div className="flex-1">
                        <p className="font-medium">{successMessage}</p>
                    </div>
                    <button
                        onClick={() => setSuccessMessage(null)}
                        className="shrink-0 hover:opacity-70 transition-opacity"
                    >
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>
            )}

            <div className="flex flex-col gap-4">
                {/* ProfileHeader */}
                <div className="flex p-4 @container">
                    <div className="flex w-full flex-col items-start gap-4">
                        <div className="flex w-full flex-col items-start gap-4 sm:flex-row">
                            <div
                                className="aspect-square w-32 shrink-0 rounded-lg bg-cover bg-center bg-no-repeat"
                                style={{
                                    backgroundImage: `url('${topic.imageUrl ||
                                        getRandomCoverImage(topic.id)
                                        }')`,
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

                {/* Metadata - Editable Section */}
                <div className="px-4 space-y-3">
                    <div className="grid gap-3 md:grid-cols-3">
                        <div className="flex items-center justify-between rounded-lg bg-white/60 px-4 py-3 dark:bg-slate-800/40">
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                                <span className="material-symbols-outlined text-base text-slate-500 dark:text-slate-400">
                                    {editValues.is_active ? 'toggle_on' : 'toggle_off'}
                                </span>
                                status
                            </div>
                            <label className="relative inline-flex cursor-pointer items-center">
                                <input
                                    checked={editValues.is_active}
                                    onChange={(e) => handleChangeActiveStatus(e.target.checked)}
                                    className="peer sr-only"
                                    type="checkbox"
                                />
                                <div className="peer h-6 w-11 rounded-full bg-slate-300 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-green-600 peer-checked:after:translate-x-full peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-600/50 dark:bg-slate-700" />
                            </label>
                        </div>

                        <div className="flex items-center justify-between rounded-lg bg-white/60 px-4 py-3 dark:bg-slate-800/40">
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                                <span className="material-symbols-outlined text-base text-slate-500 dark:text-slate-400">schedule</span>
                                generation interval
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min={FORM_VALIDATION.GENERATION_INTERVAL.MIN}
                                    max={FORM_VALIDATION.GENERATION_INTERVAL.MAX}
                                    step={1}
                                    value={editValues.generation_interval_hours}
                                    onChange={(e) => handleGenerationIntervalInput(e.target.value)}
                                    className="w-16 rounded-lg bg-white p-2.5 text-base font-medium text-slate-900 text-center focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:text-white"
                                />
                                <span className="text-sm text-slate-500 dark:text-slate-400">hours</span>
                            </div>
                        </div>

                        <div className="rounded-lg bg-white/60 px-4 py-3 dark:bg-slate-800/40 flex">
                            <p className="mt-2 text-base font-semibold text-slate-900 dark:text-white">
                                {CATEGORY_OPTIONS.find((c) => c.value === topic.category)?.label || topic.category}
                            </p>
                        </div>
                    </div>

                    {(topic.keywords || topic.tags) && (
                        <div className="flex flex-wrap gap-2">
                            {/* 
                             * keywords 是逗号分隔的字符串（从数据库返回）
                             * tags 是数组（创建时发送的格式）
                             * 这里需要兼容两种格式
                             */}
                            {(typeof topic.keywords === 'string'
                                ? topic.keywords.split(',').map(k => k.trim()).filter(Boolean)
                                : topic.tags || []
                            ).map((tag, idx) => (
                                <span
                                    key={idx}
                                    className="inline-block px-2.5 py-1 bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary text-xs font-medium rounded-full"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* SectionHeader with Sort Control */}
                <div className="px-4 pb-2 pt-6 flex items-center justify-between">
                    <h3 className="text-lg font-bold leading-tight tracking-[-0.015em] text-slate-900 dark:text-white">
                        所有剧集<span className="text-base font-medium text-slate-600 dark:text-slate-400">（{stats?.totalEpisodes || topic.episode_count} 集）</span>
                    </h3>
                    <button
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/40 rounded-lg transition-colors"
                    >
                        <span className="material-symbols-outlined text-base">
                            {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                        </span>
                        {sortOrder === 'asc' ? '时间正序' : '时间倒序'}
                    </button>
                </div>

                {/* Episode List */}
                {stats && stats.recentEpisodes.length > 0 ? (
                    [...stats.recentEpisodes].sort((a, b) => {
                        const dateA = new Date(a.createdAt).getTime();
                        const dateB = new Date(b.createdAt).getTime();
                        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
                    }).map((episode) => (
                        <Link
                            key={episode.episodeId}
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
                                    <p className="text-base font-medium leading-normal text-slate-900 dark:text-white line-clamp-2">
                                        {episode.title}
                                    </p>
                                    <p className="text-xs font-normal leading-normal text-slate-500 dark:text-slate-400 mt-1">
                                        第 {episode.episodeNumber} 集 • {topicFormatters.createdAt(episode.createdAt)}
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

            {/* Action Buttons */}
            <div className="fixed bottom-6 right-6 flex flex-col-reverse gap-3">
                {hasChanges && (
                    <button
                        onClick={handleSaveChanges}
                        disabled={isSaving}
                        className="flex h-14 min-w-[140px] cursor-pointer items-center justify-center gap-2 rounded-full bg-blue-500 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-background-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        <span className="material-symbols-outlined">save</span>
                        <span className="text-sm font-bold">{isSaving ? '保存中...' : '保存'}</span>
                    </button>
                )}
                <div title="生成下一集" className="group">
                    <Button
                        onClick={handleGenerateNext}
                        loading={generating}
                        className="flex h-16 w-16 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full shadow-lg"
                    >
                        <span className="material-symbols-outlined !text-3xl">auto_awesome</span>
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default TopicDetail;
