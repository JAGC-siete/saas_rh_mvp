import React, { useState } from 'react';

export default function CommunicationPanel() {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [segment, setSegment] = useState('active_admins');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const handleSend = async () => {
    setLoading(true);
    setStatus('Sending...');
    try {
      const res = await fetch('/api/super-admin/communications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body, segment }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus(`Success! ${data.recipientCount} emails queued.`);
      } else {
        setStatus(`Error: ${data.error}`);
      }
    } catch (e) {
      setStatus('Network error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow border">
      <h2 className="text-2xl font-bold mb-4">Sisu Communications Control</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Target Segment</label>
          <select 
            value={segment} 
            onChange={(e) => setSegment(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="active_admins">All Active Admins</option>
            <option value="new_admins">New Admins (Last 7 Days)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Subject</label>
          <input 
            type="text" 
            value={subject} 
            onChange={(e) => setSubject(e.target.value)}
            className="w-full p-2 border rounded" 
            placeholder="e.g. Welcome to Humano SISU"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Message Body (HTML supported)</label>
          <textarea 
            rows={6} 
            value={body} 
            onChange={(e) => setBody(e.target.value)}
            className="w-full p-2 border rounded" 
            placeholder="Write your a-ha moment here..."
          />
        </div>
        <button 
          onClick={handleSend} 
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Processing...' : 'Dispatch Campaign'}
        </button>
        {status && <p className="mt-2 text-sm font-medium">{status}</p>}
      </div>
    </div>
  );
}
