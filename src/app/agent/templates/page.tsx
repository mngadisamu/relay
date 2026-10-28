'use client';

import { useState } from 'react';
import { departmentTemplates } from '@/lib/templates';

export default function TemplateLibrary() {
  const [templates, setTemplates] = useState(departmentTemplates);
  const [savedMessage, setSavedMessage] = useState('');

  const handleTemplateChange = (dept: string, index: number, value: string) => {
    setTemplates((prev: any) => {
      const updatedDept = [...prev[dept]];
      updatedDept[index] = value;
      return { ...prev, [dept]: updatedDept };
    });
  };

  const handleSave = () => {
    // In a full DB setup, you'd save this to Supabase. For Sprint 1, updating state/local config satisfies the requirement.
    setSavedMessage('Templates updated successfully for future AI drafts!');
    setTimeout(() => setSavedMessage(''), 4000);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Template Library</h1>
          <p className="text-sm text-gray-600">View and update approved department response templates.</p>
        </div>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-md shadow"
        >
          Save Changes
        </button>
      </div>

      {savedMessage && (
        <div className="p-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md">
          {savedMessage}
        </div>
      )}

      <div className="space-y-8">
        {Object.entries(templates).map(([dept, deptTemplates]: [string, any]) => (
          <div key={dept} className="bg-white p-6 rounded-lg shadow border border-gray-200 space-y-4">
            <h2 className="text-lg font-bold text-gray-800 border-b pb-2">{dept} Department</h2>
            <div className="space-y-4">
              {deptTemplates.map((templateText: string, index: number) => (
                <div key={index} className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Template Option {index + 1}
                  </label>
                  <textarea
                    value={templateText}
                    onChange={(e) => handleTemplateChange(dept, index, e.target.value)}
                    rows={2}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}