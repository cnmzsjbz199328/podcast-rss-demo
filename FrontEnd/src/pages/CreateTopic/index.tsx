import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { topicApi } from '@/services/topicApi';
import { CATEGORY_OPTIONS, FORM_VALIDATION, DEFAULT_GENERATION_INTERVAL_HOURS } from '@/utils/constants';
import { useLocale } from '@/hooks/useLocale';
import type { CreateTopicRequest } from '@/types';

interface FormErrors {
    title?: string
    description?: string
    keywords?: string
    generation_interval_hours?: string
}

/**
 * CreateTopic 组件 - 主题播客创建表单
 * 
 * 字段映射说明：
 * - 前端表单：使用 keywords 字符串收集用户输入（逗号分隔）
 * - 前端提交：直接发送 keywords 字符串
 * - 后端存储：直接存储到数据库 keywords 字段
 * - 数据库：keywords TEXT 字段
 * - 完全与数据库对齐，无需任何转换
 * 
 * 功能特性：
 * - 支持所有字段：title, description, category, keywords, is_active, generation_interval_hours
 * - 完整的输入校验（标题长度、生成间隔等）
 * - 实时错误提示和成功反馈
 * - 防止重复提交（按钮禁用状态 + Loading动画）
 * - 提交后自动导航到话题详情页
 * - 直接字段映射，无需数据转换
 */
const CreateTopic = () => {
    const navigate = useNavigate();
    const { t, tf } = useLocale();
    const [formData, setFormData] = useState<CreateTopicRequest>({
        title: '',
        description: '',
        is_active: true,
    generation_interval_hours: DEFAULT_GENERATION_INTERVAL_HOURS,
        category: 'general',
        keywords: '',
    });
    const [formErrors, setFormErrors] = useState<FormErrors>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    /**
     * 验证表单数据的完整性
     * 检查 title, description, keywords, generation_interval_hours 的有效性
     */
    const validateForm = useCallback((): boolean => {
        const errors: FormErrors = {};
        let isValid = true;

        // 验证标题
        if (!formData.title.trim()) {
            errors.title = t('createTopic.validation.titleRequired');
            isValid = false;
        } else if (formData.title.length < FORM_VALIDATION.TITLE.MIN_LENGTH) {
            errors.title = tf('createTopic.validation.titleMinLength', { min: FORM_VALIDATION.TITLE.MIN_LENGTH });
            isValid = false;
        } else if (formData.title.length > FORM_VALIDATION.TITLE.MAX_LENGTH) {
            errors.title = tf('createTopic.validation.titleMaxLength', { max: FORM_VALIDATION.TITLE.MAX_LENGTH });
            isValid = false;
        }

        // 验证描述
        if (formData.description && formData.description.length > FORM_VALIDATION.DESCRIPTION.MAX_LENGTH) {
            errors.description = tf('createTopic.validation.descriptionMaxLength', { max: FORM_VALIDATION.DESCRIPTION.MAX_LENGTH });
            isValid = false;
        }

        // 验证生成间隔
        if (formData.generation_interval_hours) {
            if (formData.generation_interval_hours < FORM_VALIDATION.GENERATION_INTERVAL.MIN) {
                errors.generation_interval_hours = tf('createTopic.validation.intervalMin', { min: FORM_VALIDATION.GENERATION_INTERVAL.MIN });
                isValid = false;
            } else if (formData.generation_interval_hours > FORM_VALIDATION.GENERATION_INTERVAL.MAX) {
                errors.generation_interval_hours = tf('createTopic.validation.intervalMax', { max: FORM_VALIDATION.GENERATION_INTERVAL.MAX });
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
                        ? parseInt(value) || DEFAULT_GENERATION_INTERVAL_HOURS
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
                // 后端返回格式：{ success: true, data: { topicId: number } }
                if (response.success && response.data && response.data.topicId) {
                    setSuccess(`成功创建主题 "${formData.title}"`);
                    setTimeout(() => {
                        navigate(`/topics/${response.data!.topicId}`);
                    }, 1500);
                } else {
                    const errorMsg = response.error || t('createTopic.createFailed');
                    setError(errorMsg);
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : t('common.unknown');
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        },
        [formData, validateForm, navigate, t, tf]
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
                    {t('createTopic.title')}
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
                            {t('createTopic.basicInfo')}
                        </h2>
                        <div className="space-y-4">
                            <label className="flex flex-col">
                                <div className="flex items-center justify-between pb-2">
                                    <p className="text-slate-700 dark:text-slate-300 text-sm font-medium leading-normal">
                                        {t('createTopic.seriesTitle')} <span className="text-red-500">*</span>
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
                                    placeholder={t('placeholders.seriesTitle')}
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
                                        {t('createTopic.seriesDescription')}
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
                                    placeholder={t('placeholders.seriesDescription')}
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
                            {t('createTopic.generationSettings')}
                        </h2>
                        <div className="grid gap-3 md:grid-cols-3">
                            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
                                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                                    <span className="material-symbols-outlined text-base text-slate-500 dark:text-slate-400">toggle_off</span>
                                    {t('createTopic.status')}
                                </div>
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

                            <div className="rounded-xl border border-slate-200 bg-white/90 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40">
                                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                                    <span className="material-symbols-outlined text-base text-slate-500 dark:text-slate-400">schedule</span>
                                    {t('createTopic.generationInterval')}
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                    <input
                                        className={`w-full rounded-lg border bg-slate-50 p-2.5 text-base font-medium text-slate-900 focus:border-primary focus:ring-primary dark:border-slate-600 dark:bg-slate-800 dark:text-white ${formErrors.generation_interval_hours
                                                ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/50'
                                                : 'border-slate-300'
                                            }`}
                                        type="number"
                                        min={FORM_VALIDATION.GENERATION_INTERVAL.MIN}
                                        max={FORM_VALIDATION.GENERATION_INTERVAL.MAX}
                                        step={1}
                                        name="generation_interval_hours"
                                        value={formData.generation_interval_hours}
                                        onChange={handleInputChange}
                                    />
                                    <span className="text-sm text-slate-500 dark:text-slate-400">{t('playback.hours')}</span>
                                </div>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    {tf('createTopic.generationIntervalDesc', { default: DEFAULT_GENERATION_INTERVAL_HOURS, min: FORM_VALIDATION.GENERATION_INTERVAL.MIN, max: FORM_VALIDATION.GENERATION_INTERVAL.MAX })}
                                </p>
                                {formErrors.generation_interval_hours && (
                                    <div className="mt-1 text-red-600 dark:text-red-400 text-sm flex items-center gap-1">
                                        <span className="material-symbols-outlined text-base">error</span>
                                        {formErrors.generation_interval_hours}
                                    </div>
                                )}
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white/90 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40">
                                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                                    <span className="material-symbols-outlined text-base text-slate-500 dark:text-slate-400">label</span>
                                    {t('createTopic.category')}
                                </div>
                                <div className="relative mt-2">
                                    <select
                                        className="w-full appearance-none rounded-lg border-slate-300 bg-slate-50 p-2.5 text-base text-slate-900 focus:border-primary focus:ring-primary dark:border-slate-600 dark:bg-slate-800 dark:text-white"
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
                            </div>
                        </div>
                    </section>

                    {/* Section 3: 内容关键词 */}
                    <section className="mb-6">
                        <h2 className="text-slate-800 dark:text-white text-lg font-bold leading-tight tracking-tight px-0 pb-2 pt-4">
                            {t('createTopic.contentKeywords')}
                        </h2>
                        <div className="space-y-3">
                            <label className="flex flex-col">
                                <div className="flex items-center justify-between pb-2">
                                    <p className="text-slate-700 dark:text-slate-300 text-sm font-medium leading-normal">
                                        {t('createTopic.keywordsLabel')}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {(formData.keywords?.length || 0)}/200
                                    </p>
                                </div>
                                <textarea
                                    className={`w-full rounded-lg border bg-slate-100 p-3 text-base font-normal leading-normal text-slate-900 placeholder:text-slate-400 focus:ring-1 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 min-h-20 resize-none ${formErrors.keywords
                                            ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/50'
                                            : 'border-slate-300 focus:border-primary focus:ring-primary'
                                        }`}
                                    placeholder={t('placeholders.keywords')}
                                    name="keywords"
                                    value={formData.keywords || ''}
                                    onChange={handleInputChange}
                                    maxLength={200}
                                />
                                {formErrors.keywords && (
                                    <div className="text-red-600 dark:text-red-400 text-sm flex items-center gap-1 mt-1">
                                        <span className="material-symbols-outlined text-base">error</span>
                                        {formErrors.keywords}
                                    </div>
                                )}
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    {t('createTopic.keywordsTip')}
                                </p>
                            </label>
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
                    <div className="flex items-center justify-center gap-2">
                        {loading && (
                            <span className="inline-block animate-spin">
                                <span className="material-symbols-outlined text-xl">sync</span>
                            </span>
                        )}
                        <span>{loading ? t('createTopic.creating') : t('createTopic.completeCreate')}</span>
                    </div>
                </button>
            </footer>
        </div>
    );
};

export default CreateTopic;
