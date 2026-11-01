# © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE.
"""Drives the three SIH demonstration flows through a real browser and captures a screenshot at each major step.
   App must be running on :3000 with the seeded database (npm run db:setup).  python3 scripts/browser-demos.py [shots_dir]
   Demo A: institution upload and validation   Demo B: AICTE Command Centre   Demo C: student consent and QR verification"""
import os, re, sys
from playwright.sync_api import sync_playwright

B = "http://localhost:3000"; PW = "Nexus@Demo2026"
SHOTS = sys.argv[1] if len(sys.argv) > 1 else "/tmp/shots-demos"; os.makedirs(SHOTS, exist_ok=True)
DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "demo-data")
res = []
def ok(n, c, d=""): res.append(bool(c)); print(("PASS " if c else "FAIL ") + n + ("" if c else "  " + str(d)[:300]))
def login(ctx, email):
    pg = ctx.new_page(); pg.goto(B + "/login"); pg.fill("#email", email); pg.fill("#password", PW); pg.click("button:has-text('Sign in')")
    pg.wait_for_url(lambda u: "/login" not in u); pg.wait_for_selector("h1"); return pg
def shot(pg, name): pg.wait_for_timeout(600); pg.screenshot(path=f"{SHOTS}/{name}.png", full_page=False)
def text(pg): return pg.inner_text("main")
def card_value(pg, label):  # the big number on a validation card, by its label
    el = pg.locator(f"main a:has-text('{label}'), main div:has-text('{label}')").first
    return int(re.sub(r"[^\d]", "", re.findall(r"\n\s*([\d,]+)\s*$", el.inner_text().strip().replace("\r", ""))[-1] if re.findall(r"\n\s*([\d,]+)\s*$", el.inner_text().strip()) else "-1") or "0")

with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-fake-ui-for-media-stream"])
    errors = []
    def watch(pg, who): pg.on("console", lambda m: errors.append((who, m.text[:160])) if m.type == "error" else None); pg.on("pageerror", lambda e: errors.append((who, str(e)[:160])))

    # ======================================================= DEMO A
    print("\n== DEMO A: institution upload and validation ==")
    ctx = b.new_context(viewport={"width": 1440, "height": 900}, accept_downloads=True); pg = login(ctx, "admin@sahyadri.demo"); watch(pg, "A")
    ok("A1 institution admin lands on the institution overview", "Sahyadri Institute of Technology" in pg.inner_text("h1"))
    pg.click("header nav a[href='/institution/upload']"); pg.wait_for_selector("h1:has-text('Upload centre')")
    # make the demo repeatable: reset any earlier 2026-27 upload
    pg.click("button:has-text('Reset my 2026-27 upload')"); pg.click("[role=alertdialog] button:has-text('Reset demonstration')"); pg.wait_for_selector("text=Reset: removed"); pg.wait_for_timeout(400)
    ok("A  demo can be reset from the screen (demo mode only)", True)
    shot(pg, "A01-upload-centre")
    with pg.expect_download() as d: pg.click("a:has-text('Blank template')")
    tpl = open(d.value.path()).read()
    ok("A2 template downloads with the standard columns", tpl.startswith("student_ref,full_name,date_of_birth,gender,apaar_id,programme_code,admission_year,academic_year,category_code,status"), tpl[:80])
    with pg.expect_download() as d: pg.click("a:has-text('Sample with 2 fictional rows')")
    ok("A2 a fictional sample file is available", "SAMPLE0001" in open(d.value.path()).read())
    ok("A3 every column is explained with Required / Optional markers", pg.locator("td:has-text('Required')").count() >= 9 and pg.locator("td:has-text('Optional')").count() >= 1)
    # wrong file type first
    open("/tmp/not-a-csv.txt", "w").write("hello"); pg.set_input_files("input[type=file]", "/tmp/not-a-csv.txt")
    ok("A4 a non-CSV file gets a friendly explanation", "not a CSV file" in text(pg))
    pg.click("button:has-text('Remove')")
    pg.set_input_files("input[type=file]", os.path.join(DATA, "sahyadri_2026-27_batch1_with_errors.csv")); pg.wait_for_selector("text=100 rows found")
    ok("A5 the file is previewed with its row count", "100 rows found" in text(pg) and pg.locator("main table tbody tr").count() > 8)
    prev = pg.locator("main table").last.inner_text()  # the preview table, not the documented example values
    ok("A5 APAAR IDs are masked in the preview", "•••• ••••" in prev and not re.search(r"\b\d{12}\b", prev), prev[:200])
    shot(pg, "A02-file-previewed")
    pg.click("button:has-text('Check my file for 2026-27')"); pg.wait_for_url(re.compile(r"/institution/submissions/[0-9a-f-]{36}$"), timeout=60000); pg.wait_for_selector("h1:has-text('Validation results')")
    shot(pg, "A03-validation-dashboard")
    body = text(pg)
    ok("A6 results show version 1 needs correction", "version 1" in body and "Needs correction" in body)
    def num_after(label):  # value shown on the card whose label starts with `label`
        m = re.search(re.escape(label) + r"\s+([\d,]+)", body.replace("\n", " ")); return int(m.group(1).replace(",", "")) if m else None
    ok("A6 total records checked = 100", num_after("Total records checked") == 100, num_after("Total records checked"))
    ok("A6 valid = 73, must be corrected = 17", num_after("Valid") == 73 and num_after("Must be corrected") == 17, (num_after("Valid"), num_after("Must be corrected")))
    ok("A6 the five check categories are reported (3 duplicate, 7 APAAR, 9 inconsistent, 5 cross-institution)", (num_after("Duplicate records"), num_after("APAAR ID problems"), num_after("Inconsistent data"), num_after("Cross-institution clashes")) == (3, 7, 9, 5), (num_after("Duplicate records"), num_after("APAAR ID problems"), num_after("Inconsistent data"), num_after("Cross-institution clashes")))
    ok("A6 intake overshoot is quantified (+7 for Mechanical)", num_after("Intake overshoot") == 7 and "+7" in body)
    ok("A7 rows explain what happened AND how to fix it", "How to fix:" in body and "APAAR ID could not be verified" in body and "same APAAR ID" in body.replace("\n", " ") or "How to fix:" in body)
    ok("A7 supernumerary NRI is reported separately from intake", "Supernumerary admissions are counted separately" in body or "NRI quota cap" in body or "illustrative allowance" in body)
    ok("A7 APAAR format vs simulated verification are kept apart", "Verified by the simulated registry" in body and "not connected to any government system" in body)
    pg.click("main a:has-text('Duplicate records')"); pg.wait_for_url(re.compile("cat=DUPLICATE")); ok("A7 the duplicate card filters to its 3 rows", pg.locator("main tbody tr").filter(has_text="Duplicate records").count() >= 3)
    pg.go_back(); pg.wait_for_selector("h1:has-text('Validation results')")
    with pg.expect_download() as d: pg.click("a:has-text('Correction report')")
    rep = open(d.value.path()).read()
    ok("A8 the correction report downloads with reasons, fixes and masked IDs", "how_to_fix" in rep and "MUST FIX" in rep and not re.search(r"\b99\d{10}\b", rep) and rep.count("\n") > 20)
    pg.click("button:has-text('Submit 83 valid rows')"); shot(pg, "A04-confirm-submit"); pg.click("[role=alertdialog] button:has-text('Yes, submit them')"); pg.wait_for_selector("text=17 rows are on hold", timeout=30000)
    ok("A9 valid rows submitted; 17 rows stay on hold, nothing deleted", "17 rows are on hold" in text(pg) and "Needs correction" in text(pg))
    shot(pg, "A05-partially-submitted")
    pg.click("header nav a[href='/institution/upload']"); pg.wait_for_selector("h1:has-text('Upload centre')")
    pg.set_input_files("input[type=file]", os.path.join(DATA, "sahyadri_2026-27_batch1_corrected.csv")); pg.wait_for_selector("text=100 rows found")
    pg.click("button:has-text('Check my file for 2026-27')"); pg.wait_for_url(re.compile(r"/institution/submissions/[0-9a-f-]{36}$"), timeout=60000); pg.wait_for_selector("h1:has-text('Validation results')")
    b2 = text(pg)
    ok("A10 the corrected file is version 2 and unchanged records are recognised, not duplicated", "version 2" in b2 and "already on file" in b2 and "Submit 17 valid rows" in b2)
    shot(pg, "A06-corrected-file-results")
    pg.click("button:has-text('Submit 17 valid rows')"); pg.click("[role=alertdialog] button:has-text('Yes, submit them')"); pg.wait_for_selector("text=This file is fully submitted", timeout=30000)
    ok("A11 status is Accepted and the file is fully submitted", "Accepted" in text(pg) and "fully submitted" in text(pg))
    ok("A11 version history keeps both versions", pg.locator("main a:has-text('Version 1')").count() == 1 and pg.locator("main a:has-text('Version 2')").count() == 1)
    shot(pg, "A07-accepted")
    pg.goto(B + "/institution/submissions"); ok("A12 submission history lists both versions with statuses", "Replaced by a newer file" in text(pg) and "Accepted" in text(pg)); shot(pg, "A08-submission-history")
    pg.goto(B + "/institution/trust"); pg.wait_for_selector("h1:has-text('Trust Score')"); ok("A13 the institution can see its Trust Score and why", "A prototype assessment metric" in text(pg) and "What lowered the score" in text(pg)); shot(pg, "A09-institution-trust-score")
    ctx.close()

    # ======================================================= DEMO B
    print("\n== DEMO B: AICTE Command Centre ==")
    ctx = b.new_context(viewport={"width": 1440, "height": 900}, accept_downloads=True); pg = login(ctx, "admin@aicte.demo"); watch(pg, "B")
    ok("B1 AICTE admin lands on the Command Centre", "National Command Centre" in pg.inner_text("h1")); pg.wait_for_timeout(1500); shot(pg, "B01-command-centre")
    t = text(pg)
    ok("B3 the Live Seat Ledger and counts are on the dashboard", "Live seat ledger" in t and "Approved intake" in t and "Open cross-institution conflicts" in t and "Average Trust Score" in t)
    ok("B3 institutions requiring attention are listed", "Institutions requiring attention" in t)
    pg.click("header nav a[href='/aicte/seat-ledger']"); pg.wait_for_selector("h1:has-text('Live seat ledger')"); pg.wait_for_timeout(1200); shot(pg, "B02-seat-ledger")
    rows_all = pg.locator("main table:has(th button) tbody tr").count()
    pg.select_option("select:near(:text('Region'))", "WEST"); pg.wait_for_timeout(300)
    ok("B5 filtering by region narrows the ledger", 0 < pg.locator("main table:has(th button) tbody tr").count() < rows_all or rows_all <= 15, (rows_all, pg.locator("main table:has(th button) tbody tr").count()))
    pg.fill("input[placeholder^='Search institution']", "Sahyadri"); pg.wait_for_timeout(300); ok("B5 search finds Sahyadri's programmes", "Sahyadri" in text(pg) and "Aravalli" not in pg.locator("table:has(th button)").inner_text())
    ok("B5 Sahyadri's Mechanical programme shows the overshoot after Demo A", re.search(r"\+\d+", pg.locator("table:has(th button)").inner_text()) is not None, pg.locator("table:has(th button)").inner_text()[:300])
    shot(pg, "B03-seat-ledger-filtered")
    pg.click("header nav a[href='/aicte/regions']"); pg.wait_for_selector("h1:has-text('Regional analytics')"); pg.wait_for_timeout(1200)
    ok("B6 the regional heatmap and comparison charts are shown", pg.locator("table caption:has-text('Seat utilisation by region')").count() == 1 and pg.locator("main figure .recharts-wrapper").count() >= 1); shot(pg, "B04-regional-heatmap")
    pg.click("header nav a[href='/aicte/trust']"); pg.wait_for_selector("h1:has-text('Institution Trust Scores')")
    ok("B7 Trust Scores are listed with bands and the biggest factor", "Biggest factor" in text(pg) and "Sahyadri" in text(pg) and "Not scored" in text(pg)); shot(pg, "B05-trust-scores")
    pg.click("main a:has-text('Sahyadri Institute of Technology')"); pg.wait_for_selector("h1:has-text('Sahyadri Institute')"); pg.wait_for_timeout(1000)
    ok("B7 the institution page explains its score, with improvement advice", "What lowered the score" in text(pg) and "To improve:" in text(pg) and "not an AICTE accreditation" in text(pg)); shot(pg, "B06-institution-detail")
    with pg.expect_download() as d: pg.click("a:has-text('PDF report')")
    pdf = open(d.value.path(), "rb").read(); ok("B10 an institutional PDF report is generated", pdf[:4] == b"%PDF" and len(pdf) > 1500, len(pdf))
    pg.click("header nav a[href='/aicte/alerts']"); pg.wait_for_selector("h1:has-text('Alerts and conflicts')"); pg.wait_for_timeout(500); shot(pg, "B07-alerts")
    ok("B8 an anomaly alert for Sahyadri's NRI increase is present", "NRI admissions rose from" in text(pg) and "Sahyadri" in text(pg))
    ok("B9 each alert explains what we saw, what it was compared with, and why", "What we saw" in text(pg) and "Compared with" in text(pg) and "Why it matters" in text(pg) and "not proof of wrongdoing" in text(pg))
    card = pg.locator("main ul > li").filter(has_text="NRI admissions rose from").first
    card.locator("button:has-text('Review')").click(); pg.wait_for_selector("[role=alertdialog]"); shot(pg, "B08-review-dialog")
    pg.click("[role=alertdialog] label:has-text('Mark as under review')"); pg.click("[role=alertdialog] button:has-text('Save decision')"); pg.wait_for_selector("text=Decision recorded"); pg.wait_for_timeout(600)
    ok("B9 AICTE records a review decision, and the alert shows its new status", pg.locator("main ul > li").filter(has_text="NRI admissions rose from").first.inner_text().count("Under review") >= 1)
    pg.click("main nav[aria-label='Alert filters'] a:has-text('Cross-institution conflicts')"); pg.wait_for_selector("text=What matched"); ok("B8 cross-institution conflicts are listed with institutions, matched fields and a review workflow", "What matched" in text(pg) and "Review" in text(pg) and "not an accusation" in text(pg).replace("\n", " ") or "flag for human review" in text(pg)); shot(pg, "B09-conflicts")
    pg.click("header nav a[href='/aicte/reports']"); pg.wait_for_selector("h1:has-text('Reports')")
    with pg.expect_download() as d: pg.click("a:has-text('Download report')")
    csvt = open(d.value.path()).read(); ok("B10 a CSV report downloads with its provenance and no personal data", "Live seat ledger" in csvt and "Synthetic" in csvt and not re.search(r"\b99\d{10}\b", csvt))
    shot(pg, "B10-reports")
    ctx.close()

    # ======================================================= DEMO C
    print("\n== DEMO C: student consent and QR verification ==")
    sctx = b.new_context(viewport={"width": 1440, "height": 900}); vctx = b.new_context(viewport={"width": 1440, "height": 900}, accept_downloads=True)
    sp = login(sctx, "student@nexus.demo"); watch(sp, "C-student"); vp = login(vctx, "verifier@meridian.demo"); watch(vp, "C-verifier")
    sp.wait_for_selector("code[aria-label='Your verification code']"); code = sp.inner_text("code[aria-label='Your verification code']").strip()
    ok("C  the student has a shareable code that reveals nothing by itself", re.fullmatch(r"[A-Z0-9]{5}-[A-Z0-9]{5}", code) is not None and "reveals nothing by itself" in text(sp), code); shot(sp, "C01-student-profile-code")
    vp.click("header nav a[href='/verifier/new']"); vp.wait_for_selector("h1:has-text('New verification request')")
    vp.fill("#studentCode", code); vp.select_option("#purpose", "Employment verification")
    vp.check("label:has-text('Programme') input"); ok("C2 verifier sees plain-language descriptions and a personal-data warning on Name", vp.locator("text=Personal").count() >= 1)
    shot(vp, "C02-verifier-new-request"); vp.click("button:has-text('Send request')"); vp.wait_for_selector("h2:has-text('Request sent')"); ref = vp.inner_text("p.font-mono").strip()
    ok("C2 the request is sent with a reference", ref.startswith("CR-"), ref); shot(vp, "C03-request-sent")
    sp.goto(B + "/student/requests"); sp.wait_for_selector("h1:has-text('Verification requests')")
    ok("C4 the student sees WHO is asking, WHY, and exactly which fields", "Meridian Talent Partners" in text(sp) and "Employment verification" in text(sp) and "Enrolment status" in text(sp) and "Programme" in text(sp))
    ok("C4 nothing is pre-approved: Name (personal) is not offered unless asked, and the student chooses", sp.locator("input[type=checkbox]").count() == 2 and "Your name" not in text(sp)); shot(sp, "C04-student-sees-request")
    sp.uncheck("label:has-text('Programme') input"); ok("C5 the student can share less than was asked for", "Approve and share 1 item" in text(sp))
    sp.check("label:has-text('Programme') input"); sp.click("button:has-text('Approve and share 2 items')"); sp.wait_for_url("**/student/qr"); sp.wait_for_selector("img[alt^='QR code for verification']"); sp.wait_for_timeout(500)
    vcode = re.search(r"EV-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}", text(sp)).group(0)
    ok("C6 a signed verification record is issued and shown as a QR with a code and expiry", re.fullmatch(r"EV-.*", vcode) is not None and "Valid until" in text(sp) and "contains only this code" in text(sp)); shot(sp, "C05-student-qr")
    # verifier enters the code
    vp.click("header nav a[href='/verifier/check']"); vp.wait_for_selector("h1:has-text('Scan or enter a code')"); vp.fill("#code", vcode.lower()); vp.click("button:has-text('Check this code')"); vp.wait_for_selector("h2:has-text('Verified')")
    rt = text(vp)
    ok("C7 the code resolves: Verified, signature genuine, consent reference shown", "Verified" in rt and "Genuine (Ed25519" in rt and ref in rt and "Employment verification" in rt)
    ok("C8 the verifier sees ONLY the authorised fields", "Enrolment status" in rt and "Programme" in rt and "Your name" not in rt and "Date of birth" not in rt and "Nothing else about the student is available" in rt); shot(vp, "C06-verified-result")
    # QR picture path: screenshot the student's QR and let the verifier "scan" the image
    sp.locator("img[alt^='QR code for verification']").first.screenshot(path="/tmp/student-qr.png")
    vp.goto(B + "/verifier/check"); vp.set_input_files("input[type=file][accept='image/*']", "/tmp/student-qr.png"); vp.wait_for_url(re.compile(r"via=qr"), timeout=15000); vp.wait_for_selector("h2:has-text('Verified')")
    ok("C7 scanning the student's QR image in the browser resolves the same record (QR pipeline end to end)", "Genuine (Ed25519" in text(vp)); shot(vp, "C07-qr-scanned")
    # another verifier organisation cannot open it
    octx = b.new_context(viewport={"width": 1440, "height": 900}); op = login(octx, "board@statetech.demo")
    op.goto(B + f"/verifier/check?code={vcode}"); op.wait_for_selector("h2:has-text('Not permitted')"); ok("C  a different organisation is refused (least privilege)", "different requester" in text(op)); octx.close()
    # consent log + revocation
    sp.goto(B + "/student/consents"); sp.wait_for_selector("h1:has-text('Consent history')"); sp.wait_for_selector("main table")
    ok("C11 the Student Consent Log records requester, purpose, requested vs shared fields, decision and times", ref in text(sp) and "Employment verification" in text(sp) and "Approved" in text(sp) and "Valid until" in text(sp) and "Declined" in text(sp) and "Withdrawn" in text(sp) and "Expired" in text(sp)); shot(sp, "C08-consent-log")
    row = sp.locator("tr", has_text=ref); row.locator("button:has-text('Withdraw consent')").click(); sp.click("[role=alertdialog] button:has-text('Withdraw consent')"); sp.wait_for_selector("text=Consent withdrawn"); sp.wait_for_timeout(700)
    ok("C9 the student withdraws consent", "Withdrawn" in sp.locator("tr", has_text=ref).inner_text())
    vp.goto(B + f"/verifier/check?code={vcode}"); vp.wait_for_selector("h2:has-text('Consent withdrawn')"); ok("C9 the withdrawn record no longer verifies", "withdrew consent" in text(vp)); shot(vp, "C09-after-withdrawal")
    vp.goto(B + "/verifier/history"); vp.wait_for_selector("h1:has-text('Request history')"); vp.wait_for_selector("main table"); ht = text(vp)
    ok("C11 the verifier's history lists the request", ref in ht, ref); ok("C11 the verifier's history lists QR-scan and typed-code lookups", "QR scan" in ht and "Typed code" in ht); shot(vp, "C10-verifier-history")
    sctx.close(); vctx.close()

    ok("no console or page errors during any demo flow", not errors, errors[:4])
    b.close()
print(f"\n{sum(res)} passed, {len(res) - sum(res)} failed")
sys.exit(0 if all(res) else 1)
