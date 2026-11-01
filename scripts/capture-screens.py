# © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE.
"""Captures screenshots of every role experience. Usage: python3 scripts/capture-screens.py <out_dir>
Requires: pip install playwright && playwright install chromium. App must be running on :3000."""
import sys, os
from playwright.sync_api import sync_playwright
B = "http://localhost:3000"; OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
PW = "Nexus@Demo2026"
SHOTS = [  # (file, email or None, path, mobile)
 ("01-landing", None, "/", False), ("02-login", None, "/login", False),
 ("03-super-admin", "superadmin@nexus.demo", "/aicte", False), ("04-super-admin-users", "superadmin@nexus.demo", "/admin", False),
 ("05-super-admin-audit", "superadmin@nexus.demo", "/audit", False),
 ("06-aicte-admin", "admin@aicte.demo", "/aicte", False),
 ("07-regional-officer", "officer.west@aicte.demo", "/aicte?ay=2025-26", False),
 ("08-institution-admin", "admin@sahyadri.demo", "/institution?ay=2025-26", False),
 ("09-institution-students", "admin@sahyadri.demo", "/institution/students?ay=2024-25", False),
 ("10-data-operator", "operator@sahyadri.demo", "/institution?ay=2025-26", False),
 ("11-apaar-check", "operator@sahyadri.demo", "/institution/verify", False),
 ("12-student", "student.multi@nexus.demo", "/student", False),
 ("13-verifier", "verifier@meridian.demo", "/verifier", False),
 ("14-mobile-landing", None, "/", True), ("15-mobile-command-centre", "admin@aicte.demo", "/aicte", True),
 ("16-mobile-institution", "admin@sahyadri.demo", "/institution?ay=2025-26", True), ("17-mobile-student", "student@nexus.demo", "/student", True),
]
with sync_playwright() as p:
    b = p.chromium.launch()
    for name, email, path, mobile in SHOTS:
        ctx = b.new_context(viewport={"width": 390, "height": 844} if mobile else {"width": 1440, "height": 900}, reduced_motion="no-preference")
        pg = ctx.new_page()
        if email:
            pg.goto(B + "/login"); pg.fill("#email", email); pg.fill("#password", PW); pg.click("button:has-text('Sign in')")
            pg.wait_for_url(lambda u: "/login" not in u)
        pg.goto(B + path); pg.wait_for_selector("h1"); pg.wait_for_timeout(2200)
        pg.screenshot(path=f"{OUT}/{name}.png", full_page=True); ctx.close(); print("captured", name)
    b.close()
