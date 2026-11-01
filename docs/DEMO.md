# Demonstration script (password for every account: `Nexus@Demo2026`)

Prepare: `npm run db:setup`, `npm run dev` (DEMO_MODE=true). Reset Demo A any time: `npm run demo:reset` or the button in the Upload centre.

## Demo A: institution upload and validation (admin@sahyadri.demo)
1. Upload centre, download the template and the sample. 2. Drop `demo-data/sahyadri_2026-27_batch1_with_errors.csv`, preview (IDs masked), Check my file.
3. Results: 100 checked, 73 valid, 17 must be corrected; 3 duplicates, 7 APAAR problems, 9 inconsistent, 5 cross-institution; Mechanical 67 against 60 (+7).
4. Open a category card to filter; read "how to fix"; download the correction report.
5. Submit 83 valid rows (17 stay on hold). 6. Upload `…_corrected.csv`: 83 recognised as already received, 17 new. Submit: status Accepted, versions 1 and 2 kept.

## Demo B: AICTE Command Centre (admin@aicte.demo, after Demo A)
Command Centre, Live seat ledger (filter West, search Sahyadri), Regional analytics heatmap, Trust scores, open Sahyadri, Alerts (NRI rose from 5 to 16, read the explanation, record a review), Conflicts, Reports (CSV, PDF).

## Demo C: consent and QR (verifier@meridian.demo, student@nexus.demo)
1. Student: My profile, note the code. 2. Verifier: New request with the code, purpose, fields. 3. Student: Verification requests, untick a field, Approve. 4. Student: My QR verification. 5. Verifier: Scan or enter a code (type it, scan with the camera, or upload the QR picture). 6. Verifier sees only approved fields, signature, expiry. 7. Student: Consent history; Withdraw consent; the verifier's next check says withdrawn. `board@statetech.demo` is refused for the same code.
