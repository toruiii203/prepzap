from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # 1. Provide an auth token so we are actually authenticated and route to dashboard or tools doesn't redirect
    context = browser.new_context()
    context.add_init_script("""
        window.localStorage.setItem('sb-kujvtdxabndqixcgnpge-auth-token', JSON.stringify({
            access_token: 'fake-token',
            refresh_token: 'fake-token',
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            user: {
                id: 'fake-user-id',
                aud: 'authenticated',
                role: 'authenticated',
                email: 'test@example.com'
            }
        }));
    """)

    page = context.new_page()

    # Disable the auth check in playwright side for CramMode screenshot:
    page.goto('http://localhost:4173/cram')
    page.evaluate("""() => {
        window.localStorage.setItem('pz_banner_dismissed', '1');
    }""")
    page.wait_for_timeout(3000)

    browser.close()
