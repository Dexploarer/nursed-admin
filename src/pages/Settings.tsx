
import { useState, useEffect } from 'react';
import { Settings, Key, Cpu, Image, Sparkles, Save, RefreshCw, CheckCircle, AlertCircle, Database, Download, Upload } from 'lucide-react';
import { loadSettings, saveSettings, AISettings } from '@/lib/settings';
import { exportBackup, importBackup } from '@/lib/database-backup';
import { useInstructor } from '@/components/InstructorProvider';

interface ModelOption {
  id: string;
  name: string;
  description?: string;
}

interface AvailableModels {
  text: ModelOption[];
  embedding: ModelOption[];
  image: ModelOption[];
}

export default function SettingsPage() {
  const { displayName } = useInstructor();

  const [settings, setSettings] = useState<AISettings>({
    apiKey: '',
    provider: 'gateway',
    textModel: 'openai/gpt-4o',
    embeddingModel: 'openai/text-embedding-3-small',
    imageModel: 'openai/dall-e-3',
  });

  const [availableModels, setAvailableModels] = useState<AvailableModels>({
    text: [],
    embedding: [],
    image: [],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [backing, setBacking] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadSettings()
      .then(setSettings)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSettings(settings);
      setStatus({ type: 'success', message: 'Settings saved successfully!' });
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to save settings. Please try again.' });
      console.error('Save error:', error);
    } finally {
      setSaving(false);
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const fetchModels = async () => {
    if (!settings.apiKey) {
      setStatus({ type: 'error', message: 'Please enter an API key first.' });
      setTimeout(() => setStatus(null), 3000);
      return;
    }

    setFetchingModels(true);
    setStatus({ type: 'success', message: 'Using default model list. You can select from the available models below.' });
    setFetchingModels(false);
    setTimeout(() => setStatus(null), 3000);
  };

  const handleBackup = async () => {
    setBacking(true);
    try {
      await exportBackup(displayName);
      setStatus({ type: 'success', message: 'Database backup downloaded successfully!' });
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to create backup. Please try again.' });
      console.error('Backup error:', error);
    } finally {
      setBacking(false);
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmed = confirm(
      'WARNING: Restoring from backup will replace ALL current data. This cannot be undone. Continue?'
    );

    if (!confirmed) {
      e.target.value = '';
      return;
    }

    setRestoring(true);
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      await importBackup(backup);
      setStatus({ type: 'success', message: 'Database restored successfully! Reloading...' });
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to restore backup. Please check the file and try again.' });
      console.error('Restore error:', error);
    } finally {
      setRestoring(false);
      e.target.value = '';
      setTimeout(() => setStatus(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="container max-w-3xl p-8">
        <div className="animate-pulse">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl p-8">
      <header className="mb-8">
        <h1 className="header-title flex items-center gap-3">
          <Settings className="w-8 h-8 text-indigo-600" />
          AI Settings
        </h1>
        <p className="text-muted">Configure your AI provider, API keys, and default models.</p>
      </header>

      {status && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${
          status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {status.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {status.message}
        </div>
      )}

      <div className="space-y-6">
        {/* API Key Section */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
            <Key className="w-5 h-5 text-indigo-600" />
            API Configuration
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
              <select
                value={settings.provider}
                onChange={(e) => setSettings({ ...settings, provider: e.target.value as AISettings['provider'] })}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="gateway">Vercel AI Gateway (Recommended)</option>
                <option value="openai">OpenAI Direct</option>
                <option value="google">Google AI Direct</option>
                <option value="anthropic">Anthropic Direct</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">AI Gateway provides access to multiple providers with a single key.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {settings.provider === 'gateway' ? 'AI Gateway API Key' : `${settings.provider.charAt(0).toUpperCase() + settings.provider.slice(1)} API Key`}
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={settings.apiKey}
                  onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                  placeholder="Enter your API key..."
                  className="flex-1 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono text-sm"
                />
                <button
                  onClick={fetchModels}
                  disabled={fetchingModels || !settings.apiKey}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                >
                  <RefreshCw className={`w-4 h-4 ${fetchingModels ? 'animate-spin' : ''}`} />
                  Fetch Models
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Your API key is stored locally and never sent to our servers.</p>
            </div>
          </div>
        </div>

        {/* Model Selection */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
            <Cpu className="w-5 h-5 text-indigo-600" />
            Default Models
          </h2>

          <div className="space-y-4">
            {/* Text Model */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                Text Generation Model
              </label>
              <select
                value={settings.textModel}
                onChange={(e) => setSettings({ ...settings, textModel: e.target.value })}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {availableModels.text.length > 0 ? (
                  availableModels.text.map((m) => (
                    <option key={m.id} value={m.id}>{m.name || m.id}</option>
                  ))
                ) : (
                  <>
                    <option value="openai/gpt-4o">OpenAI GPT-4o</option>
                    <option value="openai/gpt-4o-mini">OpenAI GPT-4o Mini</option>
                    <option value="anthropic/claude-3-5-sonnet">Anthropic Claude 3.5 Sonnet</option>
                    <option value="google/gemini-1.5-pro">Google Gemini 1.5 Pro</option>
                  </>
                )}
              </select>
            </div>

            {/* Embedding Model */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-500" />
                Embedding Model
              </label>
              <select
                value={settings.embeddingModel}
                onChange={(e) => setSettings({ ...settings, embeddingModel: e.target.value })}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {availableModels.embedding.length > 0 ? (
                  availableModels.embedding.map((m) => (
                    <option key={m.id} value={m.id}>{m.name || m.id}</option>
                  ))
                ) : (
                  <>
                    <option value="openai/text-embedding-3-small">OpenAI text-embedding-3-small</option>
                    <option value="openai/text-embedding-3-large">OpenAI text-embedding-3-large</option>
                    <option value="cohere/embed-english-v3">Cohere embed-english-v3</option>
                  </>
                )}
              </select>
            </div>

            {/* Image Model */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Image className="w-4 h-4 text-green-500" />
                Image Generation Model
              </label>
              <select
                value={settings.imageModel}
                onChange={(e) => setSettings({ ...settings, imageModel: e.target.value })}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {availableModels.image.length > 0 ? (
                  availableModels.image.map((m) => (
                    <option key={m.id} value={m.id}>{m.name || m.id}</option>
                  ))
                ) : (
                  <>
                    <option value="openai/dall-e-3">OpenAI DALL-E 3</option>
                    <option value="google/imagen-3">Google Imagen 3</option>
                    <option value="stability/stable-diffusion-xl">Stability SDXL</option>
                  </>
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Database Backup Section */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-indigo-600" />
            Database Backup & Restore
          </h2>

          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Create a backup of all student data, clinical logs, and settings. Backups are saved as JSON files
              that can be imported to restore your data.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleBackup}
                disabled={backing}
                className="flex-1 btn btn-outline flex items-center justify-center gap-2 py-3"
              >
                <Download className={`w-5 h-5 ${backing ? 'animate-bounce' : ''}`} />
                {backing ? 'Creating Backup...' : 'Export Backup'}
              </button>

              <label className="flex-1 btn btn-outline flex items-center justify-center gap-2 py-3 cursor-pointer hover:bg-gray-50">
                <Upload className={`w-5 h-5 ${restoring ? 'animate-bounce' : ''}`} />
                {restoring ? 'Restoring...' : 'Import Backup'}
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestore}
                  disabled={restoring}
                  className="hidden"
                />
              </label>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold mb-1">Important Notes:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Backups include all students, clinical logs, grades, and skills data</li>
                    <li>• Restoring a backup will replace ALL current data</li>
                    <li>• Create regular backups to prevent data loss</li>
                    <li>• Backups are stored locally on your computer</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full btn btn-primary flex items-center justify-center gap-2 py-4 text-lg"
        >
          <Save className={`w-5 h-5 ${saving ? 'animate-pulse' : ''}`} />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
