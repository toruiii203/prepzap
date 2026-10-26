import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InterfaceSettings } from "@/components/InterfaceSettings";
import { InterfacePreferences } from "@/components/InterfacePreferences";
import { readInterfacePreferences, saveInterfacePreferences } from "@/lib/interfacePreferences";
import { setSoundEnabled, triggerHaptic, isSoundEnabled } from "@/lib/soundFX";
const originalMedia = window.matchMedia;
afterEach(() => { cleanup(); localStorage.clear(); setSoundEnabled(true); window.matchMedia = originalMedia; document.documentElement.classList.remove('dark'); vi.restoreAllMocks(); });
describe("local interface preferences", () => {
  it("requires opt-in for vibration and preserves other local settings", () => {
    localStorage.clear();
    expect(readInterfacePreferences()).toEqual({theme:'light',sound:true,vibration:false});
    saveInterfacePreferences({theme:'dark',vibration:true});
    saveInterfacePreferences({sound:false});
    expect(readInterfacePreferences()).toEqual({theme:'dark',sound:false,vibration:true});
  });
  it("applies semantic dark mode and responds to the appearance control", () => {
    localStorage.clear();
    render(<><InterfacePreferences /><InterfaceSettings /></>);
    fireEvent.change(screen.getByRole('combobox',{name:'Appearance'}),{target:{value:'dark'}});
    expect(document.documentElement).toHaveClass('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    fireEvent.change(screen.getByRole('combobox',{name:'Appearance'}),{target:{value:'light'}});
    expect(document.documentElement).not.toHaveClass('dark');
  });
  it("keeps the original light palette unless device-following is selected", () => {
    localStorage.clear();
    window.matchMedia = query => ({...originalMedia(query),matches:true});
    render(<><InterfacePreferences /><InterfaceSettings /></>);
    expect(document.documentElement).not.toHaveClass('dark');
    fireEvent.change(screen.getByRole('combobox',{name:'Appearance'}),{target:{value:'system'}});
    expect(document.documentElement).toHaveClass('dark');
  });
  it("exposes independent named sound/vibration switches", () => {
    render(<InterfaceSettings />);
    fireEvent.click(screen.getByRole('switch',{name:'Sound effects'}));
    expect(isSoundEnabled()).toBe(false);
    fireEvent.click(screen.getByRole('switch',{name:'Vibration'}));
    expect(readInterfacePreferences().vibration).toBe(true);
  });
  it("never vibrates without opt-in or under reduced motion", () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator,'vibrate',{value:vibrate,configurable:true});
    localStorage.clear();
    triggerHaptic('success');
    expect(vibrate).not.toHaveBeenCalled();
    saveInterfacePreferences({vibration:true});
    triggerHaptic('success');
    expect(vibrate).toHaveBeenCalledOnce();
    window.matchMedia = query => ({...originalMedia(query),matches:true});
    triggerHaptic('success');
    expect(vibrate).toHaveBeenCalledOnce();
  });
});
