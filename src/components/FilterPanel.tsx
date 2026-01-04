import { useState } from 'react';
import { X, Filter, Save } from 'lucide-react';
import { clsx } from 'clsx';

export interface FilterOption {
  id: string;
  label: string;
  value: string | string[];
  type: 'text' | 'select' | 'multiselect' | 'daterange';
  options?: { label: string; value: string }[];
}

interface FilterPanelProps {
  filters: FilterOption[];
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  onReset: () => void;
  onSavePreset?: (name: string) => void;
  presets?: { name: string; values: Record<string, any> }[];
  onLoadPreset?: (preset: { name: string; values: Record<string, any> }) => void;
  className?: string;
}

export function FilterPanel({
  filters,
  values,
  onChange,
  onReset,
  onSavePreset,
  presets = [],
  onLoadPreset,
  className,
}: FilterPanelProps) {
  const [presetName, setPresetName] = useState('');

  const activeFiltersCount = Object.values(values).filter(v => {
    if (Array.isArray(v)) return v.length > 0;
    return v !== '' && v !== null && v !== undefined;
  }).length;

  const updateFilter = (id: string, value: any) => {
    onChange({ ...values, [id]: value });
  };

  const removeFilter = (id: string) => {
    const newValues = { ...values };
    delete newValues[id];
    onChange(newValues);
  };

  return (
    <div className={clsx('bg-white border-2 border-gray-200 rounded-xl p-6 shadow-lg', className)}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-bold text-gray-900">Filters</h3>
          {activeFiltersCount > 0 && (
            <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold">
              {activeFiltersCount} active
            </span>
          )}
        </div>
        {activeFiltersCount > 0 && (
          <button
            onClick={onReset}
            className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
          >
            Reset All
          </button>
        )}
      </div>

      {/* Presets */}
      {presets.length > 0 && (
        <div className="mb-6 pb-6 border-b border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Saved Presets</p>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset, index) => (
              <button
                key={index}
                onClick={() => onLoadPreset?.(preset)}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter Chips */}
      {activeFiltersCount > 0 && (
        <div className="mb-6 pb-6 border-b border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Active Filters</p>
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => {
              const value = values[filter.id];
              if (!value || (Array.isArray(value) && value.length === 0)) return null;

              return (
                <div
                  key={filter.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium"
                >
                  <span className="font-semibold">{filter.label}:</span>
                  <span>
                    {Array.isArray(value) ? value.join(', ') : value}
                  </span>
                  <button
                    onClick={() => removeFilter(filter.id)}
                    className="hover:bg-indigo-200 rounded p-0.5 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Inputs */}
      <div className="space-y-4">
        {filters.map((filter) => (
          <div key={filter.id}>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {filter.label}
            </label>
            {filter.type === 'text' && (
              <input
                type="text"
                value={values[filter.id] || ''}
                onChange={(e) => updateFilter(filter.id, e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                placeholder={`Filter by ${filter.label.toLowerCase()}`}
              />
            )}
            {filter.type === 'select' && filter.options && (
              <select
                value={values[filter.id] || ''}
                onChange={(e) => updateFilter(filter.id, e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="">All</option>
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
            {filter.type === 'multiselect' && filter.options && (
              <div className="space-y-2">
                {filter.options.map((option) => {
                  const selected = Array.isArray(values[filter.id])
                    ? values[filter.id].includes(option.value)
                    : false;
                  return (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(e) => {
                          const current = Array.isArray(values[filter.id])
                            ? values[filter.id]
                            : [];
                          const updated = e.target.checked
                            ? [...current, option.value]
                            : current.filter((v: string) => v !== option.value);
                          updateFilter(filter.id, updated);
                        }}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">{option.label}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Save Preset */}
      {onSavePreset && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Preset name..."
              className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={() => {
                if (presetName.trim()) {
                  onSavePreset(presetName);
                  setPresetName('');
                }
              }}
              disabled={!presetName.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
