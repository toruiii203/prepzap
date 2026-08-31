import { createClient } from '@supabase/supabase-js'; createClient('url', 'key', { auth: { lock: async (name, cb) => cb() } });
