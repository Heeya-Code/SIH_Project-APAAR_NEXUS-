# Institution Trust Score (prototype assessment metric)

**Not an AICTE accreditation, approval or rating.** It summarises how reliable an institution's submitted data looks, and every point is traceable to a measurable fact shown on screen.

`Score = Σ weight × component / 100`, each component 0 to 100, weights sum to 100.

| Component | Default weight | Formula (score = 100 unless reduced) |
|---|---|---|
| Identifier completeness | 20 | 100 × (1 − students without an APAAR ID / students) |
| APAAR format validity | 20 | 100 × well-formed / provided (format only, not verification) |
| Duplicate records | 15 | 100 × (1 − duplicate rate / 5%); zero at 5% |
| Intake compliance | 20 | 100 × (1 − overshoot / 25%) − 20 per supernumerary allowance exceeded. Overshoot = Σ over programmes of seats above approved intake ÷ total intake |
| Data consistency | 10 | 100 × (1 − first-submission error rate / 10%) |
| Submission timeliness | 10 | 100 on or before 30 September; −5 per late day |
| Unresolved conflicts | 5 | 100 − 10 per open conflict − 25 per open high-severity alert |

Bands: 85+ Strong · 70 to 84 Good · 50 to 69 Needs attention · below 50 At risk.
A year with no accepted submission is **not scored** (never scored as zero).

**Configure** weights with `TRUST_WEIGHTS_JSON` (validated; invalid values fall back to defaults with a visible warning on Configuration). The 5%, 10%, 25% and per-day constants are illustrative and live in `src/lib/trust/score.ts`; thresholds should be agreed with AICTE before any real use.
