import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { topicApi } from '@/services/topicApi';
import { CATEGORY_OPTIONS, GENERATION_INTERVALS, FORM_VALIDATION } from '@/utils/constants';
import type { CreateTopicRequest } from '@/types';

interface FormErrors {
    title?: string
    description?: string
    tags?: string
    generation_interval_hours?: string
}

/**
 * CreateTopic 组件 - 主题播客创建表单
 * 功能特性：
 * - 支持所有字段：title, description, category, tags, is_active, generation_interval_hours
 * - 完整的输入校验（标题长度、标签数量、生成间隔等）
 * - 实时错误提示和成功反馈
 * - 防止重复提交（按钮禁用状态）
 */
const CreateTopic = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState<CreateTopicRequest>({
        title: '',
        description: '',
        is_active: true,
        generation_interval_hours: 24,
        category: 'general',
        tags: [],
    });
    const [formErrors, setFormErrors] = useState<FormErrors>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [frequency, setFrequency] = useState('daily');
    const [tagInput, setTagInput] = useState('');

    /**
     * 验证表单数据的完整性
     * 检查 title, description, tags, generation_interval_hours 的有效性
     */
    const validateForm = useCallback((): boolean => {
        const errors: FormErrors = {};
        let isValid = true;

        // 验证标题
        if (!formData.title.trim()) {
            errors.title = '标题不能为空';
            isValid = false;
        } else if (formData.title.length < FORM_VALIDATION.TITLE.MIN_LENGTH) {
            errors.title = `标题至少需要 ${FORM_VALIDATION.TITLE.MIN_LENGTH} 个字符`;
            isValid = false;
        } else if (formData.title.length > FORM_VALIDATION.TITLE.MAX_LENGTH) {
            errors.title = `标题不能超过 ${FORM_VALIDATION.TITLE.MAX_LENGTH} 个字符`;
            isValid = false;
        }

        // 验证描述
        if (formData.description && formData.description.length > FORM_VALIDATION.DESCRIPTION.MAX_LENGTH) {
            errors.description = `描述不能超过 ${FORM_VALIDATION.DESCRIPTION.MAX_LENGTH} 个字符`;
            isValid = false;
        }

        // 验证生成间隔
        if (formData.generation_interval_hours) {
            if (formData.generation_interval_hours < FORM_VALIDATION.GENERATION_INTERVAL.MIN) {
                errors.generation_interval_hours = `生成间隔不能少于 ${FORM_VALIDATION.GENERATION_INTERVAL.MIN} 小时`;
                isValid = false;
            } else if (formData.generation_interval_hours > FORM_VALIDATION.GENERATION_INTERVAL.MAX) {
                errors.generation_interval_hours = `生成间隔不能超过 ${FORM_VALIDATION.GENERATION_INTERVAL.MAX} 小时`;
                isValid = false;
            }
        }

        setFormErrors(errors);
        return isValid;
    }, [formData]);

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
            const { name, value } = e.target;
            setFormData((prev) => ({
                ...prev,
                [name]:
                    name === 'generation_interval_hours'
                        ? parseInt(value) || 24
                        : value,
            }));
            // 清除该字段的错误
            if (formErrors[name as keyof FormErrors]) {
                setFormErrors((prev) => ({
                    ...prev,
                    [name]: undefined,
                }));
            }
        },
        [formErrors]
    );

    const handleCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({
            ...prev,
            is_active: e.target.checked,
        }));
    }, []);

    const handleFrequencyChange = useCallback((freq: 'daily' | 'weekly' | 'monthly') => {
        setFrequency(freq);
        const hours = freq === 'daily' ? 24 : freq === 'weekly' ? 168 : 720;
        setFormData((prev) => ({
            ...prev,
            generation_interval_hours: hours,
        }));
        if (formErrors.generation_interval_hours) {
            setFormErrors((prev) => ({
                ...prev,
                generation_interval_hours: undefined,
            }));
        }
    }, [formErrors]);

    const handleAddTag = useCallback(() => {
        const newTag = tagInput.trim();
        if (!newTag) return;

        if (newTag.length > FORM_VALIDATION.TAGS.MAX_LENGTH) {
            setFormErrors((prev) => ({
                ...prev,
                tags: `单个标签长度不能超过 ${FORM_VALIDATION.TAGS.MAX_LENGTH} 个字符`,
            }));
            return;
        }

        if (formData.tags && formData.tags.length >= FORM_VALIDATION.TAGS.MAX_COUNT) {
            setFormErrors((prev) => ({
                ...prev,
                tags: `标签数量不能超过 ${FORM_VALIDATION.TAGS.MAX_COUNT} 个`,
            }));
            return;
        }

        if (formData.tags?.includes(newTag)) {
            setFormErrors((prev) => ({
                ...prev,
                tags: '该标签已存在',
            }));
            return;
        }

        setFormData((prev) => ({
            ...prev,
            tags: [...(prev.tags || []), newTag],
        }));
        setTagInput('');
        setFormErrors((prev) => ({
            ...prev,
            tags: undefined,
        }));
    }, [tagInput, formData.tags]);

    const handleRemoveTag = useCallback((index: number) => {
        setFormData((prev) => ({
            ...prev,
            tags: prev.tags?.filter((_, i) => i !== index) || [],
        }));
    }, []);

    const handleKeyPress = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTag();
            }
        },
        [handleAddTag]
    );

    const handleSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            if (!validateForm()) {
                return;
            }

            try {
                setLoading(true);
                setError(null);
                setSuccess(null);
                const response = await topicApi.createTopic(formData);
                if (response.success && response.data?.topic) {
                    setSuccess(`成功创建主题 "${formData.title}"`);
                    setTimeout(() => {
                        navigate(`/topics/${response.data.topic.id}`);
                    }, 1500);
                } else {
                    setError('创建主题失败，请稍后重试');
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : '创建失败，请检查网络连接';
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        },
        [formData, validateForm, navigate]
    );

    return (
        <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark">
            {/* Top App Bar */}
            <header className="sticky top-0 z-10 flex items-center bg-background-light/80 dark:bg-background-dark/80 p-4 pb-3 backdrop-blur-sm">
                <button
                    className="text-slate-700 dark:text-slate-300 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    onClick={() => navigate(-1)}
                >
                    <span className="material-symbols-outlined text-2xl">arrow_back</span>
                </button>
                <h1 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">
                    创建新的主题播客
                </h1>
            </header>

            <main className="flex-1 px-4 py-2">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg m-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">error</span>
                        {error}
                    </div>
                )}
                {success && (
                    <div className="bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 px-4 py-3 rounded-lg m-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">check_circle</span>
                        {success}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Section 1: 基本信息 */}
                    <section className="mb-6">
                        <h2 className="text-slate-800 dark:text-white text-lg font-bold leading-tight tracking-tight px-0 pb-2 pt-4">
                            基本信息
                        </h2>
                        <div className="space-y-4">
                            <label className="flex flex-col">
                                <div className="flex items-center justify-between pb-2">
                                    <p className="text-slate-700 dark:text-slate-300 text-sm font-medium leading-normal">
                                        播客系列标题 <span className="text-red-500">*</span>
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {formData.title.length}/{FORM_VALIDATION.TITLE.MAX_LENGTH}
                                    </p>
                                </div>
                                <input
                                    className={`w-full rounded-lg border bg-slate-100 p-3 text-base font-normal leading-normal text-slate-900 placeholder:text-slate-400 focus:ring-1 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 ${formErrors.title
                                            ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/50'
                                            : 'border-slate-300 focus:border-primary focus:ring-primary'
                                        }`}
                                    placeholder="例如：AI前沿动态"
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleInputChange}
                                    maxLength={FORM_VALIDATION.TITLE.MAX_LENGTH}
                                    required
                                />
                                {formErrors.title && (
                                    <div className="text-red-600 dark:text-red-400 text-sm flex items-center gap-1 mt-1">
                                        <span className="material-symbols-outlined text-base">error</span>
                                        {formErrors.title}
                                    </div>
                                )}
                            </label>
                            <label className="flex flex-col">
                                <div className="flex items-center justify-between pb-2">
                                    <p className="text-slate-700 dark:text-slate-300 text-sm font-medium leading-normal">
                                        播客系列描述
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {(formData.description?.length || 0)}/{FORM_VALIDATION.DESCRIPTION.MAX_LENGTH}
                                    </p>
                                </div>
                                <textarea
                                    className={`w-full rounded-lg border bg-slate-100 p-3 text-base font-normal leading-normal text-slate-900 placeholder:text-slate-400 focus:ring-1 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 min-h-28 resize-none ${formErrors.description
                                            ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/50'
                                            : 'border-slate-300 focus:border-primary focus:ring-primary'
                                        }`}
                                    placeholder="例如：每周探讨人工智能领域的最新进展和趋势"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    maxLength={FORM_VALIDATION.DESCRIPTION.MAX_LENGTH}
                                />
                                {formErrors.description && (
                                    <div className="text-red-600 dark:text-red-400 text-sm flex items-center gap-1 mt-1">
                                        <span className="material-symbols-outlined text-base">error</span>
                                        {formErrors.description}
                                    </div>
                                )}
                            </label>
                        </div>
                    </section>

                    {/* Section 2: 生成设置 */}
                    <section className="mb-6">
                        <h2 className="text-slate-800 dark:text-white text-lg font-bold leading-tight tracking-tight px-0 pb-2 pt-4">
                            生成设置
                        </h2>
                        <div className="space-y-4">
                            <label className="flex flex-col">
                                <p className="text-slate-700 dark:text-slate-300 text-sm font-medium leading-normal pb-2">
                                    内容分类
                                </p>
                                <div className="relative">
                                    <select
                                        className="form-select w-full appearance-none rounded-lg border-slate-300 bg-slate-100 p-3 text-base text-slate-900 focus:border-primary focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                        name="category"
                                        value={formData.category}
                                        onChange={handleInputChange}
                                    >
                                        {CATEGORY_OPTIONS.map((cat) => (
                                            <option key={cat.value} value={cat.value}>
                                                {cat.label}
                                            </option>
                                        ))}
                                    </select>
                                    <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                                        expand_more
                                    </span>
                                </div>
                            </label>
                        </div>
                    </section>

                    {/* Section 3: 标签 */}
                    <section className="mb-6">
                        <h2 className="text-slate-800 dark:text-white text-lg font-bold leading-tight tracking-tight px-0 pb-2 pt-4">
                            内容标签
                        </h2>
                        <div className="space-y-3">
                            <div className="flex gap-2">
                                <input
                                    className={`flex-1 rounded-lg border bg-slate-100 p-3 text-base font-normal leading-normal text-slate-900 placeholder:text-slate-400 focus:ring-1 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 ${formErrors.tags
                                            ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/50'
                                            : 'border-slate-300 focus:border-primary focus:ring-primary'
                                        }`}
                                    placeholder={`例如：AI、机器学习（最多${FORM_VALIDATION.TAGS.MAX_COUNT}个标签）`}
                                    type="text"
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    disabled={formData.tags && formData.tags.length >= FORM_VALIDATION.TAGS.MAX_COUNT}
                                />
                                <button
                                    type="button"
                                    onClick={handleAddTag}
                                    disabled={!tagInput.trim() || (formData.tags && formData.tags.length >= FORM_VALIDATION.TAGS.MAX_COUNT)}
                                    className="px-4 py-3 bg-slate-200 dark:bg-slate-700 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <span className="material-symbols-outlined">add</span>
                                </button>
                            </div>
                            {formErrors.tags && (
                                <div className="text-red-600 dark:text-red-400 text-sm flex items-center gap-1">
                                    <span className="material-symbols-outlined text-base">error</span>
                                    {formErrors.tags}
                                </div>
                            )}
                            {formData.tags && formData.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {formData.tags.map((tag, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center gap-2 px-3 py-1 bg-primary/20 text-primary dark:bg-primary/20 dark:text-primary rounded-full text-sm"
                                        >
                                            <span>{tag}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveTag(idx)}
                                                className="hover:opacity-70 transition-opacity"
                                            >
                                                <span className="material-symbols-outlined text-base">close</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Section 4: 更新规则 */}
                    <section className="mb-8">
                        <h2 className="text-slate-800 dark:text-white text-lg font-bold leading-tight tracking-tight px-0 pb-2 pt-4">
                            更新规则
                        </h2>
                        <div className="space-y-4">
                            <div className="flex flex-col">
                                <p className="text-slate-700 dark:text-slate-300 text-sm font-medium leading-normal pb-3">
                                    生成频率
                                </p>
                                {formErrors.generation_interval_hours && (
                                    <div className="text-red-600 dark:text-red-400 text-sm flex items-center gap-1 mb-2">
                                        <span className="material-symbols-outlined text-base">error</span>
                                        {formErrors.generation_interval_hours}
                                    </div>
                                )}
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleFrequencyChange('daily')}
                                        className={`px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${frequency === 'daily'
                                                ? 'bg-primary/20 text-primary ring-1 ring-primary dark:bg-primary/20 dark:text-primary dark:ring-primary'
                                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                                            }`}
                                    >
                                        {GENERATION_INTERVALS.DAILY.label}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleFrequencyChange('weekly')}
                                        className={`px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${frequency === 'weekly'
                                                ? 'bg-primary/20 text-primary ring-1 ring-primary dark:bg-primary/20 dark:text-primary dark:ring-primary'
                                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                                            }`}
                                    >
                                        {GENERATION_INTERVALS.WEEKLY.label}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleFrequencyChange('monthly')}
                                        className={`px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${frequency === 'monthly'
                                                ? 'bg-primary/20 text-primary ring-1 ring-primary dark:bg-primary/20 dark:text-primary dark:ring-primary'
                                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                                            }`}
                                    >
                                        {GENERATION_INTERVALS.MONTHLY.label}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between rounded-lg bg-slate-100 p-3 dark:bg-slate-800">
                                <p className="text-slate-700 dark:text-slate-300 text-sm font-medium leading-normal flex items-center">
                                    生成后自动发布
                                    <span
                                        className="material-symbols-outlined ml-1.5 text-base text-slate-400 dark:text-slate-500 cursor-help"
                                        title="开启后，新生成的播客会自动添加到播放列表"
                                    >
                                        info
                                    </span>
                                </p>
                                <label className="relative inline-flex cursor-pointer items-center">
                                    <input
                                        checked={formData.is_active}
                                        onChange={handleCheckboxChange}
                                        className="peer sr-only"
                                        type="checkbox"
                                    />
                                    <div className="peer h-6 w-11 rounded-full bg-slate-300 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-green-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-600/50 dark:bg-slate-700 dark:border-slate-600" />
                                </label>
                            </div>
                        </div>
                    </section>
                </form>
            </main>

            {/* Floating Action Button */}
            <footer className="sticky bottom-0 bg-background-light/80 dark:bg-background-dark/80 px-4 py-4 backdrop-blur-sm">
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full flex h-14 cursor-pointer items-center justify-center rounded-xl bg-primary px-5 text-base font-bold text-white shadow-lg shadow-primary/30 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-background-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {loading ? '创建中...' : '完成并创建'}
                </button>
            </footer>
        </div>
    );
};

export default CreateTopic;
