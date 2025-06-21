'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { 
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon 
} from '@heroicons/react/24/outline';

interface User {
  id: string;
  email: string;
  org_id: string;
  organizations?: {
    name: string;
  };
}

export default function UserMenu() {
  const [user, setUser] = useState<User | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // For now, we'll use the session user data
        // In a real app, you'd fetch the user record with organization
        setUser({
          id: session.user.id,
          email: session.user.email!,
          org_id: 'temp',
          organizations: { name: 'Your Organization' }
        });
      }
    };

    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (event === 'SIGNED_IN' && session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          org_id: 'temp',
          organizations: { name: 'Your Organization' }
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    setIsOpen(false);
    
    try {
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center space-x-2">
        <Link
          href="/login"
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-gray-900 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-2 py-1"
      >
        <UserCircleIcon className="h-8 w-8" />
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium">{user.email}</p>
          <p className="text-xs text-gray-900">{user.organizations?.name}</p>
        </div>
        <ChevronDownIcon className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900">{user.email}</p>
              <p className="text-xs text-gray-900">{user.organizations?.name}</p>
            </div>
            
            <Link
              href="/settings"
              className="flex items-center px-4 py-2 text-sm text-gray-900 hover:bg-gray-100"
              onClick={() => setIsOpen(false)}
            >
              <Cog6ToothIcon className="h-4 w-4 mr-2" />
              Settings
            </Link>
            
            <button
              onClick={handleLogout}
              disabled={loading}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 disabled:opacity-50"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
              {loading ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}