import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OnboardingStory } from "../../design/study-studio/OnboardingStory";
import { bigMovements, reactionSequence, signatureFor, subjectNames, subjectStories, customStory } from "../../design/study-studio/storyPlan";
import { OnboardingScribe } from "../../design/study-studio/OnboardingScribe";
import { SeedlingArtwork } from "@/components/mascot/SeedlingArtwork";
import { renderToStaticMarkup } from "react-dom/server";
import { Mascot } from "@/components/Mascot";
import { nextTapMovement } from "@/lib/mascotMovement";
const preference = vi.hoisted(() => ({ reduced: false }));
vi.mock("@/hooks/usePrefersReducedMotion",()=>({usePrefersReducedMotion:()=>preference.reduced}));
vi.mock("@/lib/soundFX",()=>({playPop:vi.fn(),playTap:vi.fn()}));
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks();preference.reduced=false;});
describe("onboarding story presentation",()=>{
 it("keeps selection hints neutral, supports Quiet, and cleans all scribe timers",()=>{
  vi.useFakeTimers();const {container,unmount}=render(<OnboardingStory dark={false} still={false} onAuth={()=>{}}/>);
  expect(container.querySelector('[data-variant=scribe]')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Math'}));expect(container.querySelector('.seedling-art')).toHaveAttribute('data-scribe-action','quick');
  fireEvent.click(screen.getByRole('button',{name:'Science'}));expect(container.querySelector('.seedling-art')).toHaveAttribute('data-scribe-action','rewrite');
  expect(screen.getByText("I'll note it down.")).toBeInTheDocument();
  fireEvent.change(screen.getByRole('combobox',{name:'Question layout'}),{target:{value:'quiet'}});expect(container.querySelector('[data-variant=scribe]')).toBeNull();
  act(()=>vi.advanceTimersByTime(2000)); // Settle the shared layout projection before checking owned timer cleanup.
  unmount();act(()=>vi.advanceTimersByTime(50)); // Flush the layout library's queued teardown frame; longer scribe timers would remain.
  expect(vi.getTimerCount()).toBe(0);
 });
 it("lifts the pencil before correction, cancels on Back, and never awards progress",()=>{
  vi.useFakeTimers();const {container,unmount}=render(<OnboardingStory dark={false} still={false} onAuth={()=>{}}/>);
  fireEvent.click(screen.getByRole('button',{name:'Math'}));fireEvent.click(screen.getByRole('button',{name:/Let's go/}));
  expect(screen.getByRole('button',{name:/Continue/})).toBeEnabled();fireEvent.click(screen.getByRole('button',{name:/Continue/}));
  expect(screen.queryByText('Noted.')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'36'}));expect(screen.getByText('Noted.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:/Check answer/}));expect(container.querySelector('.seedling-art')).toHaveAttribute('data-scribe-action','lift');
  act(()=>vi.advanceTimersByTime(400));expect(screen.getByRole('heading',{name:"Good try. Here's the trick."})).toBeInTheDocument();expect(screen.getByText('The answer is 42')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:/Keep going/}));fireEvent.click(screen.getByRole('button',{name:'Not now'}));expect(container.querySelector('.story-root')).toHaveAttribute('data-signature','spin');fireEvent.click(screen.getByRole('button',{name:'Go back'}));fireEvent.click(screen.getByRole('button',{name:'Go back'}));
  fireEvent.click(screen.getByRole('button',{name:'Go back'}));fireEvent.click(screen.getByRole('button',{name:'Skip for now'}));fireEvent.click(screen.getByRole('button',{name:'Go back'}));
  act(()=>vi.advanceTimersByTime(500));expect(container.querySelector('.story-root')).toHaveAttribute('data-scene','response');expect(container.querySelector('.story-root')).toHaveAttribute('data-signature','quiet');
  expect(container.textContent).not.toMatch(/XP|1.day streak|mastery/);unmount();act(()=>vi.advanceTimersByTime(50));expect(vi.getTimerCount()).toBe(0);
 });
 it("has static expressions and no confetti in reduced motion",()=>{
  preference.reduced=true;const {container}=render(<OnboardingStory dark={false} still={false} onAuth={()=>{}}/>);fireEvent.click(screen.getByRole('button',{name:'Math'}));fireEvent.click(screen.getByRole('button',{name:/Let's go/}));
  expect(container.querySelector('.mascot')).toHaveAttribute('data-reduced-motion','true');expect(container.querySelector('.story-confetti')).toBeNull();
 });
 it.each(subjectNames)("uses the %s copy and only one non-repeating large signature",name=>{
  const subject=subjectStories[name];expect(subject.headline).toContain(' ');
  const first=reactionSequence('response',subject,'correct');const previous=first.find(item=>bigMovements.includes(item));const next=reactionSequence('feedback',subject,'correct',previous);
  expect(first.filter(item=>bigMovements.includes(item)).length).toBeLessThanOrEqual(1);expect(next.filter(item=>bigMovements.includes(item)).length).toBeLessThanOrEqual(1);
  if(previous)expect(next).not.toContain(previous);expect(subject.options[subject.correct]).toBeTruthy();
 });
 it("uses a neutral custom fallback and preserves the original dashboard tap set",()=>{
  expect(customStory.headline).toBe('That sounds interesting.');expect(signatureFor('twirl-jump','twirl-jump')).toBe('cheer');
  vi.spyOn(Math,'random').mockReturnValue(.999);expect(['wave','curious','hop','cheer','dance']).toContain(nextTapMovement());
 });
 it("glances once after inactivity, keeps the scribe small and cleans its loops",()=>{
  vi.useFakeTimers();const glance=vi.fn();const {container,unmount}=render(<OnboardingScribe input={{id:0,kind:"select"}} selected={false} quiet={false} still={false} visible bubble="Noted." allowGlance onGlance={glance}/>);
  act(()=>vi.advanceTimersByTime(8001));expect(glance).toHaveBeenCalledOnce();act(()=>vi.advanceTimersByTime(61000));expect(glance).toHaveBeenCalledOnce();expect(container.querySelector(".mascot")).toHaveAttribute("data-mood","idle");unmount();expect(vi.getTimerCount()).toBe(0);
  const svg=renderToStaticMarkup(<SeedlingArtwork mood="idle" blink={false} reduced variant="scribe"/>);expect(svg.length).toBeLessThan(8000);expect(svg).toContain('scribe-pencil');
 });
 it("pauses opt-in gesture completion while hidden and calls completion once",()=>{
  vi.useFakeTimers();let hidden=false;vi.spyOn(document,'hidden','get').mockImplementation(()=>hidden);const done=vi.fn();const {container,unmount}=render(<Mascot mood="thinking" movement="spin" pauseWhenHidden onMovementComplete={done}/>);
  act(()=>vi.advanceTimersByTime(300));hidden=true;fireEvent(document,new Event('visibilitychange'));act(()=>vi.advanceTimersByTime(5000));expect(done).not.toHaveBeenCalled();expect(container.querySelector('.mascot')).toHaveAttribute('data-paused','true');
  hidden=false;fireEvent(document,new Event('visibilitychange'));act(()=>vi.advanceTimersByTime(401));expect(done).toHaveBeenCalledOnce();expect(container.querySelector('svg')).toHaveAttribute('data-movement','rest');unmount();expect(vi.getTimerCount()).toBe(0);
 });
});
