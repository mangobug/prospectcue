type DatabaseFailure = { code?: string; message?: string };

// PostgREST details, hints and messages can contain capabilities, SQL values,
// URLs or headers. Only known classifications belong in worker error logs.
export function auditDatabaseError(
  operation: 'claim' | 'result' | 'status',
  failure: DatabaseFailure,
  httpStatus?: number,
) {
  let explanation = 'Unknown database error. Check Supabase API logs.';
  if (httpStatus === 401 || httpStatus === 403)
    explanation =
      'Supabase rejected the worker API request. Check the public anon/publishable key and project API access settings.';
  else if (httpStatus === 404)
    explanation =
      'Supabase API endpoint not found. Check that the worker uses the project API URL, without a dashboard or REST path.';
  else if (httpStatus === 0)
    explanation =
      'The worker did not receive a usable Supabase response. Check the URL, network access and API key formatting.';
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
  else if (
    failure.message?.includes('invalid header value') ||
    failure.message?.includes('not a valid HTTP header value')
  )
    explanation =
      'Worker API key contains invalid HTTP header characters. Copy the public key again without line breaks or quotes.';

  const diagnostics: string[] = [];
  if (
    typeof httpStatus === 'number' &&
    Number.isInteger(httpStatus) &&
    (httpStatus === 0 || (httpStatus >= 100 && httpStatus <= 599))
  )
    diagnostics.push(`HTTP ${httpStatus}`);
  // SQLSTATE and PostgREST codes are safe identifiers. Arbitrary provider fields
  // are still excluded, including nonstandard codes and all details/hints.
  if (
    typeof failure.code === 'string' &&
    /^(?:[A-Z0-9]{5}|PGRST[0-9]{3})$/.test(failure.code)
  )
    diagnostics.push(`database code ${failure.code}`);
  const suffix = diagnostics.length ? ` [${diagnostics.join('; ')}]` : '';
  return new Error(`Audit ${operation} failed: ${explanation}${suffix}`);
}
