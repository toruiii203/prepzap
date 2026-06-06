import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

// ─── PNG mockup images (put these in src/pages/assets/) ───────────────────────
import Screen1Img from './assets/screen1.png'   // Wolf Welcome
import Screen2Img from './assets/screen2.png'   // Tools
import Screen3Img from './assets/screen3.png'   // Owl Visual
import Screen4Img from './assets/screen4.png'   // Bunny Focus
import Screen5Img from './assets/screen5.png'   // Deer Step1 Study
import Screen6Img from './assets/screen6.png'   // Deer Step2 Goal
import Screen7Img from './assets/screen7.png'   // Deer Step3 Learn
import Screen8Img from './assets/screen8.png'   // Sign Up
import Screen9Img from './assets/screen9.png'   // Name Input
import Screen10Img from './assets/screen10.png' // Bear Avatar

const SCREENS = [
  Screen1Img, Screen2Img, Screen3Img, Screen4Img,
  Screen5Img, Screen6Img, Screen7Img, Screen8Img,
  Screen9Img, Screen10Img,
]

// ─── Pagination dots ───────────────────────────────────────────────────────────
function Dots({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
      {SCREENS.map((_, i) => (
        <div key={i} style={{
          width: i === current ? 20 : 7,
          height: 7,
          borderRadius: 99,
          background: i === current ? '#fff' : 'rgba(255,255,255,0.35)',
          transition: 'all 0.3s ease',
        }} />
      ))}
    </div>
  )
}

// ─── Step screen (screens 4/5/6) ──────────────────────────────────────────────
function StepScreen({
  current, onBack, onNext, onSkip, options, selected, onToggle
}: {
  current: number
  onBack: () => void
  onNext: () => void
  onSkip: () => void
  options: string[]
  selected: string[]
  onToggle: (v: string) => void
}) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
      {/* chip grid — floats over lower half of the mockup */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 10,
        justifyContent: 'space-between',
        padding: '0 16px', marginBottom: 8,
      }}>
        {options.map((opt) => {
          const active = selected.includes(opt)
          return (
            <button
              key={opt}
              onClick={() => onToggle(opt)}
              style={{
                width: '47%',
                background: active ? 'white' : 'rgba(255,255,255,0.92)',
                borderRadius: 99,
                padding: '11px 10px',
                display: 'flex', alignItems: 'center', gap: 8,
                border: active ? '2px solid #1e2a4a' : '2px solid transparent',
                boxShadow: active ? '0 4px 12px rgba(30,42,74,0.15)' : 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: 700,
                color: '#1e2a4a',
                fontSize: 13,
                transition: 'all 0.15s ease',
                transform: active ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: 11,
                background: active ? '#3b5bdb' : '#e5e7eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {active && <span style={{ color: 'white', fontSize: 11, fontWeight: 900 }}>✓</span>}
              </div>
              {opt}
            </button>
          )
        })}
      </div>

      {/* bottom bar */}
      <div style={{ padding: '16px 16px 26px' }}>
        <Dots current={current} />
        <div style={{ display: 'flex', flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <button onClick={onNext} style={{
            flex: 1, background: '#1e2a4a', borderRadius: 99,
            padding: 14, border: 'none', color: 'white',
            fontWeight: 800, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit',
          }}>Next</button>
          <button onClick={onSkip} style={{
            flex: 1,
            background: 'rgba(255,255,255,0.2)',
            border: '2px solid rgba(255,255,255,0.4)',
            borderRadius: 99, padding: 14,
            color: 'white', fontWeight: 700, fontSize: 14,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>Skip for now</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function OnboardingFlow() {
  const navigate = useNavigate()
  const { user, refreshProfile } = useAuth()

  const [screen, setScreen] = useState(0)
  const [subjects, setSubjects] = useState<string[]>([])
  const [goals, setGoals] = useState<string[]>([])
  const [learnStyles, setLearnStyles] = useState<string[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [avatarOpts, setAvatarOpts] = useState<Record<string, string>>({
    Outfit: 'Default', Color: 'Purple', Eyes: 'Default',
    'Eye Color': 'Brown', 'Hair Style': 'Short',
    'Hair Color': 'Black', Skin: 'Medium',
  })

  // slide transition
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('left')
  const [animating, setAnimating] = useState(false)
  const [displayScreen, setDisplayScreen] = useState(0)

  const goTo = (next: number) => {
    if (animating) return
    setSlideDir(next > screen ? 'left' : 'right')
    setAnimating(true)
    setTimeout(() => {
      setScreen(next)
      setDisplayScreen(next)
      setAnimating(false)
    }, 280)
  }

  const goNext = () => { if (screen < 9) goTo(screen + 1) }
  const goBack = () => { if (screen > 0) goTo(screen - 1) }
  const skip = () => goTo(7)

  const toggleChip = (arr: string[], setArr: React.Dispatch<React.SetStateAction<string[]>>, val: string) => {
    setArr(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val])
  }

  // Auth
  const handleSignUp = async () => {
    if (!email || !password) { setAuthError('Please enter email and password.'); return }
    setAuthLoading(true); setAuthError('')
    try {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      goTo(8)
    } catch (e: any) {
      setAuthError(e.message || 'Sign up failed.')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogin = async () => {
    if (!email || !password) { setAuthError('Please enter email and password.'); return }
    setAuthLoading(true); setAuthError('')
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      goTo(8)
    } catch (e: any) {
      setAuthError(e.message || 'Login failed.')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleGoogleOAuth = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/onboarding` }
    })
  }

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    try {
      const uid = user?.id
      if (uid) {
        await supabase.from('profiles').upsert({
          id: uid,
          full_name: name.trim(),
          subjects,
          goals,
          learning_styles: learnStyles,
          avatar_options: avatarOpts,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        await refreshProfile()
      }
      navigate('/dashboard')
    } catch {
      alert('Could not save profile.')
    } finally {
      setSavingProfile(false)
    }
  }

  // ─── Overlays ──────────────────────────────────────────────────────────────
  const renderOverlay = () => {
    switch (screen) {

      // Screen 0 – Welcome
      case 0:
        return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
            <div style={{
              background: 'white', borderTopLeftRadius: 36, borderTopRightRadius: 36,
              padding: '28px 28px 36px', display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}>
              <p style={{ fontSize: 24, fontWeight: 900, color: '#1e2a4a', textAlign: 'center', lineHeight: '30px', marginBottom: 8, margin: '0 0 8px' }}>
                Your Learning Journey{'\n'}Starts Here
              </p>
              <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 22, margin: '0 0 22px' }}>Tools that think with you</p>
              <button onClick={() => goTo(1)} style={{
                background: '#1e2a4a', borderRadius: 99,
                padding: '14px 44px', border: 'none',
                color: 'white', fontWeight: 800, fontSize: 16,
                cursor: 'pointer', fontFamily: 'inherit', marginBottom: 18,
              }}>Get Started</button>
              <Dots current={0} />
            </div>
          </div>
        )

      // Screen 1 – Tools
      case 1:
        return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
            <div style={{ padding: '20px 20px 32px' }}>
              <Dots current={1} />
              <p style={{ fontSize: 25, fontWeight: 900, color: '#1e2a4a', margin: '10px 0 4px' }}>Smart Tools, One Place</p>
              <p style={{ fontSize: 14, color: '#1e2a4a', opacity: 0.7, margin: '0 0 16px' }}>Built for every type of learner</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={goNext} style={{ flex: 1, background: '#1e2a4a', borderRadius: 99, padding: 14, border: 'none', color: 'white', fontWeight: 800, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit' }}>Next</button>
                <button onClick={skip} style={{ flex: 1, background: 'white', borderRadius: 99, padding: 14, border: 'none', color: '#1e2a4a', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Skip for now</button>
              </div>
            </div>
          </div>
        )

      // Screen 2 – Visual Learner
      case 2:
        return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
            <div style={{ padding: '22px 22px 30px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Dots current={2} />
              <p style={{ fontSize: 28, fontWeight: 900, color: '#1e2a4a', textAlign: 'center', margin: '10px 0 6px' }}>See It, Learn It, Own It</p>
              <p style={{ fontSize: 14, color: '#1e2a4a', opacity: 0.65, margin: '0 0 18px', textAlign: 'center' }}>Visual tools that make ideas click</p>
              <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                <button onClick={goNext} style={{ flex: 2, background: '#1e2a4a', borderRadius: 99, padding: 14, border: 'none', color: 'white', fontWeight: 800, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit' }}>Next</button>
                <button onClick={skip} style={{ flex: 1, border: '2px solid #1e2a4a', borderRadius: 99, padding: 14, background: 'transparent', color: '#1e2a4a', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Skip</button>
              </div>
            </div>
          </div>
        )

      // Screen 3 – Focus
      case 3:
        return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
            <div style={{ padding: '18px 18px 28px' }}>
              <Dots current={3} />
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button onClick={goNext} style={{ flex: 1, background: '#1e2a4a', borderRadius: 99, padding: 14, border: 'none', color: 'white', fontWeight: 800, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit' }}>Next</button>
                <button onClick={skip} style={{ flex: 1, border: '2px solid #1e2a4a', borderRadius: 99, padding: 14, background: 'transparent', color: '#1e2a4a', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Skip for now</button>
              </div>
            </div>
          </div>
        )

      // Screen 4 – Subjects
      case 4:
        return (
          <StepScreen
            current={4} onBack={goBack} onNext={goNext} onSkip={skip}
            options={['Mathematics', 'Science', 'English', 'History', 'Programming', 'Arts']}
            selected={subjects}
            onToggle={(v) => toggleChip(subjects, setSubjects, v)}
          />
        )

      // Screen 5 – Goals
      case 5:
        return (
          <StepScreen
            current={5} onBack={goBack} onNext={goNext} onSkip={skip}
            options={['Pass Exams', 'Improve Grades', 'Study Faster', 'Build Habits', 'Prepare for College', 'Learn a Skill']}
            selected={goals}
            onToggle={(v) => toggleChip(goals, setGoals, v)}
          />
        )

      // Screen 6 – Learning Style
      case 6:
        return (
          <StepScreen
            current={6} onBack={goBack} onNext={() => goTo(7)} onSkip={skip}
            options={['Visual Scenes', 'Practice Tests', 'Flashcards', 'Reading', 'Listening', 'Mixed']}
            selected={learnStyles}
            onToggle={(v) => toggleChip(learnStyles, setLearnStyles, v)}
          />
        )

      // Screen 7 – Sign Up
      case 7:
        return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: 20, height: '100%' }}>
            <div style={{ background: 'white', borderRadius: 24, margin: '0 14px 14px', padding: 20 }}>
              <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, margin: '0 0 10px' }}>or</p>
              <div style={{ display: 'flex', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
                <button onClick={handleGoogleOAuth} style={{ flex: 1, padding: 12, background: 'transparent', border: 'none', fontWeight: 800, fontSize: 13, color: '#1e2a4a', cursor: 'pointer', fontFamily: 'inherit' }}>G  Google</button>
                <div style={{ width: 1, background: '#e5e7eb' }} />
                <button style={{ flex: 1, padding: 12, background: 'transparent', border: 'none', fontWeight: 800, fontSize: 13, color: '#1877f2', cursor: 'pointer', fontFamily: 'inherit' }}>f  Facebook</button>
              </div>
              <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: 2 }}>
                <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
                  style={{ width: '100%', padding: '12px 4px', fontSize: 15, color: '#1e2a4a', border: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: 2 }}>
                <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
                  style={{ width: '100%', padding: '12px 4px', fontSize: 15, color: '#1e2a4a', border: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              {authError && <p style={{ color: '#ef4444', fontSize: 12, margin: '6px 0' }}>{authError}</p>}
              <button onClick={handleSignUp} disabled={authLoading} style={{
                width: '100%', background: '#1e2a4a', borderRadius: 99, padding: 15,
                border: 'none', color: 'white', fontWeight: 800, fontSize: 16,
                cursor: authLoading ? 'not-allowed' : 'pointer', opacity: authLoading ? 0.6 : 1,
                margin: '12px 0 10px', fontFamily: 'inherit',
              }}>{authLoading ? 'Creating account...' : 'Create Free Account'}</button>
              <button onClick={handleLogin} style={{ width: '100%', background: 'transparent', border: 'none', textAlign: 'center', color: '#6b7280', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                Already have an account? <strong>Login</strong>
              </button>
            </div>
            <Dots current={7} />
          </div>
        )

      // Screen 8 – Name Input
      case 8:
        return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 14px', paddingTop: '35%', height: '100%' }}>
            <div style={{ background: 'white', borderRadius: 24, padding: 24 }}>
              <p style={{ fontWeight: 800, fontSize: 15, color: '#1e2a4a', margin: '0 0 10px' }}>Enter your name</p>
              <input
                type="text" placeholder="Enter your name" value={name} onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && goNext()}
                autoFocus
                style={{
                  width: '100%', border: '2px solid #e5e7eb', borderRadius: 99,
                  padding: '12px 18px', fontSize: 15, color: '#1e2a4a',
                  outline: 'none', marginBottom: 14, fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
              <button onClick={goNext} style={{
                width: '100%', background: '#1e2a4a', borderRadius: 99, padding: 15,
                border: 'none', color: 'white', fontWeight: 800, fontSize: 16,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>Let's Go</button>
            </div>
            <div style={{ marginTop: 12 }}><Dots current={8} /></div>
          </div>
        )

      // Screen 9 – Avatar
      case 9: {
        const avatarCategories: Record<string, string[]> = {
          Outfit: ['Default', 'Casual', 'Formal', 'Sport', 'Hoodie'],
          Color: ['Purple', 'Red', 'Yellow', 'Teal', 'Blue'],
          Eyes: ['Default', 'Round', 'Sleepy', 'Star'],
          'Eye Color': ['Brown', 'Blue', 'Green', 'Hazel'],
          'Hair Style': ['Short', 'Long', 'Curly', 'Bun'],
          'Hair Color': ['Black', 'Brown', 'Blonde', 'Red'],
          Skin: ['Light', 'Medium', 'Tan', 'Dark'],
        }
        return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: 16, height: '100%' }}>
            <div style={{
              background: 'rgba(0,0,0,0.25)', borderRadius: 20,
              margin: '0 12px', padding: 12, maxHeight: '52vh', overflowY: 'auto',
            }}>
              {Object.entries(avatarCategories).map(([cat, opts]) => (
                <div key={cat} style={{
                  display: 'flex', alignItems: 'center',
                  background: 'rgba(255,255,255,0.1)', borderRadius: 14,
                  padding: 10, marginBottom: 7,
                }}>
                  <span style={{ color: 'white', fontWeight: 800, fontSize: 12, width: 72, flexShrink: 0 }}>{cat}</span>
                  <div style={{ display: 'flex', gap: 6, overflowX: 'auto', flexGrow: 1 }}>
                    {opts.map(o => (
                      <button key={o}
                        onClick={() => setAvatarOpts(prev => ({ ...prev, [cat]: o }))}
                        style={{
                          padding: '5px 10px', borderRadius: 99, border: 'none',
                          background: avatarOpts[cat] === o ? 'white' : 'rgba(255,255,255,0.2)',
                          color: avatarOpts[cat] === o ? '#7c3aed' : 'white',
                          fontSize: 11, fontWeight: 700, cursor: 'pointer',
                          fontFamily: 'inherit', flexShrink: 0,
                          transition: 'all 0.15s',
                        }}
                      >{o}</button>
                    ))}
                  </div>
                </div>
              ))}
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                style={{
                  width: '100%', background: 'white', borderRadius: 99, padding: 15,
                  border: 'none', color: '#7c3aed', fontWeight: 900, fontSize: 16,
                  cursor: savingProfile ? 'not-allowed' : 'pointer',
                  opacity: savingProfile ? 0.6 : 1,
                  marginTop: 10, fontFamily: 'inherit',
                }}
              >{savingProfile ? 'Saving...' : 'Save and Continue'}</button>
            </div>
            <div style={{ marginTop: 8 }}><Dots current={9} /></div>
          </div>
        )
      }

      default: return null
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden' }}>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(-40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .screen-slide-left  { animation: slideInLeft  0.28s ease forwards; }
        .screen-slide-right { animation: slideInRight 0.28s ease forwards; }
        input, button { -webkit-tap-highlight-color: transparent; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      <div
        key={screen}
        className={slideDir === 'left' ? 'screen-slide-left' : 'screen-slide-right'}
        style={{
          width: '100%', height: '100%',
          backgroundImage: `url(${SCREENS[screen]})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {renderOverlay()}
      </div>
    </div>
  )
}
