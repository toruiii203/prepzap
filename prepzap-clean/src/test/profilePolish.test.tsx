import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EditProfileModal } from "@/components/EditProfileModal";
import { StudyToolsShelf } from "@/components/StudyToolsShelf";
import { PROFILE_PORTRAITS } from "@/lib/profilePortraits";
import type { StudentProfileData } from "@/lib/userProfileStore";
vi.mock("@/lib/soundFX",()=>({playPop:vi.fn(),playTap:vi.fn(),playSuccess:vi.fn()}));
vi.mock("sonner",()=>({toast:{success:vi.fn(),error:vi.fn()}}));
const originalScroll=Object.getOwnPropertyDescriptor(HTMLElement.prototype,"scrollTo");
const reduced=vi.hoisted(()=>({value:false}));vi.mock("@/hooks/usePrefersReducedMotion",()=>({usePrefersReducedMotion:()=>reduced.value}));
const profile:StudentProfileData={displayName:"A Student With A Long Display Name",username:"@student",bio:"My notes",avatar:"/custom-existing.png",isAvatarImage:true,bannerId:"retro_grid",school:"",targetExam:"Final",targetSubject:"Biology",verifiedStudent:false};
afterEach(()=>{cleanup();vi.restoreAllMocks();if(originalScroll)Object.defineProperty(HTMLElement.prototype,"scrollTo",originalScroll);else Reflect.deleteProperty(HTMLElement.prototype,"scrollTo");});beforeEach(()=>{localStorage.clear();reduced.value=false;Object.defineProperty(HTMLElement.prototype,"scrollTo",{configurable:true,value:vi.fn()});});
describe("profile presentation",()=>{
 it("keeps the saved avatar until an explicit portrait selection and Save",()=>{
  const save=vi.fn();render(<EditProfileModal isOpen initialProfile={profile} onSave={save} onClose={()=>{}}/>);
  expect(screen.getByRole('dialog')).toBeInTheDocument();expect(screen.getByAltText('Avatar')).toHaveAttribute('src','/custom-existing.png');expect(screen.queryByLabelText('Verified student')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Orbit'}));expect(save).not.toHaveBeenCalled();expect(screen.getByAltText('Avatar')).toHaveAttribute('src','/avatars/orbit.svg');fireEvent.click(screen.getByRole('button',{name:'Save Profile'}));expect(save).toHaveBeenCalledWith(expect.objectContaining({avatar:'/avatars/orbit.svg',isAvatarImage:true,displayName:profile.displayName,bio:profile.bio,targetSubject:profile.targetSubject}));
 });
 it("supports Escape and keeps upload controls alongside the original portraits",()=>{
  const close=vi.fn();render(<EditProfileModal isOpen initialProfile={profile} onSave={()=>{}} onClose={close}/>);expect(PROFILE_PORTRAITS).toHaveLength(8);fireEvent.click(screen.getByRole('button',{name:'Upload Image'}));expect(screen.getByRole('button',{name:/Choose Photo from Device/})).toBeInTheDocument();fireEvent.keyDown(document,{key:'Escape'});expect(close).toHaveBeenCalled();
 });
});
describe("frameless study tools",()=>{
 it("preserves all sixteen tools and their destinations across four accessible pages",()=>{
  const navigate=vi.fn();const {container}=render(<StudyToolsShelf navigate={navigate}/>);const shelf=screen.getByRole('region',{name:'Study tools'});expect(shelf.className).not.toMatch(/border|shadow|p-5/);expect(container.querySelectorAll('button[tabindex]')).toHaveLength(16);
  fireEvent.click(screen.getByRole('button',{name:/Practice Tests/}));expect(navigate).toHaveBeenCalledWith('/practice');for(let i=0;i<3;i++)fireEvent.click(screen.getByRole('button',{name:'Next tools'}));expect(screen.getByText('4 of 4')).toBeInTheDocument();expect(screen.getByRole('button',{name:'Next tools'})).toBeDisabled();expect(within(shelf).getAllByRole('button').filter(button=>button.tabIndex===0).length).toBeGreaterThanOrEqual(4);
 });
 it("retains the collapse preference without a surrounding card",()=>{
  render(<StudyToolsShelf navigate={vi.fn()}/>);fireEvent.click(screen.getByRole('button',{name:'Next tools'}));fireEvent.click(screen.getByRole('button',{name:'Hide study tools'}));expect(screen.queryByRole('button',{name:/Practice Tests/})).toBeNull();expect(localStorage.getItem('pz_study_tools_collapsed')).toBe('true');fireEvent.click(screen.getByRole('button',{name:'Show study tools'}));expect(screen.getByRole('button',{name:/Practice Tests/})).toBeInTheDocument();expect(screen.getByText('1 of 4')).toBeInTheDocument();
 });
});
