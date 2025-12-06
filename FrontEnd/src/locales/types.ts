/**
 * 翻译文本类型定义
 * 确保所有语言都有完整的翻译键值对
 */

export interface LocaleStrings {
  // Common
  common: {
    loading: string;
    error: string;
    success: string;
    close: string;
    back: string;
    home: string;
    search: string;
    save: string;
    saved: string;
    saving: string;
    delete: string;
    edit: string;
    create: string;
    cancel: string;
    confirm: string;
    copy: string;
    copied: string;
    share: string;
    shareSuccess: string;
    shareFailed: string;
    unknown: string;
    retry: string;
  };

  // Home Page
  home: {
    searchPlaceholder: string;
    searchResults: string;
    noResults: string;
    latestRelease: string;
    playNow: string;
    fetchFailed: string;
    podcast: string;
  };

  // Podcast Player
  player: {
    fetchFailed: string;
    podcastNotFound: string;
    goBack: string;
    goHome: string;
  };

  // Topic List
  topicList: {
    title: string;
    fetchFailed: string;
    activeOnly: string;
    allTopics: string;
    allCategories: string;
    noTopics: string;
    startFirst: string;
    startFirstDesc: string;
    createSeries: string;
  };

  // Create Topic
  createTopic: {
    title: string;
    basicInfo: string;
    seriesTitle: string;
    seriesDescription: string;
    generationSettings: string;
    status: string;
    generationInterval: string;
    generationIntervalDesc: string;
    category: string;
    contentKeywords: string;
    keywordsLabel: string;
    keywordsPlaceholder: string;
    keywordsTip: string;
    createSuccess: string;
    createFailed: string;
    completeCreate: string;
    creating: string;
    validation: {
      titleRequired: string;
      titleMinLength: string;
      titleMaxLength: string;
      descriptionMaxLength: string;
      intervalMin: string;
      intervalMax: string;
      invalidInterval: string;
    };
  };

  // Topic Detail
  topicDetail: {
    notFound: string;
    allEpisodes: string;
    episodes: string;
    timeAsc: string;
    timeDesc: string;
    noEpisodes: string;
    generateFirst: string;
    generateSuccess: string;
    generateFailed: string;
    generating: string;
    saveChanges: string;
    saveSuccess: string;
    saveFailed: string;
    episode: string;
  };

  // Playback Controls
  playback: {
    speed: string;
    timer: string;
    script: string;
    transcript: string;
    hours: string;
    minutes: string;
  };

  // Categories
  categories: {
    general: string;
    technology: string;
    science: string;
    business: string;
    education: string;
    lifestyle: string;
  };

  // Error Messages
  errors: {
    networkError: string;
    validationError: string;
    serverError: string;
    notFound: string;
    unauthorized: string;
    forbidden: string;
  };

  // Placeholders
  placeholders: {
    seriesTitle: string;
    seriesDescription: string;
    keywords: string;
  };
}

export type Locale = 'en' | 'zh-CN' | 'ja';
export const SUPPORTED_LANGUAGES: Locale[] = ['en', 'zh-CN', 'ja'];
export const DEFAULT_LANGUAGE: Locale = 'en';
