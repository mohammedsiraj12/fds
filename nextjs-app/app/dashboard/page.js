"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      setLoading(false);
    };

    getUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: "2rem auto", padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Dashboard</h1>
        <button 
          onClick={handleLogout}
          style={{ 
            padding: '10px 20px', 
            background: '#dc3545', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </div>
      
      <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
        <h2>Welcome, {user?.email}!</h2>
        <p>You are successfully logged in.</p>
        <div style={{ marginTop: '20px' }}>
          <h3>User Information:</h3>
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>User ID:</strong> {user?.id}</p>
          <p><strong>Last Sign In:</strong> {new Date(user?.last_sign_in_at).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
