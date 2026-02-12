'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get('/auth/me'); // Wait, I haven't implemented /auth/me yet.
        // Actually I'll implement it now in the backend.
        setUser(response.data);
      } catch (err) {
        // router.push('/login');
      }
    };
    fetchUser();
  }, [router]);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      {user && (
        <div className="mt-4 p-4 bg-white shadow rounded">
          <p>Welcome, {user.full_name}!</p>
          <p>Email: {user.email}</p>
          <p>Role: {user.role}</p>
        </div>
      )}
      <Button onClick={() => {
        localStorage.removeItem('token');
        router.push('/login');
      }} className="mt-4">Logout</Button>
    </div>
  );
}
