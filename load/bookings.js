import http from 'k6/http';
import { check } from 'k6';
import { Rate, Counter } from 'k6/metrics';

// Claim: A room slot is booked at most once.
const slotBookedAtMostOnce = new Rate('slot_booked_at_most_once');
const confirmedCount = new Counter('confirmed_bookings_count');

export const options = {
  iterations: 1,
  vus: 1,
  thresholds: {
    // Under the claim, at most one copy may confirm a booking for the same slot
    'slot_booked_at_most_once': ['rate == 1.0'],
    'confirmed_bookings_count': ['count <= 1'],
  },
};

const TOKEN_1 = __ENV.TOKEN_1 || 'VKCHDva6jGVTfcwUYAorpp90OUS4RsKZjMnX0i6xjtk';
const TOKEN_2 = __ENV.TOKEN_2 || '7vbeY-0Nz2g4MpLucC39IN3aXxq8qCA6Yb7wK8RzISI';

const API_1 = 'http://f26-lab09-api-1:8080';
const API_2 = 'http://f26-lab09-api-2:8080';

export default function () {
  // Same room and exact same future time interval
  const bookingPayload = {
    roomId: 'r-1',
    start: '2026-10-31T14:00:00Z',
    end: '2026-10-31T15:00:00Z',
    attendees: '2',
  };

  const headers1 = {
    headers: {
      'Authorization': `Bearer ${TOKEN_1}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };

  const headers2 = {
    headers: {
      'Authorization': `Bearer ${TOKEN_2}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };

  // 1. Send booking request directly to copy 1
  const res1 = http.post(`${API_1}/bookings`, bookingPayload, headers1);
  console.log(`[Copy 1 Direct] Status: ${res1.status}, Body: ${res1.body}`);

  // 2. Send identical booking request directly to copy 2
  const res2 = http.post(`${API_2}/bookings`, bookingPayload, headers2);
  console.log(`[Copy 2 Direct] Status: ${res2.status}, Body: ${res2.body}`);

  let confirmed = 0;
  if (res1.status === 201 && res1.json('outcome') === 'confirmed') confirmed++;
  if (res2.status === 201 && res2.json('outcome') === 'confirmed') confirmed++;

  confirmedCount.add(confirmed);

  // Invariant holds only if at most one confirmed booking was created
  const invariantHeld = (confirmed <= 1);
  slotBookedAtMostOnce.add(invariantHeld);

  check(null, {
    'at most one copy confirmed the booking': () => invariantHeld,
  });
}

