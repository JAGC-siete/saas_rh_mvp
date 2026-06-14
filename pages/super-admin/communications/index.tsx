import React from 'react';
import CommunicationPanel from '../../components/admin/CommunicationPanel';
import Layout from '../../components/layout/AdminLayout';

export default function CommunicationsPage() {
  return (
    <Layout title="Gestión de Comunicaciones">
      <div className="max-w-4xl mx-auto py-8">
        <CommunicationPanel />
      </div>
    </Layout>
  );
}
