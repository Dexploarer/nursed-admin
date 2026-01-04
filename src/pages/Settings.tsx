
import { useState, useEffect } from 'react';
import { Settings, Key, Cpu, Image, Sparkles, Save, RefreshCw, CheckCircle, AlertCircle, Database, Download, Upload, Building2, Users, Gamepad2, Plus, Trash2, Edit3, QrCode, ExternalLink } from 'lucide-react';
import { loadSettings, saveSettings, AISettings } from '@/lib/settings';
import { exportBackup, importBackup } from '@/lib/database-backup';
import { useInstructor } from '@/components/InstructorProvider';
import { ClinicalSite, Preceptor, VrScenario } from '@/types';
import { getAllClinicalSites, addClinicalSite, updateClinicalSite, deleteClinicalSite, getAllPreceptors, addPreceptor, updatePreceptor, deletePreceptor, getAllVrScenarios, addVrScenario, updateVrScenario, deleteVrScenario } from '@/lib/db';
import { Modal, FormField, Input, Textarea } from '@/components';

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

  const [availableModels] = useState<AvailableModels>({
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

  // Clinical Management State
  const [clinicalSites, setClinicalSites] = useState<ClinicalSite[]>([]);
  const [preceptors, setPreceptors] = useState<Preceptor[]>([]);
  const [vrScenarios, setVrScenarios] = useState<VrScenario[]>([]);
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [showPreceptorModal, setShowPreceptorModal] = useState(false);
  const [showScenarioModal, setShowScenarioModal] = useState(false);
  const [editingSite, setEditingSite] = useState<ClinicalSite | null>(null);
  const [editingPreceptor, setEditingPreceptor] = useState<Preceptor | null>(null);
  const [editingScenario, setEditingScenario] = useState<VrScenario | null>(null);
  const [siteForm, setSiteForm] = useState({
    name: '', address: '', contactName: '', contactPhone: '', contactEmail: '', siteType: 'hospital', notes: '',
    // VBON fields
    unitName: '', contactTitle: '', accreditingBody: '', lastAccreditationDate: '',
    contractStartDate: '', contractExpirationDate: '', maxStudentsPerDay: 4, parkingInfo: '', dressCode: ''
  });
  const [preceptorForm, setPreceptorForm] = useState({ firstName: '', lastName: '', credentials: '', email: '', phone: '', siteId: '', notes: '' });
  const [scenarioForm, setScenarioForm] = useState({ name: '', description: '', category: '', defaultHours: 1.0, isRequired: 1 });

  // Preceptor Evaluation Settings
  const [googleFormUrl, setGoogleFormUrl] = useState('');

  useEffect(() => {
    const loadAllData = async () => {
      try {
        const [savedSettings, sites, precs, scenarios] = await Promise.all([
          loadSettings(),
          getAllClinicalSites().catch(() => []),
          getAllPreceptors().catch(() => []),
          getAllVrScenarios().catch(() => [])
        ]);
        setSettings(savedSettings);
        setClinicalSites(sites);
        setPreceptors(precs);
        setVrScenarios(scenarios);

        // Load Google Form URL from localStorage
        const savedFormUrl = localStorage.getItem('nursed_google_form_url') || '';
        setGoogleFormUrl(savedFormUrl);
      } catch (e) {
        console.error('Failed to load settings:', e);
      } finally {
        setLoading(false);
      }
    };
    loadAllData();
  }, []);

  const handleSaveGoogleFormUrl = () => {
    localStorage.setItem('nursed_google_form_url', googleFormUrl);
    setStatus({ type: 'success', message: 'Google Form URL saved!' });
    setTimeout(() => setStatus(null), 3000);
  };

  // Clinical Sites handlers
  const handleSaveSite = async () => {
    try {
      if (editingSite) {
        await updateClinicalSite({ ...editingSite, ...siteForm });
      } else {
        const newSite: ClinicalSite = {
          id: `SITE-${Date.now()}`,
          ...siteForm,
          createdAt: new Date().toISOString()
        };
        await addClinicalSite(newSite);
      }
      const sites = await getAllClinicalSites();
      setClinicalSites(sites);
      setShowSiteModal(false);
      setEditingSite(null);
      setSiteForm({
        name: '', address: '', contactName: '', contactPhone: '', contactEmail: '', siteType: 'hospital', notes: '',
        unitName: '', contactTitle: '', accreditingBody: '', lastAccreditationDate: '',
        contractStartDate: '', contractExpirationDate: '', maxStudentsPerDay: 4, parkingInfo: '', dressCode: ''
      });
      setStatus({ type: 'success', message: editingSite ? 'Site updated!' : 'Site added!' });
      setTimeout(() => setStatus(null), 3000);
    } catch (e) {
      console.error('Failed to save site:', e);
      setStatus({ type: 'error', message: 'Failed to save site.' });
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const handleDeleteSite = async (id: string) => {
    if (!confirm('Delete this clinical site? This cannot be undone.')) return;
    try {
      await deleteClinicalSite(id);
      setClinicalSites(sites => sites.filter(s => s.id !== id));
      setStatus({ type: 'success', message: 'Site deleted.' });
      setTimeout(() => setStatus(null), 3000);
    } catch (e) {
      console.error('Failed to delete site:', e);
      setStatus({ type: 'error', message: 'Failed to delete site.' });
      setTimeout(() => setStatus(null), 3000);
    }
  };

  // Preceptors handlers
  const handleSavePreceptor = async () => {
    try {
      if (editingPreceptor) {
        await updatePreceptor({ ...editingPreceptor, ...preceptorForm });
      } else {
        const newPreceptor: Preceptor = {
          id: `PREC-${Date.now()}`,
          ...preceptorForm,
          createdAt: new Date().toISOString()
        };
        await addPreceptor(newPreceptor);
      }
      const precs = await getAllPreceptors();
      setPreceptors(precs);
      setShowPreceptorModal(false);
      setEditingPreceptor(null);
      setPreceptorForm({ firstName: '', lastName: '', credentials: '', email: '', phone: '', siteId: '', notes: '' });
      setStatus({ type: 'success', message: editingPreceptor ? 'Preceptor updated!' : 'Preceptor added!' });
      setTimeout(() => setStatus(null), 3000);
    } catch (e) {
      console.error('Failed to save preceptor:', e);
      setStatus({ type: 'error', message: 'Failed to save preceptor.' });
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const handleDeletePreceptor = async (id: string) => {
    if (!confirm('Delete this preceptor? This cannot be undone.')) return;
    try {
      await deletePreceptor(id);
      setPreceptors(precs => precs.filter(p => p.id !== id));
      setStatus({ type: 'success', message: 'Preceptor deleted.' });
      setTimeout(() => setStatus(null), 3000);
    } catch (e) {
      console.error('Failed to delete preceptor:', e);
      setStatus({ type: 'error', message: 'Failed to delete preceptor.' });
      setTimeout(() => setStatus(null), 3000);
    }
  };

  // VR Scenarios handlers
  const handleSaveScenario = async () => {
    try {
      if (editingScenario) {
        await updateVrScenario({ ...editingScenario, ...scenarioForm });
      } else {
        const newScenario: VrScenario = {
          id: `VR-${Date.now()}`,
          ...scenarioForm,
          sortOrder: vrScenarios.length,
          isActive: 1,
          createdAt: new Date().toISOString()
        };
        await addVrScenario(newScenario);
      }
      const scenarios = await getAllVrScenarios();
      setVrScenarios(scenarios);
      setShowScenarioModal(false);
      setEditingScenario(null);
      setScenarioForm({ name: '', description: '', category: '', defaultHours: 1.0, isRequired: 1 });
      setStatus({ type: 'success', message: editingScenario ? 'Scenario updated!' : 'Scenario added!' });
      setTimeout(() => setStatus(null), 3000);
    } catch (e) {
      console.error('Failed to save scenario:', e);
      setStatus({ type: 'error', message: 'Failed to save scenario.' });
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const handleDeleteScenario = async (id: string) => {
    if (!confirm('Delete this VR scenario? This cannot be undone.')) return;
    try {
      await deleteVrScenario(id);
      setVrScenarios(scenarios => scenarios.filter(s => s.id !== id));
      setStatus({ type: 'success', message: 'Scenario deleted.' });
      setTimeout(() => setStatus(null), 3000);
    } catch (e) {
      console.error('Failed to delete scenario:', e);
      setStatus({ type: 'error', message: 'Failed to delete scenario.' });
      setTimeout(() => setStatus(null), 3000);
    }
  };

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
    <div className="min-h-screen max-w-3xl">
      <header className="mb-8">
        <div className="flex items-center gap-4 mb-3">
          <div className="p-3 bg-linear-to-br from-gray-600 to-slate-600 rounded-2xl shadow-lg">
            <Settings className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black bg-linear-to-r from-gray-900 to-slate-900 bg-clip-text text-transparent mb-1">
              AI Settings
            </h1>
            <p className="text-gray-600 text-lg font-medium">Configure your AI provider, API keys, and default models</p>
          </div>
        </div>
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
              <label className="flex text-sm font-medium text-gray-700 mb-2 items-center gap-2">
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
              <label className="flex text-sm font-medium text-gray-700 mb-2 items-center gap-2">
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
              <label className="flex text-sm font-medium text-gray-700 mb-2 items-center gap-2">
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
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
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

        {/* Clinical Sites Section */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              Clinical Sites
            </h2>
            <button
              onClick={() => {
                setEditingSite(null);
                setSiteForm({
                  name: '', address: '', contactName: '', contactPhone: '', contactEmail: '', siteType: 'hospital', notes: '',
                  unitName: '', contactTitle: '', accreditingBody: '', lastAccreditationDate: '',
                  contractStartDate: '', contractExpirationDate: '', maxStudentsPerDay: 4, parkingInfo: '', dressCode: ''
                });
                setShowSiteModal(true);
              }}
              className="btn btn-primary btn-sm flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add Site
            </button>
          </div>

          {clinicalSites.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No clinical sites configured. Add sites where students complete rotations.</p>
          ) : (
            <div className="space-y-2">
              {clinicalSites.map(site => {
                // Calculate contract status
                let contractStatus: 'valid' | 'expiring' | 'expired' | 'none' = 'none';
                let daysUntilExpiry = 0;
                if (site.contractExpirationDate) {
                  const expiry = new Date(site.contractExpirationDate);
                  const today = new Date();
                  daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  if (daysUntilExpiry < 0) contractStatus = 'expired';
                  else if (daysUntilExpiry <= 90) contractStatus = 'expiring';
                  else contractStatus = 'valid';
                }
                return (
                <div key={site.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">{site.name}</span>
                      {site.unitName && <span className="text-xs text-gray-400">({site.unitName})</span>}
                      {contractStatus === 'expired' && (
                        <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">CONTRACT EXPIRED</span>
                      )}
                      {contractStatus === 'expiring' && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">EXPIRES IN {daysUntilExpiry}d</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <span>{site.siteType.replace('_', ' ')}</span>
                      {site.address && <span>• {site.address}</span>}
                      {site.maxStudentsPerDay && <span>• Max {site.maxStudentsPerDay} students/day</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingSite(site);
                        setSiteForm({
                          name: site.name, address: site.address || '', contactName: site.contactName || '',
                          contactPhone: site.contactPhone || '', contactEmail: site.contactEmail || '',
                          siteType: site.siteType, notes: site.notes || '',
                          unitName: site.unitName || '', contactTitle: site.contactTitle || '',
                          accreditingBody: site.accreditingBody || '', lastAccreditationDate: site.lastAccreditationDate || '',
                          contractStartDate: site.contractStartDate || '', contractExpirationDate: site.contractExpirationDate || '',
                          maxStudentsPerDay: site.maxStudentsPerDay || 4, parkingInfo: site.parkingInfo || '', dressCode: site.dressCode || ''
                        });
                        setShowSiteModal(true);
                      }}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSite(site.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </div>

        {/* Preceptors Section */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Clinical Preceptors
            </h2>
            <button
              onClick={() => {
                setEditingPreceptor(null);
                setPreceptorForm({ firstName: '', lastName: '', credentials: '', email: '', phone: '', siteId: '', notes: '' });
                setShowPreceptorModal(true);
              }}
              className="btn btn-primary btn-sm flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add Preceptor
            </button>
          </div>

          {preceptors.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No preceptors configured. Add preceptors who supervise students at clinical sites.</p>
          ) : (
            <div className="space-y-2">
              {preceptors.map(prec => {
                const site = clinicalSites.find(s => s.id === prec.siteId);
                return (
                  <div key={prec.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div>
                      <div className="font-medium text-gray-800">{prec.firstName} {prec.lastName} {prec.credentials && <span className="text-indigo-600 text-sm">, {prec.credentials}</span>}</div>
                      <div className="text-xs text-gray-500">{site?.name || 'No site assigned'} {prec.email && `• ${prec.email}`}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingPreceptor(prec);
                          setPreceptorForm({ firstName: prec.firstName, lastName: prec.lastName, credentials: prec.credentials || '', email: prec.email || '', phone: prec.phone || '', siteId: prec.siteId || '', notes: prec.notes || '' });
                          setShowPreceptorModal(true);
                        }}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePreceptor(prec.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* VR Scenarios Section */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-indigo-600" />
              VR Simulation Scenarios
            </h2>
            <button
              onClick={() => {
                setEditingScenario(null);
                setScenarioForm({ name: '', description: '', category: '', defaultHours: 1.0, isRequired: 1 });
                setShowScenarioModal(true);
              }}
              className="btn btn-primary btn-sm flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add Scenario
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-blue-800">
              <strong>VBON Compliance:</strong> VR/Simulation hours cannot exceed 25% of total clinical hours (100h out of 400h). Configure the required VR scenarios students must complete.
            </p>
          </div>

          {vrScenarios.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No VR scenarios configured. Add scenarios that students must complete for compliance.</p>
          ) : (
            <div className="space-y-2">
              {vrScenarios.map(scenario => (
                <div key={scenario.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div>
                    <div className="font-medium text-gray-800 flex items-center gap-2">
                      {scenario.name}
                      {scenario.isRequired === 1 && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">REQUIRED</span>}
                    </div>
                    <div className="text-xs text-gray-500">{scenario.category || 'General'} • {scenario.defaultHours || 1}h default</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingScenario(scenario);
                        setScenarioForm({ name: scenario.name, description: scenario.description || '', category: scenario.category || '', defaultHours: scenario.defaultHours || 1.0, isRequired: scenario.isRequired || 0 });
                        setShowScenarioModal(true);
                      }}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteScenario(scenario.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preceptor Evaluation QR Code Settings */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
            <QrCode className="w-5 h-5 text-indigo-600" />
            Preceptor Evaluation QR Codes
          </h2>

          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Configure your Google Form URL for preceptor evaluations. QR codes generated for students will link to this form,
              allowing preceptors to submit evaluations via their phone.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Google Form URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={googleFormUrl}
                  onChange={(e) => setGoogleFormUrl(e.target.value)}
                  placeholder="https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform"
                  className="flex-1 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                />
                <button
                  onClick={handleSaveGoogleFormUrl}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 font-medium"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Tip: Create a Google Form with fields for student name, clinical site, date, ratings, and comments.
                Then paste the form URL here.
              </p>
            </div>

            {googleFormUrl && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-800">Form URL configured!</p>
                    <p className="text-xs text-green-700 mt-1">
                      QR codes will now link to your Google Form. Preceptors can scan the code from a student's profile to submit evaluations.
                    </p>
                    <a
                      href={googleFormUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-green-700 hover:text-green-800 mt-2 font-medium"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Test Form
                    </a>
                  </div>
                </div>
              </div>
            )}

            {!googleFormUrl && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">No form URL configured</p>
                    <p className="text-xs text-amber-700 mt-1">
                      QR codes won't work until you add a Google Form URL. You can still manually enter evaluations via CSV import.
                    </p>
                  </div>
                </div>
              </div>
            )}
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

      {/* Clinical Site Modal */}
      <Modal
        isOpen={showSiteModal}
        onClose={() => { setShowSiteModal(false); setEditingSite(null); }}
        title={editingSite ? 'Edit Clinical Site' : 'Add Clinical Site'}
        size="xl"
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => { setShowSiteModal(false); setEditingSite(null); }} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">Cancel</button>
            <button onClick={handleSaveSite} disabled={!siteForm.name} className="btn btn-primary px-6 disabled:opacity-50">{editingSite ? 'Update' : 'Add'} Site</button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Basic Info Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide border-b pb-2">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Site Name" required>
                <Input value={siteForm.name} onChange={(e) => setSiteForm({...siteForm, name: e.target.value})} placeholder="e.g., Page Memorial Hospital" />
              </FormField>
              <FormField label="Unit Name" hint="e.g., Medical-Surgical Unit 3">
                <Input value={siteForm.unitName} onChange={(e) => setSiteForm({...siteForm, unitName: e.target.value})} placeholder="Unit name" />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Site Type">
                <select value={siteForm.siteType} onChange={(e) => setSiteForm({...siteForm, siteType: e.target.value})} className="w-full p-2.5 border-2 border-gray-200 rounded-xl">
                  <option value="hospital">Hospital</option>
                  <option value="clinic">Clinic</option>
                  <option value="long_term_care">Long Term Care</option>
                  <option value="home_health">Home Health</option>
                  <option value="school">School</option>
                  <option value="simulation_lab">Simulation Lab</option>
                  <option value="office">Office</option>
                </select>
              </FormField>
              <FormField label="Max Students Per Day">
                <Input type="number" min={1} max={20} value={siteForm.maxStudentsPerDay} onChange={(e) => setSiteForm({...siteForm, maxStudentsPerDay: parseInt(e.target.value) || 4})} />
              </FormField>
            </div>
            <FormField label="Address">
              <Input value={siteForm.address} onChange={(e) => setSiteForm({...siteForm, address: e.target.value})} placeholder="Full street address" />
            </FormField>
          </div>

          {/* Contact Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide border-b pb-2">Contact Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Contact Name">
                <Input value={siteForm.contactName} onChange={(e) => setSiteForm({...siteForm, contactName: e.target.value})} placeholder="Primary contact name" />
              </FormField>
              <FormField label="Title">
                <Input value={siteForm.contactTitle} onChange={(e) => setSiteForm({...siteForm, contactTitle: e.target.value})} placeholder="e.g., Nurse Manager" />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Phone">
                <Input value={siteForm.contactPhone} onChange={(e) => setSiteForm({...siteForm, contactPhone: e.target.value})} placeholder="(540) 555-0123" />
              </FormField>
              <FormField label="Email">
                <Input value={siteForm.contactEmail} onChange={(e) => setSiteForm({...siteForm, contactEmail: e.target.value})} placeholder="contact@hospital.com" />
              </FormField>
            </div>
          </div>

          {/* Accreditation & Contract Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide border-b pb-2">Accreditation & Contract</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Accrediting Body" hint="e.g., Joint Commission, ACHC">
                <Input value={siteForm.accreditingBody} onChange={(e) => setSiteForm({...siteForm, accreditingBody: e.target.value})} placeholder="Accrediting organization" />
              </FormField>
              <FormField label="Last Accreditation Date">
                <Input type="date" value={siteForm.lastAccreditationDate} onChange={(e) => setSiteForm({...siteForm, lastAccreditationDate: e.target.value})} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Contract Start Date">
                <Input type="date" value={siteForm.contractStartDate} onChange={(e) => setSiteForm({...siteForm, contractStartDate: e.target.value})} />
              </FormField>
              <FormField label="Contract Expiration Date">
                <Input type="date" value={siteForm.contractExpirationDate} onChange={(e) => setSiteForm({...siteForm, contractExpirationDate: e.target.value})} />
              </FormField>
            </div>
            {siteForm.contractExpirationDate && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-800">
                  Contract expires: <strong>{new Date(siteForm.contractExpirationDate).toLocaleDateString()}</strong>.
                  You will receive alerts 90 days before expiration.
                </p>
              </div>
            )}
          </div>

          {/* Policies Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide border-b pb-2">Site Policies</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Parking Information">
                <Textarea value={siteForm.parkingInfo} onChange={(e) => setSiteForm({...siteForm, parkingInfo: e.target.value})} rows={2} placeholder="Parking lot location, permits required, etc." />
              </FormField>
              <FormField label="Dress Code">
                <Textarea value={siteForm.dressCode} onChange={(e) => setSiteForm({...siteForm, dressCode: e.target.value})} rows={2} placeholder="Scrub color, badge requirements, etc." />
              </FormField>
            </div>
            <FormField label="Additional Notes">
              <Textarea value={siteForm.notes} onChange={(e) => setSiteForm({...siteForm, notes: e.target.value})} rows={2} placeholder="Any other important information for students..." />
            </FormField>
          </div>
        </div>
      </Modal>

      {/* Preceptor Modal */}
      <Modal
        isOpen={showPreceptorModal}
        onClose={() => { setShowPreceptorModal(false); setEditingPreceptor(null); }}
        title={editingPreceptor ? 'Edit Preceptor' : 'Add Preceptor'}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => { setShowPreceptorModal(false); setEditingPreceptor(null); }} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">Cancel</button>
            <button onClick={handleSavePreceptor} disabled={!preceptorForm.firstName || !preceptorForm.lastName} className="btn btn-primary px-6 disabled:opacity-50">{editingPreceptor ? 'Update' : 'Add'} Preceptor</button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="First Name" required>
              <Input value={preceptorForm.firstName} onChange={(e) => setPreceptorForm({...preceptorForm, firstName: e.target.value})} placeholder="First name" />
            </FormField>
            <FormField label="Last Name" required>
              <Input value={preceptorForm.lastName} onChange={(e) => setPreceptorForm({...preceptorForm, lastName: e.target.value})} placeholder="Last name" />
            </FormField>
          </div>
          <FormField label="Credentials" hint="e.g., RN, LPN, NP">
            <Input value={preceptorForm.credentials} onChange={(e) => setPreceptorForm({...preceptorForm, credentials: e.target.value})} placeholder="RN, BSN" />
          </FormField>
          <FormField label="Primary Site">
            <select value={preceptorForm.siteId} onChange={(e) => setPreceptorForm({...preceptorForm, siteId: e.target.value})} className="w-full p-2.5 border-2 border-gray-200 rounded-xl">
              <option value="">No site assigned</option>
              {clinicalSites.map(site => (
                <option key={site.id} value={site.id}>{site.name}</option>
              ))}
            </select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Email">
              <Input value={preceptorForm.email} onChange={(e) => setPreceptorForm({...preceptorForm, email: e.target.value})} placeholder="Email" />
            </FormField>
            <FormField label="Phone">
              <Input value={preceptorForm.phone} onChange={(e) => setPreceptorForm({...preceptorForm, phone: e.target.value})} placeholder="Phone" />
            </FormField>
          </div>
          <FormField label="Notes">
            <Textarea value={preceptorForm.notes} onChange={(e) => setPreceptorForm({...preceptorForm, notes: e.target.value})} rows={2} placeholder="Additional notes..." />
          </FormField>
        </div>
      </Modal>

      {/* VR Scenario Modal */}
      <Modal
        isOpen={showScenarioModal}
        onClose={() => { setShowScenarioModal(false); setEditingScenario(null); }}
        title={editingScenario ? 'Edit VR Scenario' : 'Add VR Scenario'}
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => { setShowScenarioModal(false); setEditingScenario(null); }} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">Cancel</button>
            <button onClick={handleSaveScenario} disabled={!scenarioForm.name} className="btn btn-primary px-6 disabled:opacity-50">{editingScenario ? 'Update' : 'Add'} Scenario</button>
          </div>
        }
      >
        <div className="space-y-4">
          <FormField label="Scenario Name" required>
            <Input value={scenarioForm.name} onChange={(e) => setScenarioForm({...scenarioForm, name: e.target.value})} placeholder="e.g., Cardiac Emergency Response" />
          </FormField>
          <FormField label="Category">
            <select value={scenarioForm.category} onChange={(e) => setScenarioForm({...scenarioForm, category: e.target.value})} className="w-full p-2.5 border-2 border-gray-200 rounded-xl">
              <option value="">General</option>
              <option value="cardiac">Cardiac</option>
              <option value="respiratory">Respiratory</option>
              <option value="emergency">Emergency</option>
              <option value="pediatric">Pediatric</option>
              <option value="maternal">Maternal/OB</option>
              <option value="geriatric">Geriatric</option>
              <option value="mental_health">Mental Health</option>
            </select>
          </FormField>
          <FormField label="Default Hours">
            <Input type="number" step="0.5" min="0.5" value={scenarioForm.defaultHours} onChange={(e) => setScenarioForm({...scenarioForm, defaultHours: parseFloat(e.target.value) || 1.0})} />
          </FormField>
          <FormField label="Required for Completion">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={scenarioForm.isRequired === 1} onChange={(e) => setScenarioForm({...scenarioForm, isRequired: e.target.checked ? 1 : 0})} className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              <span className="text-sm text-gray-700">Students must complete this scenario</span>
            </label>
          </FormField>
          <FormField label="Description">
            <Textarea value={scenarioForm.description} onChange={(e) => setScenarioForm({...scenarioForm, description: e.target.value})} rows={2} placeholder="Brief description of the scenario..." />
          </FormField>
        </div>
      </Modal>
    </div>
  );
}
