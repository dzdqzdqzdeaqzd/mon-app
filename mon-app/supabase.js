import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xnmmyehdnpnulzlhflis.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhubW15ZWhkbnBudWx6bGhmbGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NzYxOTAsImV4cCI6MjA2ODI1MjE5MH0.rgDfHUP2gvDFzHOXPDVnatg429PNwr4BA4cxeunRKW0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
