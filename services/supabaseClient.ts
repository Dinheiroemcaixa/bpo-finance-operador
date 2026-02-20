
import { createClient } from '@supabase/supabase-js';

// Credenciais do Projeto BPO Finance
const SUPABASE_URL = 'https://lthkhyojnopzuhvsurxu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_4h24USDBMvyGdt_zTuNmcw_mWX47rxS';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
