import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import OnboardingFlow from "@/pages/OnboardingFlow";
import { getOnboardingDraft, saveOnboardingDraft } from "@/lib/onboardingBank";
const fixture=vi.hoisted(()=>({
  oauth:vi.fn().mockResolvedValue({error:null}),otp:vi.fn().mockResolvedValue({error:null}),password:vi.fn().mockResolvedValue({data:{session:null},error:null}),navigate:vi.fn(),refresh:vi.fn(),
  auth:{session:null as {user:{id:string}}|null,profile:null as {onboarding_complete:boolean}|null},
}));
vi.mock("@/contexts/AuthContext",()=>({useAuth:()=>({...fixture.auth,refreshProfile:fixture.refresh})}));
vi.mock("@/lib/supabase",()=>({supabase:{auth:{signInWithOAuth:fixture.oauth,signInWithOtp:fixture.otp,signInWithPassword:fixture.password}}}));
vi.mock("react-router-dom",async original=>({...await original<typeof import("react-router-dom")>(),useNavigate:()=>fixture.navigate}));
vi.mock("@capacitor/core",()=>({Capacitor:{isNativePlatform:()=>false}}));
vi.mock("@capacitor/browser",()=>({Browser:{open:vi.fn()}}));
vi.mock("@/hooks/usePrefersReducedMotion",()=>({usePrefersReducedMotion:()=>true}));
vi.mock("@/lib/soundFX",()=>({playPop:vi.fn(),playTap:vi.fn(),playSuccess:vi.fn(),triggerHaptic:vi.fn(),setSoundEnabled:vi.fn(),isSoundEnabled:()=>false}));
beforeEach(()=>{localStorage.clear();fixture.auth.session=null;fixture.auth.profile=null;vi.clearAllMocks();});
afterEach(()=>{cleanup();vi.useRealTimers();});
const mount=()=>render(<MemoryRouter><OnboardingFlow/></MemoryRouter>);
const begin=()=>{fireEvent.click(screen.getByRole('button',{name:'Get started'}));fireEvent.click(screen.getByRole('button',{name:'Science'}));fireEvent.click(screen.getByRole('button',{name:/Let's go/}));fireEvent.click(screen.getByRole('button',{name:'Continue'}));fireEvent.click(screen.getByRole('button',{name:'Catch up on class'}));fireEvent.click(screen.getByRole('button',{name:'Continue'}));fireEvent.click(screen.getByRole('button',{name:'Try a question'}));};
describe('live onboarding presentation boundaries',()=>{
 it('shows Google on welcome and preserves the consent guard and OAuth payload',async()=>{
  mount();expect(screen.getByRole('heading',{name:'Hey, ready to learn something?'})).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Continue with Google'}));const dialog=within(screen.getByRole('dialog'));
  expect(dialog.getByRole('button',{name:'Continue with Google'})).toBeDisabled();expect(fixture.oauth).not.toHaveBeenCalled();
  fireEvent.click(dialog.getByRole('checkbox'));await act(async()=>fireEvent.click(dialog.getByRole('button',{name:'Continue with Google'})));
  expect(fixture.oauth).toHaveBeenCalledWith({provider:'google',options:{redirectTo:`${window.location.origin}/auth/callback`,queryParams:{prompt:'select_account'}}});expect(getOnboardingDraft()?.ageConfirmed).toBe(true);
 });
 it('uses the unchanged shuffled local bank and persists first-win metadata only on Check',()=>{
  mount();begin();expect(screen.getByRole('heading',{name:/Which organelle/})).toBeInTheDocument();expect(screen.queryByRole('button',{name:/skip/i})).toBeNull();expect(screen.queryByText(/one try/i)).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Mitochondria'}));expect(getOnboardingDraft()?.firstWinCompleted).toBe(false);fireEvent.click(screen.getByRole('button',{name:'Check answer'}));
  expect(screen.getByRole('heading',{name:'You got it.'})).toBeInTheDocument();expect(getOnboardingDraft()).toMatchObject({subject:'Science',firstWinCompleted:true});expect(fixture.oauth).not.toHaveBeenCalled();expect(fixture.otp).not.toHaveBeenCalled();
 });
 it('keeps existing-account email-link login and required consent accessible from welcome',async()=>{
  mount();fireEvent.click(screen.getByRole('button',{name:'Already have an account? Log in'}));fireEvent.click(screen.getByRole('button',{name:'Email me a sign-in link instead'}));const dialog=within(screen.getByRole('dialog'));
  fireEvent.change(dialog.getByLabelText('Email address'),{target:{value:'student@example.test'}});expect(dialog.getByRole('button',{name:'Send sign-in link'})).toBeDisabled();fireEvent.click(dialog.getByRole('checkbox'));
  await act(async()=>fireEvent.click(dialog.getByRole('button',{name:'Send sign-in link'})));expect(fixture.otp).toHaveBeenCalledWith({email:'student@example.test',options:{emailRedirectTo:`${window.location.origin}/auth/callback`}});expect(dialog.getByRole('status')).toBeInTheDocument();
 });
 it('offers Google without an email sign-up action on the final save screen',()=>{
  saveOnboardingDraft({firstWinCompleted:true,subject:'Biology'});mount();expect(screen.getByRole('heading',{name:'Keep what you just did.'})).toBeInTheDocument();expect(screen.getByRole('button',{name:'Continue with Google'})).toBeInTheDocument();expect(screen.queryByRole('button',{name:/email/i})).toBeNull();
 });
 it('preserves returning-user redirect and draft cleanup',()=>{
  saveOnboardingDraft({subject:'History'});fixture.auth.session={user:{id:'fixture'}};fixture.auth.profile={onboarding_complete:true};mount();expect(fixture.navigate).toHaveBeenCalledWith('/dashboard',{replace:true});expect(getOnboardingDraft()).toBeNull();
 });
 it('clears the owned answer feedback timer when navigating away',()=>{
  vi.useFakeTimers();const {unmount}=mount();begin();fireEvent.click(screen.getByRole('button',{name:'Mitochondria'}));fireEvent.click(screen.getByRole('button',{name:'Check answer'}));unmount();act(()=>vi.advanceTimersByTime(50));expect(vi.getTimerCount()).toBe(0);
 });
});
