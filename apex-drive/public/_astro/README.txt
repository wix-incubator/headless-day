Compatibility pins: stale edge-cached HTML (SWR grace up to a day) may still
reference these pre-inline-CSS stylesheet hashes, which each release would
otherwise 404. Same site-wide CSS content under the old names. Safe to
delete once the edge stops serving copies from 2026-07-09.
