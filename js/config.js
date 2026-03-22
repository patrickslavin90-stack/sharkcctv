// ── Google Maps ──────────────────────────────────────────────
// Key lives in Supabase Edge Function secrets only (GOOGLE_MAPS_KEY).
// Frontend calls /functions/v1/maps-proxy — no key in client code.

// ── Supabase config ──────────────────────────────────────────
const SUPABASE_URL  = 'https://mvntodsdjftfjbcrvedn.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12bnRvZHNkamZ0ZmpiY3J2ZWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTYwMDQsImV4cCI6MjA4OTQzMjAwNH0.4oKeQh4E45O9Kf5MklRUmKW_5t5NvzU3cVf3VGHEIsg';

// Labour defaults
const DEFAULT_LABOUR_HOURS = 4;
const DEFAULT_LABOUR_RATE  = 120;

// Quote number prefix
const QUOTE_PREFIX = 'SC';

// Company info (used in PDF + emails)
const COMPANY = {
  name:    'Shark CCTV & Security Solutions',
  phone:   '0419 560 650',
  email:   'info@sharkcctvss.com.au',
  website: 'sharkcctvss.com.au',
  abn:     '',               // fill in if needed
};
