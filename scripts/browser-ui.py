# © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE.
"""Browser tests for the premium UI interactions. App must be running on :3000 with seeded data.
   pip install playwright && playwright install chromium"""
import re, time
from playwright.sync_api import sync_playwright, expect
B = "http://localhost:3000"; PW = "Nexus@Demo2026"; res = []
def ok(n, c, d=""): res.append(bool(c)); print(("PASS " if c else "FAIL ") + n + ("" if c else "  " + str(d)))
def login(pg, email):
    pg.goto(B + "/login"); pg.fill("#email", email); pg.fill("#password", PW); pg.click("button:has-text('Sign in')"); pg.wait_for_url(lambda u: "/login" not in u); pg.wait_for_selector("h1")
with sync_playwright() as p:
    b = p.chromium.launch()
    # ---- floating top bar: accent swatches, theme switch, current page ----
    ctx = b.new_context(viewport={"width": 1440, "height": 900}); pg = ctx.new_page(); login(pg, "admin@sahyadri.demo")
    ok("the top bar carries the role's navigation (no sidebar)", pg.locator("header nav[aria-label=Primary] a").count() == 8 and pg.locator("aside[aria-label=Sidebar]").count() == 0)
    accent = lambda: pg.evaluate("document.documentElement.dataset.accent")
    ok("violet is the default accent", accent() == "violet", accent())
    pg.click("[role=radiogroup][aria-label='Accent colour'] button[aria-label='Teal']"); pg.wait_for_timeout(200)
    ok("choosing a swatch retints the interface (the primary button colour changes)", accent() == "teal" and "167, 243, 228" in pg.evaluate("getComputedStyle(document.querySelector('header button.bg-navy-900')).backgroundImage"), pg.evaluate("getComputedStyle(document.querySelector('header button.bg-navy-900')).backgroundImage")[:120])
    pg.reload(); pg.wait_for_selector("h1"); ok("the accent is remembered after reload", accent() == "teal")
    ok("the chosen swatch is announced as checked", pg.locator("button[role=radio][aria-label='Teal']").get_attribute("aria-checked") == "true")
    pg.click("button[aria-label='Switch to light theme']"); pg.reload(); pg.wait_for_selector("h1")
    ok("the theme choice is remembered after reload", pg.evaluate("document.documentElement.classList.contains('dark')") is False)
    pg.click("button[aria-label='Switch to dark theme']"); pg.click("[role=radiogroup][aria-label='Accent colour'] button[aria-label='Violet']")
    pg.keyboard.press("Control+k"); pg.wait_for_selector("[role=combobox]"); pg.keyboard.type("stud"); pg.keyboard.press("Enter"); pg.wait_for_url("**/institution/students")
    ok("Ctrl K opens search and Enter goes to the page", "/institution/students" in pg.url)
    cur = pg.locator("header nav[aria-label=Primary] a[aria-current=page]")
    ok("exactly one nav item is current: Students (not Overview)", cur.count() == 1 and "Students" in cur.inner_text(), cur.count())
    pg.click("a:has-text('Skip to main content')", force=True) if False else None
    # ---- user menu ----
    pg.click("button:has-text('Account menu')"); pg.wait_for_selector("[role=menuitem]:has-text('Sign out')")
    ok("account menu shows email and role", "admin@sahyadri.demo" in pg.inner_text("[role=menu]") and "Institution Admin" in pg.inner_text("[role=menu]"))
    pg.keyboard.press("Escape"); pg.wait_for_timeout(200); ok("Escape closes the account menu", pg.locator("[role=menu]").count() == 0)
    pg.click("button:has-text('Account menu')"); pg.click("[role=menuitem]:has-text('Sign out')"); pg.wait_for_url("**/login")
    pg.goto(B + "/institution"); ok("signed out: protected page redirects to login", "/login" in pg.url); ctx.close()
    # ---- map tabs + table ----
    ctx = b.new_context(viewport={"width": 1440, "height": 900}); pg = ctx.new_page(); login(pg, "admin@aicte.demo")
    tile = lambda name: pg.locator(f"button:has-text('{name}:')")
    lab = lambda name: tile(name).text_content()
    ok("map starts on admissions", "admissions" in lab("Gujarat"), lab("Gujarat"))
    pg.locator("fieldset label:has-text('APAAR coverage')").click(); pg.wait_for_timeout(250)
    ok("switching the measure to APAAR coverage updates tiles (Gujarat shows a %)", lab("Gujarat").endswith("%"), lab("Gujarat"))
    ok("a state whose only institution has not submitted says so honestly", "no data for this measure" in lab("Maharashtra"), lab("Maharashtra"))
    ok("...and its tile stays interactive", tile("Maharashtra").is_enabled())
    ok("states with no institutions at all stay inert", tile("Ladakh").is_disabled())
    ok("measure selector is a real radio group with one checked option", pg.locator("fieldset input[type=radio]").count() == 3 and pg.locator("fieldset input[type=radio]:checked").count() == 1)
    pg.get_by_role("radio", name="Intake utilisation").focus(); pg.keyboard.press("ArrowRight"); pg.wait_for_timeout(150)
    ok("arrow keys move between measures (native radio keyboard behaviour)", pg.locator("fieldset input[type=radio]:checked").get_attribute("value") == "apaar", pg.locator("fieldset input[type=radio]:checked").get_attribute("value"))
    pg.click("button:has-text('Maharashtra:')"); pg.wait_for_timeout(350); ok("state detail panel shows institutions", "Sahyadri" in pg.inner_text("[aria-live=polite]"))
    rows = lambda: pg.locator("table:has(th button) tbody tr").filter(has_text=re.compile(r"Institute|College|School|Campus|Polytechnic"))
    first = lambda: pg.locator("table:has(th button) tbody tr").first.inner_text()
    ok("institutions table lists flagged institutions first", "Aravalli" in first(), first()[:60])
    hdr = "table:has(th button) thead button:has-text('Intake')"
    pg.click(hdr); pg.wait_for_timeout(200)
    ok("first click on Intake sorts descending: largest first (Gomti, 480)", "Gomti" in first() and pg.locator("th[aria-sort='descending']").count() == 1, first()[:50])
    pg.click(hdr); pg.wait_for_timeout(200)
    ok("second click sorts ascending: smallest first (Konkan, 120)", "Konkan" in first() and pg.locator("th[aria-sort='ascending']").count() == 1, first()[:50])
    pg.fill("input[placeholder^='Search']", "Pune"); pg.wait_for_timeout(200)
    ok("search narrows to one institution (Sahyadri)", pg.locator("table:has(th button) tbody tr").count() == 1 and "Sahyadri" in first())
    pg.fill("input[placeholder^='Search']", "zzzz"); pg.wait_for_timeout(200); ok("no match shows a friendly empty state", pg.locator("text=No institutions match").count() == 1)
    pg.fill("input[placeholder^='Search']", ""); flagged = pg.locator("button[aria-pressed]:has-text('Flagged only')"); n = int(re.search(r"\((\d+)\)", flagged.inner_text()).group(1)); flagged.click(); pg.wait_for_timeout(200)
    ok(f"'Flagged only' filter shows exactly the {n} flagged institutions", pg.locator("table:has(th button) tbody tr").count() == n, pg.locator("table:has(th button) tbody tr").count())
    ctx.close()
    # ---- confirm dialogs ----
    ctx = b.new_context(viewport={"width": 1440, "height": 900}); pg = ctx.new_page(); login(pg, "superadmin@nexus.demo"); pg.goto(B + "/admin/users"); pg.wait_for_selector("h1")
    row = pg.locator("tr", has_text="board@statetech.demo")
    row.locator("button:has-text('Deactivate')").click(); pg.wait_for_selector("[role=alertdialog]")
    ok("deactivate asks for confirmation naming the user", "Credential Verification Cell" in pg.inner_text("[role=alertdialog]"))
    pg.click("[role=alertdialog] button:has-text('Cancel')"); pg.wait_for_timeout(300)
    ok("cancel leaves the account active", "Active" in row.inner_text() and pg.locator("[role=alertdialog]").count() == 0)
    row.locator("button:has-text('Deactivate')").click(); pg.click("[role=alertdialog] button:has-text('Deactivate account')"); pg.wait_for_timeout(1200)
    ok("confirming deactivates the account", "Deactivated" in pg.locator("tr", has_text="board@statetech.demo").inner_text())
    pg.locator("tr", has_text="board@statetech.demo").locator("button:has-text('Reactivate')").click(); pg.wait_for_timeout(1200)
    ok("reactivating restores it", "Active" in pg.locator("tr", has_text="board@statetech.demo").inner_text() and "Deactivated" not in pg.locator("tr", has_text="board@statetech.demo").inner_text()); ctx.close()
    # ---- skeleton while a route loads ----
    ctx = b.new_context(viewport={"width": 1440, "height": 900}); pg = ctx.new_page(); login(pg, "admin@sahyadri.demo")
    pg.wait_for_load_state("networkidle"); pg.wait_for_timeout(1200)   # let Next finish prefetching the sidebar links first
    def slow(route):   # delay only the real navigation request, never the background prefetches
        r = route.request
        if "_rsc=" in r.url and "next-router-prefetch" not in r.headers: time.sleep(1.8)
        route.continue_()
    pg.route("**/*", slow); pg.click("header nav[aria-label=Primary] a[href='/institution/students']")
    try: pg.wait_for_selector("[role=status][aria-label='Loading page']", timeout=1200); shown = True
    except Exception: shown = False
    ok("a skeleton is shown while the next page loads", shown); pg.wait_for_url("**/institution/students", timeout=8000); pg.wait_for_selector("h1:has-text('Students')")
    ok("skeleton is replaced by the real page", pg.locator("[role=status][aria-label='Loading page']").count() == 0); pg.unroute("**/*"); ctx.close()
    # ---- mobile drawer ----
    ctx = b.new_context(viewport={"width": 390, "height": 844}); pg = ctx.new_page(); login(pg, "admin@sahyadri.demo")
    ok("the desktop navigation is hidden on mobile", not pg.locator("header nav[aria-label=Primary]").is_visible())
    pg.click("button[aria-label='Open navigation']"); pg.wait_for_selector("[role=dialog] nav[aria-label=Primary]")
    links = [a.strip() for a in pg.locator("[role=dialog] nav a").all_inner_texts()]
    ok("mobile drawer lists the institution admin's 8 links, including the Upload centre", len(links) == 8 and "Upload centre" in links and "Trust score" in links, links)
    pg.click("[role=dialog] nav a[href='/institution/students']"); pg.wait_for_url("**/institution/students"); pg.wait_for_timeout(300)
    ok("choosing a link navigates and closes the drawer", pg.locator("[role=dialog]").count() == 0)
    ok("no horizontal overflow on the mobile students table page", pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")); ctx.close()
    # ---- reduced motion ----
    ctx = b.new_context(viewport={"width": 1440, "height": 900}, reduced_motion="reduce"); pg = ctx.new_page(); login(pg, "admin@aicte.demo"); pg.wait_for_timeout(300)
    names = pg.evaluate("[...document.querySelectorAll('.fade-up,.bar-grow')].map(e=>getComputedStyle(e).animationName)")
    ok("prefers-reduced-motion disables load animations", len(names) > 0 and all(n == "none" for n in names), set(names)); ctx.close()
    # ---- keyboard: skip link ----
    ctx = b.new_context(viewport={"width": 1440, "height": 900}); pg = ctx.new_page(); login(pg, "student@nexus.demo")
    pg.keyboard.press("Tab"); pg.wait_for_timeout(150)
    ok("first Tab stop is the 'Skip to main content' link and it becomes visible", pg.evaluate("document.activeElement.textContent.trim()") == "Skip to main content" and pg.evaluate("document.activeElement.getBoundingClientRect().width") > 20)
    pg.keyboard.press("Enter"); pg.wait_for_timeout(150); ok("activating it moves focus to the main region", pg.evaluate("document.activeElement.id") == "main"); ctx.close()
    b.close()
print(sum(res), "passed", len(res) - sum(res), "failed")
