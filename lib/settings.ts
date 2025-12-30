import { load } from '@tauri-apps/plugin-store';

export interface AISettings {
  apiKey: string;
  provider: 'gateway' | 'openai' | 'google' | 'anthropic';
  textModel: string;
  embeddingModel: string;
  imageModel: string;
}

const STORE_PATH = 'ai-settings.json';
const SETTINGS_KEY = 'settings';

const DEFAULT_SETTINGS: AISettings = {
  apiKey: '',
  provider: 'gateway',
  textModel: 'openai/gpt-4o',
  embeddingModel: 'openai/text-embedding-3-small',
  imageModel: 'openai/dall-e-3',
};

let storeInstance: Awaited<ReturnType<typeof load>> | null = null;

async function getStore() {
  if (!storeInstance) {
    storeInstance = await load(STORE_PATH);
  }
  return storeInstance;
}

export async function loadSettings(): Promise<AISettings> {
  try {
    const store = await getStore();
    const settings = await store.get<AISettings>(SETTINGS_KEY);
    return settings ?? DEFAULT_SETTINGS;
  } catch (error) {
    console.warn('Failed to load settings, using defaults:', error);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AISettings): Promise<void> {
  const store = await getStore();
  await store.set(SETTINGS_KEY, settings);
  await store.save();
}

export async function getApiKey(): Promise<string> {
  const settings = await loadSettings();
  return settings.apiKey;
}

export async function getTextModel(): Promise<string> {
  const settings = await loadSettings();
  return settings.textModel;
}

export async function getImageModel(): Promise<string> {
  const settings = await loadSettings();
  return settings.imageModel;
}
