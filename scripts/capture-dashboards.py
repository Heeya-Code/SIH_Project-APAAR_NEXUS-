# © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE.
"""Screenshots of every major page for every role (desktop) plus mobile views. App on :3000, database seeded, ideally after Demo A
   so alerts, Trust Scores and consent history are populated.  python3 scripts/capture-dashboards.py docs/screenshots/dashboards"""
import os, sys
from playwright.sync_api import sync_playwright
THEME = os.environ.get("THEME", "dark")
B = "http://localhost:3000"; PW = "Nexus@Demo2026"; OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp/dash"; os.makedirs(OUT, exist_ok=True)
SHOTS = [("superadmin@nexus.demo", "/admin", "super-admin-platform-overview"), ("superadmin@nexus.demo", "/admin/institutions", "super-admin-institutions"), ("superadmin@nexus.demo", "/admin/config", "super-admin-configuration"), ("superadmin@nexus.demo", "/audit", "super-admin-audit"),
 ("admin@aicte.demo", "/aicte", "aicte-command-centre"), ("admin@aicte.demo", "/aicte/institutions", "aicte-institution-directory"), ("admin@aicte.demo", "/aicte/seat-ledger", "aicte-seat-ledger"), ("admin@aicte.demo", "/aicte/regions", "aicte-regional-analytics"),
 ("admin@aicte.demo", "/aicte/trust", "aicte-trust-scores"), ("admin@aicte.demo", "/aicte/alerts", "aicte-alerts"), ("admin@aicte.demo", "/aicte/alerts?tab=conflicts", "aicte-conflicts"), ("admin@aicte.demo", "/aicte/reports", "aicte-reports"), ("admin@aicte.demo", "/notifications", "shared-notifications"), ("admin@aicte.demo", "/help", "shared-help"),
 ("officer.west@aicte.demo", "/aicte", "regional-officer-overview"), ("officer.west@aicte.demo", "/aicte/seat-ledger", "regional-officer-seat-ledger"), ("officer.west@aicte.demo", "/aicte/alerts", "regional-officer-alerts"),
 ("admin@sahyadri.demo", "/institution", "institution-admin-overview"), ("admin@sahyadri.demo", "/institution/upload", "institution-admin-upload-centre"), ("admin@sahyadri.demo", "/institution/submissions", "institution-admin-submission-history"), ("admin@sahyadri.demo", "/institution/trust", "institution-admin-trust-score"), ("admin@sahyadri.demo", "/institution/operators", "institution-admin-data-operators"), ("admin@sahyadri.demo", "/profile", "shared-profile"),
 ("operator@sahyadri.demo", "/institution", "data-operator-work-dashboard"), ("operator@sahyadri.demo", "/institution/submissions", "data-operator-submissions"),
 ("student@nexus.demo", "/student", "student-profile"), ("student.multi@nexus.demo", "/student/requests", "student-verification-requests"), ("student@nexus.demo", "/student/consents", "student-consent-history"), ("student@nexus.demo", "/student/qr", "student-qr-verification"),
 ("verifier@meridian.demo", "/verifier", "verifier-dashboard"), ("verifier@meridian.demo", "/verifier/new", "verifier-new-request"), ("verifier@meridian.demo", "/verifier/check", "verifier-scan-or-enter"), ("verifier@meridian.demo", "/verifier/history", "verifier-history")]
MOBILE = [("admin@aicte.demo", "/aicte", "mobile-aicte-command-centre"), ("admin@sahyadri.demo", "/institution/upload", "mobile-institution-upload"), ("student@nexus.demo", "/student/qr", "mobile-student-qr"), ("verifier@meridian.demo", "/verifier/check", "mobile-verifier-check")]
with sync_playwright() as p:
    b = p.chromium.launch(); n = 0
    for size, items in (({"width": 1440, "height": 900}, SHOTS), ({"width": 390, "height": 844}, MOBILE)):
        ctxs = {}
        for email, path, name in items:
            if email not in ctxs:
                ctxs[email] = b.new_context(viewport=size); ctxs[email].add_init_script(f"try{{localStorage.setItem('nexus-theme','{THEME}')}}catch(e){{}}"); pg = ctxs[email].new_page(); pg.goto(B + "/login"); pg.fill("#email", email); pg.fill("#password", PW); pg.click("button:has-text('Sign in')"); pg.wait_for_url(lambda u: "/login" not in u); pg.close()
            pg = ctxs[email].new_page(); pg.goto(B + path); pg.wait_for_selector("h1"); pg.mouse.move(size["width"] * 0.45, size["height"] * 0.42); pg.wait_for_timeout(1800)
            pg.screenshot(path=f"{OUT}/{name}.png", full_page=False); pg.close(); n += 1
    b.close()
print(n, "screenshots written to", OUT)
