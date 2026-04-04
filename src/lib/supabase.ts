import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rjuiqahxymkkazticljn.supabase.co'
const supabaseAnonKey = 'sb_publishable_xh6g5UEykUjpfj6hW1_d5A_zCk_Li6u'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
