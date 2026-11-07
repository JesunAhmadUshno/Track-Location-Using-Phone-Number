# Research and engineering review

Repo: `Track-Location-Using-Phone-Number`, a short Python script that follows a tutorial.
It is a product-style script, not a study, so it is graded mainly on engineering rigor, with the research
rubric applied where it fits. Grades: A (publishable or production), B (solid), C (works with gaps),
D (tutorial-level), F (missing or wrong).

**Overall: D before this review, C after the fixes on this branch.** The pipeline does what its code says.
The repo name claimed more than the code does, and the code had a crash bug and committed secrets.

## Research rubric

| Criterion | Before | After | Notes |
|---|---|---|---|
| Question | F | C | The name implied device tracking. The real question is now stated: "what can a phone number's prefix reveal about its registered region and carrier?" (README, dashboard hero). |
| Hypotheses | F | D | None stated. The dashboard's implicit claim (region and carrier only, never device) follows from the code, not from a test. |
| Method | D | C | Five stages, now in named functions (`lookup`, `geocode`, `save_map`). The method is documented in the README. |
| Baselines | F | F | No comparison with another lookup method or with ground truth. See gap 1. |
| Statistics and uncertainty | F | D | No accuracy figures. The dashboard reports coverage shares of the metadata on library example numbers only and says they are not accuracy. |
| Reproducibility | F | B | `requirements.txt` pins versions; `scripts/export_metadata.py` regenerates `results/*.json` byte for byte (checked twice) and records the phonenumbers version; the site build re-derives every count. |
| Threats to validity | F | C | Listed on the dashboard and below: porting, VoIP and non-geographic numbers, roaming, shared calling codes, place-name centroids. |
| Related work | F | D | Only library links. Google libphonenumber is the upstream source of the metadata. No survey of number-intelligence or geolocation literature. |
| Limitations | F | B | Stated in the README, the dashboard's issues window and here. |

## Engineering rubric

| Criterion | Before | After | Notes |
|---|---|---|---|
| Correctness | F | B | `folium` was used but never imported, so the original script crashed with NameError before the map was saved. Fixed. |
| Input validation | F | B | `lookup()` calls `phonenumbers.is_valid_number` and raises `ValueError`; malformed text raises `NumberParseException`. |
| Error handling | F | B | An empty geocode result now raises `LookupError` instead of `IndexError` on `results[0]`. The OpenCage client already retries network errors and server faults with backoff; `main()` turns what is left (bad key, quota, rate limit, offline, no match) into a one-line message and exit code 1 instead of a traceback. |
| Security | F | C | The OpenCage key was hard-coded. It is now read from `OPENCAGE_API_KEY`. It is still in git history, which is not rewritten, so the key must be revoked by the owner. The site build fails if the key or the old number appears in `site/dist` (hash-based guard, `site/scripts/guard-dist.mjs`). |
| Privacy | F | C | `myphone.py` held what looks like a real personal number. It now holds the library's example number; the old value remains in history and is never exported. |
| Tests | F | B | `test_lookup.py` (9 tests, offline, no key): stages 1 to 3 with library example numbers plus invalid and malformed input; stage 4 with the OpenCage client replaced by a fake (normal result, empty result raising `LookupError`, `NotAuthorizedError` handled by `main()`); stage 5 writes a real folium map to a temp file. The stage 4 fixture is hand-written in OpenCage's documented response shape, not recorded from the live API. |
| Dependencies | F | B | Pinned in `requirements.txt`. |
| Structure | D | C | Functions plus a `main()` entry point; nothing runs on import. |
| Documentation | D | B | README rewritten with usage, sample output and an ethics note. |

## Cheap gaps fixed on this branch

1. Added the missing `folium` import (inside `save_map`).
2. Moved the API key to an environment variable; stages 4 and 5 are skipped cleanly without it.
3. The number comes from the command line or `PHONE_NUMBER`; `myphone.py` holds the library example number.
4. `lookup()` validates the number; empty geocode results raise a clear error; OpenCage failures end with a one-line message and exit code 1.
5. `requirements.txt` with exact pins (phonenumbers 9.0.43, opencage 3.2.0, folium 0.20.0).
6. `scripts/export_metadata.py` and `results/*.json`: the data behind the dashboard.
7. `test_lookup.py`: offline tests of all five stages (stage 4 against a fake OpenCage client).
8. README rewritten; the dashboard explains the region-not-device distinction and lists every issue.

## Remaining gaps and what each needs

1. **Accuracy of the region and centroid (baseline and statistics).** Needs a labelled dataset of numbers
   with consented, known usage locations (for example a few hundred volunteer numbers with home city),
   then the distance from the OpenCage centroid to the true city, reported with a bootstrap interval.
   Data collection needs consent and an ethics review; compute is trivial (minutes on a laptop, about one
   OpenCage call per number, which a few hundred numbers keep within a free trial; check current limits).
2. **Carrier staleness after porting.** Needs a number-portability lookup source (an HLR or MNP query
   service, paid per query) for a consented sample, to measure how often `carrier.name_for_number`
   disagrees with the current carrier.
3. **Stage 4 against the live API.** Fixed in part: stages 4 and 5 now have offline tests with a fake
   client. A contract test against the real service still needs an OpenCage key stored as a CI secret
   (one free-tier call per run) and a recorded response; that key is the owner's to issue (see gap 5).
4. **Failure behaviour for OpenCage.** Fixed with a default: one-line message on stderr and exit code 1.
   If the owner wants different behaviour (for example falling back to stages 1 to 3 output with exit
   code 0), it is a two-line change in `main()` and its test. No compute or data needed.
5. **Leaked key.** Owner action, free: revoke the key on opencagedata.com and issue a new one kept only
   in the environment. History is intentionally not rewritten.
6. **Repo name.** Owner decision: renaming would match the README, but changes the URL and the Pages path.

## Threats to validity of the dashboard itself

- Example numbers are one or two per region, chosen by the library authors, so coverage shares describe
  the metadata tables, not real traffic.
- The browser inspector checks E.164 shape and the calling-code prefix only; allocation checks need the
  full Python library and are labelled as such.
- Results depend on the phonenumbers version recorded in the JSON (9.0.43); metadata changes between releases.
