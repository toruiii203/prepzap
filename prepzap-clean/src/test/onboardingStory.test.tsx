import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OnboardingStory } from "../../design/study-studio/OnboardingStory";
import { bigMovements, goalStories, reactionSequence, signatureFor, subjectNames, subjectStories, customStory } from "../../design/study-studio/storyPlan";
import { SeedlingArtwork } from "@/components/mascot/SeedlingArtwork";
import { renderToStaticMarkup } from "react-dom/server";
import { Mascot } from "@/components/Mascot";
import { nextTapMovement } from "@/lib/mascotMovement";
const preference = vi.hoisted(() => ({ reduced: false }));
vi.mock("@/hooks/usePrefersReducedMotion",()=>({usePrefersReducedMotion:()=>preference.reduced}));
vi.mock("@/lib/soundFX",()=>({playPop:vi.fn(),playTap:vi.fn()}));
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks();preference.reduced=false;});
describe("onboarding story presentation",()=>{
 it("follows all eight slides with a prop-free companion and immediate answer feedback",()=>{
  const {container}=render(<OnboardingStory dark={false} still onAuth={()=>{}}/>);
  const scene=()=>container.querySelector('.story-root')?.getAttribute('data-scene');
  expect(scene()).toBe('subject');expect(container.querySelector('[data-layer=scribe-props]')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Math'}));fireEvent.click(screen.getByRole('button',{name:/Let's go/}));expect(scene()).toBe('response');
  fireEvent.click(screen.getByRole('button',{name:'Continue'}));expect(scene()).toBe('goal');
  expect(screen.getByRole('button',{name:'Continue'})).toBeDisabled();fireEvent.click(screen.getByRole('button',{name:'Catch up on class'}));fireEvent.click(screen.getByRole('button',{name:'Continue'}));expect(scene()).toBe('goal-response');
  expect(screen.getByRole('heading',{name:'Catching up works.'})).toBeInTheDocument();expect(screen.getByText("We'll go at your pace.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Try a question'}));expect(scene()).toBe('question');expect(screen.getByRole('button',{name:/Check answer/})).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:'36'}));fireEvent.click(screen.getByRole('button',{name:/Check answer/}));expect(scene()).toBe('feedback');expect(screen.getByRole('heading',{name:"Good try. Here's the trick."})).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Keep going'}));expect(scene()).toBe('save');fireEvent.click(screen.getByRole('button',{name:'Not now'}));expect(scene()).toBe('arrival');
  expect(container.textContent).not.toMatch(/XP|1.day streak|mastery/);
 });
 it("lets students skip optional goals and restores the exact path without replaying celebrations",()=>{
  const {container}=render(<OnboardingStory dark={false} still onAuth={()=>{}}/>);
  fireEvent.click(screen.getByRole('button',{name:'Science'}));fireEvent.click(screen.getByRole('button',{name:/Let's go/}));fireEvent.click(screen.getByRole('button',{name:'Continue'}));
  fireEvent.click(screen.getByRole('button',{name:'Skip for now'}));expect(container.querySelector('.story-root')).toHaveAttribute('data-scene','question');fireEvent.click(screen.getByRole('button',{name:'Go back'}));expect(container.querySelector('.story-root')).toHaveAttribute('data-scene','goal');
  fireEvent.click(screen.getByRole('button',{name:'Go back'}));expect(container.querySelector('.story-root')).toHaveAttribute('data-scene','response');expect(container.querySelector('.story-root')).toHaveAttribute('data-signature','quiet');
 });
 it.each(goalStories)("keeps the exact $label reaction copy",goal=>{
  render(<OnboardingStory dark={false} still onAuth={()=>{}}/>);
  fireEvent.click(screen.getByRole('button',{name:'Math'}));fireEvent.click(screen.getByRole('button',{name:/Let's go/}));fireEvent.click(screen.getByRole('button',{name:'Continue'}));
  fireEvent.click(screen.getByRole('button',{name:goal.label}));fireEvent.click(screen.getByRole('button',{name:'Continue'}));expect(screen.getByRole('heading',{name:goal.headline})).toBeInTheDocument();if(goal.support)expect(screen.getByText(goal.support)).toBeInTheDocument();
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
 it("keeps the standalone SVG compact and entirely free of writing props",()=>{
  const svg=renderToStaticMarkup(<SeedlingArtwork mood="idle" blink={false} reduced/>);expect(svg.length).toBeLessThan(8000);expect(svg).not.toMatch(/scribe|pencil|notebook/);
 });
 it("pauses opt-in gesture completion while hidden and calls completion once",()=>{
  vi.useFakeTimers();let hidden=false;vi.spyOn(document,'hidden','get').mockImplementation(()=>hidden);const done=vi.fn();const {container,unmount}=render(<Mascot mood="thinking" movement="spin" pauseWhenHidden onMovementComplete={done}/>);
  act(()=>vi.advanceTimersByTime(300));hidden=true;fireEvent(document,new Event('visibilitychange'));act(()=>vi.advanceTimersByTime(5000));expect(done).not.toHaveBeenCalled();expect(container.querySelector('.mascot')).toHaveAttribute('data-paused','true');
  hidden=false;fireEvent(document,new Event('visibilitychange'));act(()=>vi.advanceTimersByTime(401));expect(done).toHaveBeenCalledOnce();expect(container.querySelector('svg')).toHaveAttribute('data-movement','rest');unmount();expect(vi.getTimerCount()).toBe(0);
 });
});
