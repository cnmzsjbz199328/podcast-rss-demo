import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { topicApi } from '@/services/topicApi';
import type { CreateTopicRequest } from '@/types';

const CreateTopic = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<CreateTopicRequest>({
    title: '',
    description: '',
    is_active: true,
    generation_interval_hours: 24,
    category: '',
    tags: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [frequency, setFrequency] = useState('daily');
  const [tagInput, setTagInput] = useState('');

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'generation_interval_hours'
          ? parseInt(value) || 24
          : value,
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      is_active: e.target.checked,
    }));
  };

  const handleFrequencyChange = (freq: 'daily' | 'weekly' | 'monthly') => {
    setFrequency(freq);
    const hours = freq === 'daily' ? 24 : freq === 'weekly' ? 168 : 720;
    setFormData((prev) => ({
      ...prev,
      generation_interval_hours: hours,
    }));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && formData.tags && formData.tags.length < 5) {
      setFormData((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('标题不能为空');
      return;
    }

    if (formData.title.length < 2) {
      setError('标题至少需要2个字符');
      return;
    }

    if (formData.title.length > 100) {
      setError('标题不能超过100个字符');
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
        }, 1000);
      } else {
        setError('创建主题失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setLoading(false);
    }
  };

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
                <p className="text-slate-700 dark:text-slate-300 text-sm font-medium leading-normal pb-2">
                  播客系列标题 <span className="text-red-500">*</span>
                </p>
                <input
                  className="w-full rounded-lg border border-slate-300 bg-slate-100 p-3 text-base font-normal leading-normal text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
                  placeholder="例如：AI前沿动态"
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
              </label>
              <label className="flex flex-col">
                <p className="text-slate-700 dark:text-slate-300 text-sm font-medium leading-normal pb-2">
                  播客系列描述
                </p>
                <textarea
                  className="w-full rounded-lg border border-slate-300 bg-slate-100 p-3 text-base font-normal leading-normal text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 min-h-28 resize-none"
                  placeholder="例如：每周探讨人工智能领域的最新进展和趋势"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                />
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
                    <option value="">选择分类</option>
                    <option value="technology">技术</option>
                    <option value="science">科学</option>
                    <option value="business">商业</option>
                    <option value="education">教育</option>
                    <option value="lifestyle">生活</option>
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
                  className="flex-1 rounded-lg border border-slate-300 bg-slate-100 p-3 text-base font-normal leading-normal text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
                  placeholder="例如：AI、机器学习（最多5个标签）"
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={formData.tags && formData.tags.length >= 5}
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  disabled={!tagInput.trim() || (formData.tags && formData.tags.length >= 5)}
                  className="px-4 py-3 bg-slate-200 dark:bg-slate-700 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="material-symbols-outlined">add</span>
                </button>
              </div>
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
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleFrequencyChange('daily')}
                    className={`px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                      frequency === 'daily'
                        ? 'bg-primary/20 text-primary ring-1 ring-primary dark:bg-primary/20 dark:text-primary dark:ring-primary'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    每天
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFrequencyChange('weekly')}
                    className={`px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                      frequency === 'weekly'
                        ? 'bg-primary/20 text-primary ring-1 ring-primary dark:bg-primary/20 dark:text-primary dark:ring-primary'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    每周
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFrequencyChange('monthly')}
                    className={`px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                      frequency === 'monthly'
                        ? 'bg-primary/20 text-primary ring-1 ring-primary dark:bg-primary/20 dark:text-primary dark:ring-primary'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    每月
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
