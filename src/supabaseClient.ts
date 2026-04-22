/* eslint-disable @typescript-eslint/no-explicit-any */
// Supabase eliminado — stub nulo para compatibilidad de imports

function createChain(): any {
  const resolved = Promise.resolve({ data: null, error: null, count: 0 });
  return new Proxy({}, {
    get(_t, prop: string) {
      if (prop === 'then') return resolved.then.bind(resolved);
      if (prop === 'catch') return resolved.catch.bind(resolved);
      if (prop === 'finally') return resolved.finally.bind(resolved);
      return (..._args: any[]) => createChain();
    }
  });
}

export const supabase: any = {
  auth: {
    getUser: async () => ({ data: { user: null }, error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: (_event: any, callback: any) => {
      setTimeout(() => callback('INITIAL_SESSION', null), 0);
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    signInWithPassword: async () => ({ data: null, error: null }),
    signUp: async () => ({ data: null, error: null }),
    signInWithOAuth: async () => ({ data: null, error: null }),
    signOut: async () => ({ data: null, error: null }),
  },
  from: () => createChain(),
  storage: {
    from: () => ({
      upload: async () => ({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
    }),
  },
  rpc: async () => ({ data: null, error: null }),
};
