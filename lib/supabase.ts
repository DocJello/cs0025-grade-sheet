import { createClient } from '@supabase/supabase-js';
import { GradeSheet } from '../types';
import { User } from '../types';

// IMPORTANT: You must create a new Supabase project and fill these in!
// Go to your Supabase project's API settings to find these values.
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';

if (supabaseUrl === 'YOUR_SUPABASE_URL' || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY') {
    // This is a bit of a hack to show a persistent error for the user to see.
    // In a real app, this would be handled by build-time environment variables.
    document.body.innerHTML = `
        <div style="font-family: sans-serif; padding: 2rem; background-color: #ffcccc; border: 2px solid #ff0000; margin: 2rem;">
            <h1>Configuration Error</h1>
            <p>Your Supabase URL and Key are not configured. You need to edit the file <code>lib/supabase.ts</code> and replace the placeholder values.</p>
            <ol>
                <li>Go to <a href="https://supabase.com/" target="_blank" rel="noopener noreferrer">supabase.com</a> and create a new project.</li>
                <li>In your project, go to the <strong>SQL Editor</strong>, create a new query, and run the SQL schema provided in the instructions.</li>
                <li>Go to the <strong>API Settings</strong> in your new project (Settings > API).</li>
                <li>Find the <strong>Project URL</strong> and <strong>Project API Key</strong> (the <code>anon</code> <code>public</code> one).</li>
                <li>Copy these values into the <code>supabaseUrl</code> and <code>supabaseAnonKey</code> constants in the <code>lib/supabase.ts</code> file.</li>
            </ol>
        </div>
    `;
    throw new Error("Supabase not configured.");
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        // FIX: The Insert type was overly complex, likely causing inference to fail.
        // Changed to `User` because the app code always provides a full user object for insertion.
        Insert: User;
        Update: Partial<User>;
      };
      grade_sheets: {
        Row: GradeSheet;
        // FIX: The Insert type was overly complex, likely causing inference to fail.
        // Changed to `GradeSheet` because the app code always provides a full grade sheet object for insertion.
        Insert: GradeSheet;
        Update: Partial<GradeSheet>;
      };
      venues: {
        Row: { name: string };
        Insert: { name: string };
        Update: { name: string };
      };
    };
  };
}


export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
