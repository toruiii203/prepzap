import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useState } from "react";
import { LegacyDialogAccessibility } from "@/components/LegacyDialogAccessibility";
function LegacyExample() {
  const [open,setOpen] = useState(false);
  return <><LegacyDialogAccessibility /><button onClick={()=>setOpen(true)}>Open details</button>{open && <div className="fixed inset-0 bg-black/60"><div className="rounded-xl"><h2>Study details</h2><button onClick={()=>setOpen(false)}>Close</button><button>Another action</button></div></div>}</>;
}
afterEach(cleanup);
describe("legacy modal enhancement",()=>{
  it("names a dialog, traps Tab, closes on Escape and restores focus",async()=>{
    render(<LegacyExample />);
    const opener=screen.getByRole('button',{name:'Open details'});
    opener.focus();fireEvent.click(opener);
    const dialog=await screen.findByRole('dialog',{name:'Study details'});
    expect(dialog).toHaveAttribute('aria-modal','true');
    expect(screen.getByRole('button',{name:'Close dialog'})).toHaveFocus();
    const last=screen.getByRole('button',{name:'Another action'});
    last.focus();fireEvent.keyDown(last,{key:'Tab'});
    expect(screen.getByRole('button',{name:'Close dialog'})).toHaveFocus();
    fireEvent.keyDown(dialog,{key:'Escape'});
    await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
    expect(opener).toHaveFocus();
  });
  it("leaves framework-owned dialogs alone",async()=>{
    const {container}=render(<><LegacyDialogAccessibility /><div role="dialog" aria-label="Existing dialog"><div className="fixed inset-0 bg-black/60"><div className="rounded-xl"><button>Existing action</button></div></div></div></>);
    await act(async()=>{});
    expect(container.querySelectorAll('[role="dialog"]')).toHaveLength(1);
  });
});
