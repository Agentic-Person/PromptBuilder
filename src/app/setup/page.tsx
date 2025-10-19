'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function SetupPage() {
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);
    };

    getUser();
  }, [router]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      // Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: companyName,
          plan: 'free'
        })
        .select()
        .single();

      if (orgError) {
        setError('Failed to create organization');
        return;
      }

      // Create user profile record
      const { error: userError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          org_id: org.id,
          email: user.email,
          role: 'admin'
        });

      if (userError) {
        setError('Failed to create user profile');
        return;
      }

      // Redirect to designer
      router.push('/designer');
      router.refresh();
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Setup error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">PromptBuilder</h1>
          <p className="mt-2 text-sm text-gray-800">Complete your setup</p>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create your organization
        </h2>
        <p className="mt-2 text-center text-sm text-gray-800">
          Welcome, {user.email}! Let's set up your workspace.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSetup}>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-900">
                Organization Name
              </label>
              <div className="mt-1">
                <input
                  id="companyName"
                  name="companyName"
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter your organization name"
                />
              </div>
              <p className="mt-1 text-xs text-gray-600">
                This will be the name of your workspace where you'll create workflows.
              </p>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || !companyName.trim()}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Setting up...
                  </div>
                ) : (
                  'Create Organization'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}