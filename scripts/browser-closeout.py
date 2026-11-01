# © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE.
from playwright.sync_api import sync_playwright
B="http://localhost:3000"; res=[]
def ok(n,c,d=""): res.append(c); print(("PASS " if c else "FAIL ")+n+("" if c else "  "+str(d)))
ROLES=[("superadmin@nexus.demo","Super Admin"),("admin@aicte.demo","AICTE Admin"),("officer.west@aicte.demo","Regional Officer"),("admin@sahyadri.demo","Institution Admin"),("operator@sahyadri.demo","Data Entry Operator"),("student@nexus.demo","Student"),("verifier@meridian.demo","Verifier")]
with sync_playwright() as p:
    b=p.chromium.launch()
    errs=[]
    for email,label in ROLES:
        ctx=b.new_context(viewport={"width":1440,"height":900}); pg=ctx.new_page()
        pg.on("console",lambda m,l=label: errs.append((l,m.text)) if m.type=="error" else None)
        pg.on("pageerror",lambda e,l=label: errs.append((l,str(e))))
        pg.goto(B+"/login"); pg.fill("#email",email); pg.fill("#password","Nexus@Demo2026"); pg.click("button:has-text('Sign in')")
        pg.wait_for_url(lambda u: "/login" not in u); pg.wait_for_selector("h1"); pg.wait_for_timeout(600)
        links=pg.eval_on_selector_all("header nav[aria-label=Primary] a","els=>els.map(e=>[e.textContent.trim(),e.getAttribute('href')])")
        good=True; bad=[]
        for text,href in links:
            pg.click(f"header nav[aria-label=Primary] a[href='{href}']"); pg.wait_for_url("**"+href); pg.wait_for_selector("h1"); pg.wait_for_timeout(250)
            h=pg.inner_text("h1") if pg.query_selector("h1") else ""
            if not pg.url.endswith(href) or not h or "isn’t available" in h or "Application error" in pg.content(): good=False; bad.append((href,pg.url,h))
        ok(f"{label}: clicked all {len(links)} sidebar link(s), each loaded its page", good and len(links)>0, bad)
        ctx.close()
    # charts
    ctx=b.new_context(viewport={"width":1440,"height":900}); pg=ctx.new_page()
    pg.goto(B+"/login"); pg.fill("#email",""+"admin@aicte.demo"); pg.fill("#password","Nexus@Demo2026"); pg.click("button:has-text('Sign in')"); pg.wait_for_url("**/aicte"); pg.wait_for_timeout(1800)
    surf=pg.locator("main figure .recharts-wrapper").count()
    ok("Command Centre draws 4 charts", surf==4, surf)
    ok("trend chart has stacked bars and an intake line", pg.locator(".recharts-bar-rectangle").count()>10 and pg.locator(".recharts-line-curve").count()>=2)
    ok("over-intake bar is drawn in red", pg.locator("path[fill='#e5483b'], rect[fill='#e5483b']").count()>=1)
    pg.screenshot(path="/tmp/shots/charts_command.png",full_page=True)
    pg.click("a:has-text('2025-26')"); pg.wait_for_url("**ay=2025-26"); pg.wait_for_timeout(1500)
    ok("charts redraw for another year", pg.locator("main figure .recharts-wrapper").count()==4)
    ctx.close()
    ctx=b.new_context(viewport={"width":1440,"height":900}); pg=ctx.new_page()
    pg.goto(B+"/login"); pg.fill("#email","admin@sahyadri.demo"); pg.fill("#password","Nexus@Demo2026"); pg.click("button:has-text('Sign in')"); pg.wait_for_url("**/institution"); pg.goto(B+"/institution?ay=2025-26"); pg.wait_for_timeout(1800)
    ok("Institution dashboard draws 2 charts (trend, category)", pg.locator("main figure .recharts-wrapper").count()==2, pg.locator("main figure .recharts-wrapper").count())
    pg.screenshot(path="/tmp/shots/charts_institution.png",full_page=True)
    ctx.close()
    # verification page in browser (operator account: the close-out suite's rate-limit test spends the admin account's quota)
    ctx=b.new_context(viewport={"width":1440,"height":900}); pg=ctx.new_page()
    pg.goto(B+"/login"); pg.fill("#email","operator@sahyadri.demo"); pg.fill("#password","Nexus@Demo2026"); pg.click("button:has-text('Sign in')"); pg.wait_for_url("**/institution")
    pg.goto(B+"/institution/verify"); pg.fill("#apaarId","999999999001"); pg.click("button:has-text('Check APAAR ID')"); pg.wait_for_selector("[aria-live=polite] >> text=PENDING")
    ok("verify page shows PENDING for the reserved ID", "Not authoritative" in pg.inner_text("main"))
    pg.fill("#apaarId","12345"); pg.click("button:has-text('Check APAAR ID')"); pg.wait_for_selector("[aria-live=polite] >> text=STRUCTURE_INVALID")
    ok("verify page shows structural rejection", True)
    pg.screenshot(path="/tmp/shots/verify.png")
    ctx.close()
    m=b.new_context(viewport={"width":390,"height":844}); mp=m.new_page(); mp.goto(B+"/login"); mp.fill("#email","admin@aicte.demo"); mp.fill("#password","Nexus@Demo2026"); mp.click("button:has-text('Sign in')"); mp.wait_for_url("**/aicte"); mp.wait_for_timeout(1800)
    over=mp.evaluate("""()=>{const w=window.innerWidth;return [...document.querySelectorAll('main *')].filter(e=>{const r=e.getBoundingClientRect();return r.right>w+1&&r.width>0&&!e.closest('.overflow-x-auto')&&!e.closest('.sr-only')}).slice(0,6).map(e=>e.tagName+'.'+(e.className&&e.className.baseVal!==undefined?e.className.baseVal:String(e.className)).slice(0,60)+' right='+Math.round(e.getBoundingClientRect().right))}""")
    ok("mobile Command Centre has no horizontal overflow with charts", mp.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), over)
    mp.screenshot(path="/tmp/shots/mobile_charts.png",full_page=True)
    ok("no console or page errors in any session", len(errs)==0, errs[:3])
    b.close()
print(sum(res),"passed",len(res)-sum(res),"failed")
