import React, { useState } from 'react';
import { X, Calendar, Plus, Clock, Trash2, Check } from 'lucide-react';
import { ChurchService } from '../types';

interface ServiceManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  services: ChurchService[];
  onSaveServices: (services: ChurchService[]) => void;
}

export const ServiceManagerModal: React.FC<ServiceManagerModalProps> = ({
  isOpen,
  onClose,
  services,
  onSaveServices,
}) => {
  const [list, setList] = useState<ChurchService[]>(services);
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('Sunday');
  const [defaultTime, setDefaultTime] = useState('09:00 AM - 11:30 AM');
  const [description, setDescription] = useState('');
  const [theme, setTheme] = useState('');

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newService: ChurchService = {
      id: `srv-${Date.now()}`,
      name: name.trim(),
      dayOfWeek,
      defaultTime,
      description: description.trim() || 'Church worship & prayer gathering',
      theme: theme.trim() || undefined,
    };

    const updated = [...list, newService];
    setList(updated);
    onSaveServices(updated);

    setName('');
    setDescription('');
    setTheme('');
    setShowAddForm(false);
  };

  const [modalError, setModalError] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    if (list.length <= 1) {
      setModalError('You must have at least one church service configured.');
      setTimeout(() => setModalError(null), 3000);
      return;
    }
    const updated = list.filter((s) => s.id !== id);
    setList(updated);
    onSaveServices(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-blue-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-950 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-yellow-400 text-blue-950 font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">Church Services Management</h3>
              <p className="text-xs text-blue-200">
                HOUSE OF POWER OF MINISTRY INT. CHURCH, MANKESSIM
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-blue-200 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
          {modalError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-bold">
              {modalError}
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700 uppercase">
              Configured Services ({list.length})
            </span>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1.5 rounded-xl bg-blue-900 text-yellow-300 font-bold text-xs flex items-center gap-1.5 hover:bg-blue-800 transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{showAddForm ? 'Close Add Form' : 'Add New Service'}</span>
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleAdd} className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-3">
              <h4 className="font-bold text-xs text-blue-950 uppercase">New Service Details</h4>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Service Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sunday 1st Service - Miracle & Power"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Day of Week</label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium outline-none"
                  >
                    <option value="Sunday">Sunday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Thursday">Thursday</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Time Schedule</label>
                  <input
                    type="text"
                    value={defaultTime}
                    onChange={(e) => setDefaultTime(e.target.value)}
                    placeholder="06:30 AM - 08:30 AM"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Description / Theme</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Spiritual breakthrough, praise and prophecy"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-yellow-400 text-blue-950 font-black text-xs hover:bg-yellow-300"
                >
                  Save Service
                </button>
              </div>
            </form>
          )}

          {/* List of Services */}
          <div className="space-y-2">
            {list.map((srv) => (
              <div
                key={srv.id}
                className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between gap-3 hover:border-blue-300 transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-blue-950">{srv.name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold uppercase">
                      {srv.dayOfWeek}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-yellow-600" />
                      {srv.defaultTime}
                    </span>
                    {srv.description && <span>• {srv.description}</span>}
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(srv.id)}
                  className="p-2 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-700 transition"
                  title="Delete service"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-900 text-yellow-300 font-extrabold text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
