type DatabaseFailure = { code?: string; message?: string };

// PostgREST details, hints and messages can contain capabilities, SQL values,
// URLs or headers. Only known classifications belong in worker error logs.
export function auditDatabaseError(
  operation: 'claim' | 'result' | 'status',
  failure: DatabaseFailure,
) {
  let explanation = 'Unknown database error. Check Supabase API logs.';
  switch (failure.code) {
    case 'PGRST202':
      explanation =
        'Audit function missing from the API schema cache (PGRST202). Check the Supabase project and installed audit migration, then reload the API schema.';
      break;
    case '42501':
      explanation =
        'Audit database permission denied (42501). Check anonymous worker function permissions; do not use a service-role key.';
      break;
    case '42883':
      explanation =
        'Required database function missing (42883). Check the audit functions and the pgcrypto extension in the extensions schema.';
      break;
    case '42P01':
      explanation =
        'Audit database table missing (42P01). Check the Supabase project and installed audit migration.';
      break;
    case 'PGRST301':
    case 'PGRST302':
    case 'PGRST303':
      explanation =
        'Worker database authentication rejected. Check the public anon/publishable key and anonymous API access for the correct Supabase project.';
      break;
    case 'P0001':
      if (failure.message === 'Audit access denied')
        explanation =
          'Audit authorization missing or expired. Check that the worker uses the same Supabase project as Vercel, then start a fresh audit in ProspectCue.';
      else if (failure.message === 'Audit already running')
        explanation =
          'Another worker holds the audit lease. Retry after the three-minute lease expires.';
      break;
  }
  if (failure.message === 'Invalid API key')
    explanation =
      'Worker Supabase API key rejected. Use the public anon/publishable key from the same project as the Supabase URL.';
  else if (failure.message === 'TypeError: fetch failed')
    explanation =
      'Worker could not connect to Supabase. Check the Supabase URL and project availability.';
  return new Error(`Audit ${operation} failed: ${explanation}`);
}
