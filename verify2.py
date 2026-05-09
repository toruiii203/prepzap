from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto('http://localhost:8080/visual-learner')
    page.wait_for_load_state('networkidle')
    page.screenshot(path='visual-learner-after-fix.png', full_page=True)
    browser.close()
