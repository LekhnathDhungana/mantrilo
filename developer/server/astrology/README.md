# Astrology calculation engine v1

The Node backend computes real results locally with the MIT-licensed [Astronomy Engine](https://github.com/cosinekitty/astronomy/tree/master/source/js). No external astrology provider or API credential is required.

## API

`POST /v1/astrology/calculate` on the public API accepts sandbox and production API keys in `Authorization: Bearer …`. The console's `POST /api/astrology/calculate` instead requires the protected session, exact Origin, and CSRF token. Both use the same engine and the workspace's normal usage records.

```json
{
  "operation": "positions",
  "datetime": "2026-11-07T12:00:00Z",
  "ayanamsaDegrees": 24.2
}
```

`operation`: `positions` or `panchang`. `datetime`: valid ISO calendar date-time including seconds and an explicit `Z` or ±HH:MM offset, within UTC years 1900–2100. `ayanamsaDegrees`: optional finite number from 0 to 60 for that instant. Unknown fields are rejected rather than silently implying support. The console input is explicitly UTC. The supported interval is an input contract, not a precision guarantee.

Successful responses include `data`, `usage`, `calculated: true`, `requestId`, and server `responseTimeMs`. Authentication failures return 401, invalid inputs 400, quota rejections 429, and computation failures 422. No result is fabricated on error.

## Returned calculations

- `positions`: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn. Geocentric tropical and sidereal ecliptic longitude, ecliptic latitude, distance in AU, rashi number/name/degrees, nakshatra number/name/pada, apparent longitudinal speed, and retrograde flag. Speed uses a symmetric two-hour finite difference, reported as degrees/day. It is apparent geocentric motion, not physical orbital direction.
- `panchang`: instant tithi/paksha, nakshatra/pada, yoga number, karana, and Sun/Moon rashis. It deliberately does **not** return sunrise-based vara or assign a daily almanac/festival date. No location is requested because the returned elements are geocentric and evaluated at the supplied instant.

The Moon uses `EclipticGeoMoon`; other bodies use `Ecliptic(GeoVector(body, date, true))`. The library's `EclipticLongitude` is heliocentric, so it is not used for geocentric planetary positions. [Reference documentation](https://raw.githubusercontent.com/cosinekitty/astronomy/master/source/js/README.md).

Classification follows the angular definitions described by the [Government of India's Rashtriya Panchang](https://packolkata.imd.gov.in/panchang/en/explanation): tithi segments of 12° Moon–Sun elongation; karana half-segments of 6°; 27 sidereal nakshatra segments; yoga from the sidereal Sun+Moon longitude sum. The initial implementation returns indices/names at the instant, not transition times. This is not a claim of equivalence to the official almanac's sunrise convention or ephemeris.

## Sidereal offset: explicit starter approximation

Default:

`ayanamsa = 23.85709° + (50.29 / 3600) × Julian years since J2000`

This is labeled `lahiri_linear_approximation`, never exact Lahiri/Swiss Ephemeris. The baseline convention is also documented in the author's [Panchang methodology](https://github.com/surendrajat/panchang/blob/main/docs/METHODOLOGY.md); the simplified linear implementation here is not that project's full precession model. Nutation, detailed precession, and tradition-specific definitions are not reproduced by this offset. Results can differ near rashi/nakshatra/pada/yoga boundaries. A supplied offset is labeled `user_supplied`; its external correctness is not independently validated. Floating-point normalization avoids cancellation when a positive angle is already within range.

To extend this later, replace/add the ayanamsa strategy in `engine.mjs`, add independent fixtures for the intended convention, and version the method contract. Houses, ascendant, lunar nodes, dashas, sunrise-based daily Panchang, transition times, local calendar rules, matching, and predictive interpretations are intentionally absent in v1.

## Usage and privacy

Astrology is included in every plan. A successful calculation costs one normal content request, recorded as `astrology.positions` or `astrology.panchang` alongside other API usage, and draws on the same monthly allowance. Invalid inputs and rejected operations cost nothing.

The engine computes first and charges only after it succeeds. No input time, location/birth details, or calculated result is saved in general activity logs or usage records. Only operation name, request ID, timestamp, status, and counters are recorded. Browser results live in component memory, not local storage.

## Verification and limits

Tests include angular boundaries and karana ordering, timezone-equivalent instants, custom offset behavior, invalid dates/offsets/fields, deterministic real results, session/CSRF protection, one-content-request charging on sandbox and production keys, free failures, private log contents, and quota enforcement.

A Sun-longitude regression checks the [USNO March equinox reference](https://aa.usno.navy.mil/api/seasons?year=2024) (2024-03-20 03:06 UTC). Panchang elongation is also checked against `MoonPhase` through a different path in the **same library**, which is a consistency check rather than an independent ephemeris validation. This starter test set does not establish high-precision or tradition-specific Panchang conformance. Further independent reference datasets should accompany the detailed specification.
