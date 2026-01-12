
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ttjslefkbrpygtgwynme.supabase.co';
const supabaseKey = 'sb_publishable_Vp5Uj2V_OMutebUNkKoBMw_wubYQIFg';

export const supabase = createClient(supabaseUrl, supabaseKey);
