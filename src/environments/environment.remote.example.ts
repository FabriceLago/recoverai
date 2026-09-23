// Template for the hosted Supabase project. Copy it to environment.remote.ts
// (git-ignored), fill in the two PUBLIC values from Project Settings -> API,
// then run `npm run start:remote`. Never put the service_role key here.
export const environment = {
  production: false,
  supabaseUrl: 'https://YOUR-PROJECT-REF.supabase.co',
  supabaseAnonKey: 'YOUR-ANON-PUBLIC-KEY',
};
