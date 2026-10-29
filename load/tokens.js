import http from 'k6/http';
import { check } from 'k6';
import { Rate } from 'k6/metrics';

// Claim: A token works on any request, whichever copy answers it.
const tokenWorks = new Rate('token_works_on_any_copy');

export const options = {
  iterations: 20,
  vus: 1,
  thresholds: {
    // Under the claim, every request using a valid token must succeed (rate == 1.0)
    'token_works_on_any_copy': ['rate == 1.0'],
  },
};

// Use token from environment or default to current api-1 startup token
const TOKEN = __ENV.TOKEN_1 || __ENV.TOKEN || 'VKCHDva6jGVTfcwUYAorpp90OUS4RsKZjMnX0i6xjtk';

export default function () {
  const params = {
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
    },
  };

  const res = http.get('http://proxy/bookings', params);
  const upstream = res.headers['X-Upstream'] || 'unknown';
  const success = (res.status === 200);

  tokenWorks.add(success);

  check(res, {
    'token accepted (status 200)': (r) => r.status === 200,
  });

  console.log(`[Token Check] Upstream: ${upstream} -> Status: ${res.status}`);
}

