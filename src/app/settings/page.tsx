import CredentialSettings from '@/components/settings/CredentialSettings';

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>
        <CredentialSettings />
      </div>
    </div>
  );
}