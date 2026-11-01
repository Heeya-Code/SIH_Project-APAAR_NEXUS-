# © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE.
"""WCAG 2.0/2.1 A + AA audit with axe-core over every role's pages. App must be running on :3000.
   npm install (provides axe-core) ; pip install playwright && playwright install chromium"""
import json, os, sys, pathlib
from playwright.sync_api import sync_playwright
B = "http://localhost:3000"; PW = "Nexus@Demo2026"
AXE = (pathlib.Path(__file__).resolve().parent.parent / "node_modules/axe-core/axe.min.js").read_text()
THEME = os.environ.get("THEME", "dark")  # dark is the default theme; THEME=light audits the light theme
# (account, path, optional selector to click through to a detail page)
PAGES = [(None, "/", None), (None, "/login", None), (None, "/forgot-password", None),
 ("admin@aicte.demo", "/aicte", None), ("officer.west@aicte.demo", "/aicte?ay=2025-26", None), ("admin@aicte.demo", "/aicte/institutions", None), ("admin@aicte.demo", "/aicte/institutions", "main table tbody a[href^='/aicte/institutions/']"),
 ("admin@aicte.demo", "/aicte/seat-ledger", None), ("admin@aicte.demo", "/aicte/trust", None), ("admin@aicte.demo", "/aicte/alerts", None), ("admin@aicte.demo", "/aicte/alerts?tab=conflicts", None), ("admin@aicte.demo", "/aicte/regions", None), ("admin@aicte.demo", "/aicte/reports", None),
 ("admin@aicte.demo", "/notifications", None), ("admin@aicte.demo", "/profile", None), ("admin@aicte.demo", "/help", None),
 ("superadmin@nexus.demo", "/admin", None), ("superadmin@nexus.demo", "/admin/users", None), ("superadmin@nexus.demo", "/admin/institutions", None), ("superadmin@nexus.demo", "/admin/config", None), ("superadmin@nexus.demo", "/audit", None),
 ("admin@sahyadri.demo", "/institution?ay=2025-26", None), ("admin@sahyadri.demo", "/institution/students?ay=2024-25", None), ("operator@sahyadri.demo", "/institution/verify", None),
 ("admin@sahyadri.demo", "/institution/upload", None), ("admin@sahyadri.demo", "/institution/submissions", None), ("admin@sahyadri.demo", "/institution/submissions", "main table tbody a[href^='/institution/submissions/']"), ("admin@sahyadri.demo", "/institution/trust", None), ("admin@sahyadri.demo", "/institution/operators", None),
 ("student.multi@nexus.demo", "/student", None), ("student.multi@nexus.demo", "/student/requests", None), ("student.multi@nexus.demo", "/student/consents", None), ("student.multi@nexus.demo", "/student/qr", None),
 ("verifier@meridian.demo", "/verifier", None), ("verifier@meridian.demo", "/verifier/new", None), ("verifier@meridian.demo", "/verifier/check", None), ("verifier@meridian.demo", "/verifier/check?code=EV-AAAA-BBBB-CCCC", None), ("verifier@meridian.demo", "/verifier/history", None)]
total = 0
with sync_playwright() as p:
    b = p.chromium.launch(); ctxs = {}
    for email, path, click in PAGES:
        if email not in ctxs:
            ctxs[email] = b.new_context(viewport={"width": 1440, "height": 900})
            ctxs[email].add_init_script(f"try{{localStorage.setItem('nexus-theme','{THEME}')}}catch(e){{}}")
            pg0 = ctxs[email].new_page()
            if email: pg0.goto(B + "/login"); pg0.fill("#email", email); pg0.fill("#password", PW); pg0.click("button:has-text('Sign in')"); pg0.wait_for_url(lambda u: "/login" not in u)
            pg0.close()
        pg = ctxs[email].new_page(); pg.goto(B + path); pg.wait_for_selector("h1")
        if click: pg.click(click); pg.wait_for_url(lambda u: u != B + path); pg.wait_for_selector("h1")
        pg.wait_for_timeout(2000); label = path + (" (detail)" if click else "")
        pg.evaluate(AXE)
        r = pg.evaluate("axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']},resultTypes:['violations']})")
        v = r["violations"]; total += len(v)
        print(f"{'OK  ' if not v else 'FAIL'} {(email or 'anonymous'):28s} {label:52s} {len(v)} violation type(s)")
        for x in v:
            print(f"      [{x['impact']}] {x['id']}: {x['help']}  ({len(x['nodes'])} node(s))")
            for n in x["nodes"][:2]: print("          ", n["target"][0] if n["target"] else "", "|", (n.get("failureSummary") or "").replace("\n", " ")[:170])
        pg.close()
    b.close()
print(f"TOTAL violation types ({THEME} theme):", total); sys.exit(1 if total else 0)
