import { cleanup, render, screen, act } from "@testing-library/react";
import { Suspense } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { lazyPage, preloadPage, registerPagePreloads } from "@/lib/pagePreload";
import { NavigationPrefetch } from "@/components/NavigationPrefetch";

afterEach(cleanup);
describe("page code preloading", () => {
  it("shares the import between prefetch and rendering", async () => {
    const load = vi.fn(async () => ({ default: () => <h1>Study library</h1> }));
    const Page = lazyPage(load);
    await Page.preload();
    await act(async () => { render(<Suspense fallback={<p>Loading</p>}><Page /></Suspense>); });
    expect(screen.getByRole('heading',{name:'Study library'})).toBeInTheDocument();
    expect(load).toHaveBeenCalledOnce();
  });
  it("retries after a failed prefetch", async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('Offline')).mockResolvedValue({default:()=>null});
    const Page = lazyPage(load);
    await expect(Page.preload()).rejects.toThrow('Offline');
    await expect(Page.preload()).resolves.toHaveProperty('default');
    expect(load).toHaveBeenCalledTimes(2);
  });
  it("matches existing routes and parameterized prefixes", async () => {
    const preload = vi.fn(async()=>undefined);
    registerPagePreloads({'/test-library':{preload},'/test-room/':{preload}});
    await preloadPage('/test-library?q=biology');
    await preloadPage('/test-room/room-1');
    await preloadPage('/unknown-test-page');
    expect(preload).toHaveBeenCalledTimes(2);
  });
  it("prefetches only intended internal destinations", async () => {
    const preload = vi.fn(async()=>undefined);
    registerPagePreloads({'/test-prefetch':{preload}});
    render(<><NavigationPrefetch /><a href="/test-prefetch">Study</a><a href="https://example.com/test-prefetch">External</a></>);
    expect(preload).not.toHaveBeenCalled();
    await act(async()=>screen.getByText('Study').dispatchEvent(new Event('pointerover',{bubbles:true})));
    await act(async()=>screen.getByText('External').dispatchEvent(new Event('pointerover',{bubbles:true})));
    expect(preload).toHaveBeenCalledOnce();
  });
});
