from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    # Go to login page, set fake session in localStorage, then go to high-yield
    context = browser.new_context()
    page = context.new_page()
    page.goto('http://localhost:8080/login')
    page.evaluate('localStorage.setItem("sb-fakesupabase-auth-token", JSON.stringify({access_token: "fake", user: {id: "123"}}))')
    page.goto('http://localhost:8080/high-yield')
    page.wait_for_load_state('networkidle')
    page.screenshot(path='high-yield-auth.png', full_page=True)

    page.goto('http://localhost:8080/math')
    page.wait_for_load_state('networkidle')
    page.screenshot(path='math-auth.png', full_page=True)

    browser.close()
