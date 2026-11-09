import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

export type AppView = 'landing' | 'auth' | 'app';

export function useAppSession() {
  const [view, setView] = useState<AppView>('landing');
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const hasSession = Boolean(data.session);
      setSignedIn(hasSession);
      if (hasSession) setView('app');
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSignedIn(Boolean(session));
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        setView('app');
      }
      if (event === 'SIGNED_OUT') setView('landing');
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setView('landing');
  }

  return {
    view,
    ready,
    signedIn,
    signOut,
    openLanding: () => setView('landing'),
    openAuth: () => setView('auth'),
    openApp: () => {
      setSignedIn(true);
      setView('app');
    },
  };
}
