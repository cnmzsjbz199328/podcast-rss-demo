export const DEFAULT_CORS_HEADERS = Object.freeze({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
});

function toHeaders(input) {
  if (!input) {
    return new Headers();
  }

  if (input instanceof Headers) {
    return new Headers(input);
  }

  return new Headers(input);
}

export function mergeCorsHeaders(headers) {
  const merged = new Headers(DEFAULT_CORS_HEADERS);
  const incoming = toHeaders(headers);

  incoming.forEach((value, key) => {
    merged.set(key, value);
  });

  return merged;
}

export function jsonResponse(body, status = 200, headers) {
  const mergedHeaders = new Headers({
    'Content-Type': 'application/json',
    ...Object.fromEntries(toHeaders(headers))
  });

  return new Response(JSON.stringify(body), {
    status,
    headers: mergeCorsHeaders(mergedHeaders)
  });
}

export function ensureCors(response) {
  if (!response) {
    return new Response(null, {
      status: 204,
      headers: new Headers(DEFAULT_CORS_HEADERS)
    });
  }

  const headers = mergeCorsHeaders(response.headers);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export function optionsResponse(additionalHeaders) {
  return new Response(null, {
    status: 204,
    headers: mergeCorsHeaders(additionalHeaders)
  });
}
