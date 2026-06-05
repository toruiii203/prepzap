import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ScrollView,
  Image,
  Dimensions,
  Animated,
  Alert,
} from 'react-native';

const { width, height } = Dimensions.get('window');

// --------------------------
// IMPORT YOUR MOCKUP IMAGES
// --------------------------
import Screen1Img from './assets/screen1.png';   // Wolf Welcome
import Screen2Img from './assets/screen2.png';   // Tools
import Screen3Img from './assets/screen3.png';   // Owl Visual
import Screen4Img from './assets/screen4.png';   // Bunny Focus
import Screen5Img from './assets/screen5.png';   // Deer Step1 Study
import Screen6Img from './assets/screen6.png';   // Deer Step2 Goal
import Screen7Img from './assets/screen7.png';   // Deer Step3 Learn
import Screen8Img from './assets/screen8.png';   // Sign Up
import Screen9Img from './assets/screen9.png';   // Name Input
import Screen10Img from './assets/screen10.png'; // Bear Avatar

const SCREENS = [
  Screen1Img, Screen2Img, Screen3Img, Screen4Img,
  Screen5Img, Screen6Img, Screen7Img, Screen8Img,
  Screen9Img, Screen10Img,
];

// --------------------------
// SUPABASE CONFIG
// --------------------------
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

async function supabasePost(path, body) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

// --------------------------
// PAGINATION DOTS
// --------------------------
const Dots = ({ current }) => (
  <View style={styles.dotsRow}>
    {SCREENS.map((_, i) => (
      <View
        key={i}
        style={[
          styles.dot,
          i === current && styles.dotActive,
        ]}
      />
    ))}
  </View>
);

// --------------------------
// MAIN COMPONENT
// --------------------------
export default function OnboardingFlow() {
  const [screen, setScreen] = useState(0);
  const [subjects, setSubjects] = useState([]);
  const [goals, setGoals] = useState([]);
  const [learnStyles, setLearnStyles] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [userId, setUserId] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [avatarOpts, setAvatarOpts] = useState({
    Outfit: 'Default', Color: 'Purple', Eyes: 'Default',
    'Eye Color': 'Brown', 'Hair Style': 'Short',
    'Hair Color': 'Black', Skin: 'Medium',
  });

  // Slide transition
  const slideAnim = useRef(new Animated.Value(0)).current;

  const goTo = (next) => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: next > screen ? -width : width, duration: 0, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
    setScreen(next);
  };

  const goNext = () => { if (screen < 9) goTo(screen + 1); };
  const goBack = () => { if (screen > 0) goTo(screen - 1); };
  const skip = () => goTo(7); // skip to sign up

  const toggleChip = (arr, setArr, val) => {
    setArr(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  };

  // Auth handlers
  const handleSignUp = async () => {
    if (!email || !password) { setAuthError('Please enter email and password.'); return; }
    setAuthLoading(true); setAuthError('');
    try {
      const data = await supabasePost('/auth/v1/signup', { email, password });
      if (data.error) throw new Error(data.error.message);
      setUserId(data.user?.id || 'demo');
      goTo(8);
    } catch (e) {
      setAuthError(e.message || 'Sign up failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) { setAuthError('Please enter email and password.'); return; }
    setAuthLoading(true); setAuthError('');
    try {
      const data = await supabasePost('/auth/v1/token?grant_type=password', { email, password });
      if (data.error) throw new Error(data.error.message);
      setUserId(data.user?.id || 'demo');
      goTo(8);
    } catch (e) {
      setAuthError(e.message || 'Login failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleOAuth = (provider) => {
    Alert.alert('OAuth', `Opens ${provider} login. Wire up your Supabase OAuth redirect URL.`);
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/onboarding_profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          user_id: userId || 'demo',
          display_name: name,
          subjects,
          goals,
          learning_styles: learnStyles,
          avatar_options: avatarOpts,
        }),
      });
      Alert.alert('Done!', 'Profile saved. Redirecting to dashboard...');
    } catch {
      Alert.alert('Error', 'Could not save profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // --------------------------
  // SCREEN OVERLAYS
  // Each screen: JPEG is the background, overlay adds working UI on top
  // --------------------------
  const renderOverlay = () => {
    switch (screen) {

      // ── Screen 0: Welcome ─────────────────────────────────────────────
      case 0:
        return (
          <View style={s0.container}>
            <View style={s0.bottomPanel}>
              <Text style={s0.title}>Your Learning Journey{'\n'}Starts Here</Text>
              <Text style={s0.sub}>Tools that think with you</Text>
              <TouchableOpacity style={s0.btn} onPress={() => goTo(1)}>
                <Text style={s0.btnText}>Get Started</Text>
              </TouchableOpacity>
              <Dots current={0} />
            </View>
          </View>
        );

      // ── Screen 1: Tools ───────────────────────────────────────────────
      case 1:
        return (
          <View style={s1.container}>
            <View style={s1.bottomArea}>
              <Dots current={1} />
              <Text style={s1.title}>Smart Tools, One Place</Text>
              <Text style={s1.sub}>Built for every type of learner</Text>
              <View style={s1.btnRow}>
                <TouchableOpacity style={s1.nextBtn} onPress={goNext}>
                  <Text style={s1.nextTxt}>Next</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s1.skipBtn} onPress={skip}>
                  <Text style={s1.skipTxt}>Skip for now</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );

      // ── Screen 2: Visual Learner ──────────────────────────────────────
      case 2:
        return (
          <View style={s2.container}>
            <View style={s2.bottomArea}>
              <Dots current={2} />
              <Text style={s2.title}>See It, Learn It, Own It</Text>
              <Text style={s2.sub}>Visual tools that make ideas click</Text>
              <View style={s2.btnRow}>
                <TouchableOpacity style={s2.nextBtn} onPress={goNext}>
                  <Text style={s2.nextTxt}>Next</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s2.skipBtn} onPress={skip}>
                  <Text style={s2.skipTxt}>Skip</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );

      // ── Screen 3: Focus ───────────────────────────────────────────────
      case 3:
        return (
          <View style={s3.container}>
            <View style={s3.bottomArea}>
              <Dots current={3} />
              <View style={s3.btnRow}>
                <TouchableOpacity style={s3.nextBtn} onPress={goNext}>
                  <Text style={s3.nextTxt}>Next</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s3.skipBtn} onPress={skip}>
                  <Text style={s3.skipTxt}>Skip for now</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );

      // ── Screen 4: Step 1 – Subjects ───────────────────────────────────
      case 4:
        return (
          <StepScreen
            current={4}
            onBack={goBack}
            onNext={goNext}
            onSkip={skip}
            options={['Mathematics','Science','English','History','Programming','Arts']}
            selected={subjects}
            onToggle={(v) => toggleChip(subjects, setSubjects, v)}
          />
        );

      // ── Screen 5: Step 2 – Goals ──────────────────────────────────────
      case 5:
        return (
          <StepScreen
            current={5}
            onBack={goBack}
            onNext={goNext}
            onSkip={skip}
            options={['Pass Exams','Improve Grades','Study Faster','Build Habits','Prepare for College','Learn a Skill']}
            selected={goals}
            onToggle={(v) => toggleChip(goals, setGoals, v)}
          />
        );

      // ── Screen 6: Step 3 – Learning Style ────────────────────────────
      case 6:
        return (
          <StepScreen
            current={6}
            onBack={goBack}
            onNext={() => goTo(7)}
            onSkip={skip}
            options={['Visual Scenes','Practice Tests','Flashcards','Reading','Listening','Mixed']}
            selected={learnStyles}
            onToggle={(v) => toggleChip(learnStyles, setLearnStyles, v)}
          />
        );

      // ── Screen 7: Sign Up ─────────────────────────────────────────────
      case 7:
        return (
          <View style={s7.container}>
            <View style={s7.card}>
              <Text style={s7.or}>or</Text>
              <View style={s7.oauthRow}>
                <TouchableOpacity style={s7.oauthBtn} onPress={() => handleOAuth('Google')}>
                  <Text style={s7.oauthTxt}>G  Google</Text>
                </TouchableOpacity>
                <View style={s7.divider} />
                <TouchableOpacity style={s7.oauthBtn} onPress={() => handleOAuth('Facebook')}>
                  <Text style={[s7.oauthTxt, {color:'#1877f2'}]}>f  Facebook</Text>
                </TouchableOpacity>
              </View>
              <View style={s7.inputWrap}>
                <TextInput
                  style={s7.input}
                  placeholder="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View style={s7.inputWrap}>
                <TextInput
                  style={s7.input}
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
              {!!authError && <Text style={s7.errTxt}>{authError}</Text>}
              <TouchableOpacity
                style={[s7.createBtn, authLoading && {opacity:0.6}]}
                onPress={handleSignUp}
                disabled={authLoading}
              >
                <Text style={s7.createTxt}>
                  {authLoading ? 'Creating account...' : 'Create Free Account'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleLogin}>
                <Text style={s7.loginTxt}>
                  Already have an account? <Text style={{fontWeight:'800'}}>Login</Text>
                </Text>
              </TouchableOpacity>
            </View>
            <Dots current={7} />
          </View>
        );

      // ── Screen 8: Name Input ──────────────────────────────────────────
      case 8:
        return (
          <View style={s8.container}>
            <View style={s8.card}>
              <Text style={s8.label}>Enter your name</Text>
              <TextInput
                style={s8.input}
                placeholder="Enter your name"
                placeholderTextColor="#aaa"
                value={name}
                onChangeText={setName}
              />
              <TouchableOpacity style={s8.btn} onPress={goNext}>
                <Text style={s8.btnTxt}>Let's Go</Text>
              </TouchableOpacity>
            </View>
            <Dots current={8} />
          </View>
        );

      // ── Screen 9: Avatar ──────────────────────────────────────────────
      case 9:
        const avatarCategories = {
          Outfit: ['Default','Casual','Formal','Sport','Hoodie'],
          Color: ['Purple','Red','Yellow','Teal','Blue'],
          Eyes: ['Default','Round','Sleepy','Star'],
          'Eye Color': ['Brown','Blue','Green','Hazel'],
          'Hair Style': ['Short','Long','Curly','Bun'],
          'Hair Color': ['Black','Brown','Blonde','Red'],
          Skin: ['Light','Medium','Tan','Dark'],
        };
        return (
          <View style={s9.container}>
            <View style={s9.panel}>
              <ScrollView showsVerticalScrollIndicator={false}>
                {Object.entries(avatarCategories).map(([cat, opts]) => (
                  <View key={cat} style={s9.catRow}>
                    <Text style={s9.catLabel}>{cat}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {opts.map(o => (
                        <TouchableOpacity
                          key={o}
                          style={[s9.chip, avatarOpts[cat] === o && s9.chipActive]}
                          onPress={() => setAvatarOpts(prev => ({...prev, [cat]: o}))}
                        >
                          <Text style={[s9.chipTxt, avatarOpts[cat] === o && s9.chipTxtActive]}>
                            {o}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={[s9.saveBtn, savingProfile && {opacity:0.6}]}
                onPress={handleSaveProfile}
                disabled={savingProfile}
              >
                <Text style={s9.saveTxt}>
                  {savingProfile ? 'Saving...' : 'Save and Continue'}
                </Text>
              </TouchableOpacity>
            </View>
            <Dots current={9} />
          </View>
        );

      default: return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[{flex:1}, {transform:[{translateX: slideAnim}]}]}>
        <ImageBackground
          source={SCREENS[screen]}
          style={styles.bg}
          resizeMode="cover"
        >
          {renderOverlay()}
        </ImageBackground>
      </Animated.View>
    </SafeAreaView>
  );
}

// --------------------------
// STEP SCREEN COMPONENT (screens 4/5/6)
// --------------------------
function StepScreen({ current, onBack, onNext, onSkip, options, selected, onToggle }) {
  // Bounce animation for selected chips
  const scaleAnims = useRef(options.map(() => new Animated.Value(1))).current;

  const handlePress = (opt, i) => {
    Animated.sequence([
      Animated.timing(scaleAnims[i], {toValue: 0.92, duration: 80, useNativeDriver: true}),
      Animated.timing(scaleAnims[i], {toValue: 1, duration: 80, useNativeDriver: true}),
    ]).start();
    onToggle(opt);
  };

  return (
    <View style={ss.container}>
      <View style={ss.chipGrid}>
        {options.map((opt, i) => {
          const active = selected.includes(opt);
          return (
            <Animated.View key={opt} style={{transform:[{scale: scaleAnims[i]}], width: '47%'}}>
              <TouchableOpacity
                style={[ss.chip, active && ss.chipActive]}
                onPress={() => handlePress(opt, i)}
                activeOpacity={0.8}
              >
                <View style={[ss.checkCircle, active && ss.checkCircleActive]}>
                  {active && <Text style={ss.checkMark}>✓</Text>}
                </View>
                <Text style={ss.chipTxt}>{opt}</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
      <View style={ss.bottomArea}>
        <Dots current={current} />
        <View style={ss.btnRow}>
          <TouchableOpacity style={ss.nextBtn} onPress={onNext}>
            <Text style={ss.nextTxt}>Next</Text>
          </TouchableOpacity>
          <TouchableOpacity style={ss.skipBtn} onPress={onSkip}>
            <Text style={ss.skipTxt}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// --------------------------
// STYLES
// --------------------------
const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:'#000' },
  bg: { width, height },
  dotsRow: { flexDirection:'row', gap:5, alignItems:'center', justifyContent:'center', marginBottom:8 },
  dot: { width:7, height:7, borderRadius:99, backgroundColor:'rgba(255,255,255,.35)' },
  dotActive: { width:20, backgroundColor:'#fff' },
});

// Screen 0
const s0 = StyleSheet.create({
  container: { flex:1, justifyContent:'flex-end' },
  bottomPanel: { backgroundColor:'white', borderTopLeftRadius:36, borderTopRightRadius:36, padding:28, alignItems:'center' },
  title: { fontSize:24, fontWeight:'900', color:'#1e2a4a', textAlign:'center', lineHeight:30, marginBottom:8 },
  sub: { fontSize:14, color:'#6b7280', marginBottom:22 },
  btn: { backgroundColor:'#1e2a4a', borderRadius:99, paddingVertical:14, paddingHorizontal:44, marginBottom:18 },
  btnText: { color:'white', fontWeight:'800', fontSize:16 },
});

// Screen 1
const s1 = StyleSheet.create({
  container: { flex:1, justifyContent:'flex-end' },
  bottomArea: { padding:20, paddingBottom:32 },
  title: { fontSize:25, fontWeight:'900', color:'#1e2a4a', marginBottom:4, marginTop:10 },
  sub: { fontSize:14, color:'#1e2a4a', opacity:.7, marginBottom:16 },
  btnRow: { flexDirection:'row', gap:10 },
  nextBtn: { flex:1, backgroundColor:'#1e2a4a', borderRadius:99, padding:14, alignItems:'center' },
  nextTxt: { color:'white', fontWeight:'800', fontSize:16 },
  skipBtn: { flex:1, backgroundColor:'white', borderRadius:99, padding:14, alignItems:'center' },
  skipTxt: { color:'#1e2a4a', fontWeight:'700', fontSize:14 },
});

// Screen 2
const s2 = StyleSheet.create({
  container: { flex:1, justifyContent:'flex-end' },
  bottomArea: { padding:22, paddingBottom:30, alignItems:'center' },
  title: { fontSize:28, fontWeight:'900', color:'#1e2a4a', textAlign:'center', marginTop:10, marginBottom:6 },
  sub: { fontSize:14, color:'#1e2a4a', opacity:.65, marginBottom:18, textAlign:'center' },
  btnRow: { flexDirection:'row', gap:12, width:'100%' },
  nextBtn: { flex:2, backgroundColor:'#1e2a4a', borderRadius:99, padding:14, alignItems:'center' },
  nextTxt: { color:'white', fontWeight:'800', fontSize:16 },
  skipBtn: { flex:1, borderWidth:2, borderColor:'#1e2a4a', borderRadius:99, padding:14, alignItems:'center' },
  skipTxt: { color:'#1e2a4a', fontWeight:'700', fontSize:14 },
});

// Screen 3
const s3 = StyleSheet.create({
  container: { flex:1, justifyContent:'flex-end' },
  bottomArea: { padding:18, paddingBottom:28 },
  btnRow: { flexDirection:'row', gap:10, marginTop:12 },
  nextBtn: { flex:1, backgroundColor:'#1e2a4a', borderRadius:99, padding:14, alignItems:'center' },
  nextTxt: { color:'white', fontWeight:'800', fontSize:16 },
  skipBtn: { flex:1, borderWidth:2, borderColor:'#1e2a4a', borderRadius:99, padding:14, alignItems:'center' },
  skipTxt: { color:'#1e2a4a', fontWeight:'700', fontSize:14 },
});

// Step screens
const ss = StyleSheet.create({
  container: { flex:1, justifyContent:'flex-end' },
  chipGrid: { flexDirection:'row', flexWrap:'wrap', justifyContent:'space-between', paddingHorizontal:16, gap:10, marginBottom:8 },
  chip: { backgroundColor:'rgba(255,255,255,.92)', borderRadius:99, paddingVertical:11, paddingHorizontal:10, flexDirection:'row', alignItems:'center', gap:8, borderWidth:2, borderColor:'transparent' },
  chipActive: { borderColor:'#1e2a4a', backgroundColor:'white', shadowColor:'#1e2a4a', shadowOpacity:.15, shadowRadius:6, elevation:3 },
  checkCircle: { width:22, height:22, borderRadius:11, backgroundColor:'#e5e7eb', alignItems:'center', justifyContent:'center' },
  checkCircleActive: { backgroundColor:'#3b5bdb' },
  checkMark: { color:'white', fontSize:11, fontWeight:'900' },
  chipTxt: { fontWeight:'700', color:'#1e2a4a', fontSize:13 },
  bottomArea: { padding:16, paddingBottom:26 },
  btnRow: { flexDirection:'row', gap:10, marginTop:12 },
  nextBtn: { flex:1, backgroundColor:'#1e2a4a', borderRadius:99, padding:14, alignItems:'center' },
  nextTxt: { color:'white', fontWeight:'800', fontSize:16 },
  skipBtn: { flex:1, backgroundColor:'rgba(255,255,255,.2)', borderWidth:2, borderColor:'rgba(255,255,255,.4)', borderRadius:99, padding:14, alignItems:'center' },
  skipTxt: { color:'white', fontWeight:'700', fontSize:14 },
});

// Screen 7 – Sign Up
const s7 = StyleSheet.create({
  container: { flex:1, justifyContent:'flex-end', paddingBottom:20 },
  card: { backgroundColor:'white', borderRadius:24, marginHorizontal:14, padding:20, marginBottom:14 },
  or: { textAlign:'center', color:'#9ca3af', fontSize:13, marginBottom:10 },
  oauthRow: { flexDirection:'row', borderWidth:1, borderColor:'#e5e7eb', borderRadius:14, overflow:'hidden', marginBottom:14 },
  oauthBtn: { flex:1, padding:12, alignItems:'center' },
  oauthTxt: { fontWeight:'800', fontSize:13, color:'#1e2a4a' },
  divider: { width:1, backgroundColor:'#e5e7eb' },
  inputWrap: { borderBottomWidth:1, borderBottomColor:'#e5e7eb', marginBottom:2 },
  input: { paddingVertical:12, paddingHorizontal:4, fontSize:15, color:'#1e2a4a' },
  errTxt: { color:'#ef4444', fontSize:12, marginBottom:6 },
  createBtn: { backgroundColor:'#1e2a4a', borderRadius:99, padding:15, alignItems:'center', marginTop:12, marginBottom:10 },
  createTxt: { color:'white', fontWeight:'800', fontSize:16 },
  loginTxt: { textAlign:'center', color:'#6b7280', fontSize:13 },
});

// Screen 8 – Name
const s8 = StyleSheet.create({
  container: { flex:1, justifyContent:'center', paddingHorizontal:14, paddingTop: height * 0.35 },
  card: { backgroundColor:'white', borderRadius:24, padding:24 },
  label: { fontWeight:'800', fontSize:15, color:'#1e2a4a', marginBottom:10 },
  input: { borderWidth:2, borderColor:'#e5e7eb', borderRadius:99, padding:12, paddingHorizontal:18, fontSize:15, color:'#1e2a4a', marginBottom:14 },
  btn: { backgroundColor:'#1e2a4a', borderRadius:99, padding:15, alignItems:'center' },
  btnTxt: { color:'white', fontWeight:'800', fontSize:16 },
});

// Screen 9 – Avatar
const s9 = StyleSheet.create({
  container: { flex:1, justifyContent:'flex-end', paddingBottom:16 },
  panel: { backgroundColor:'rgba(0,0,0,.25)', borderRadius:20, marginHorizontal:12, padding:12, maxHeight: height * 0.52 },
  catRow: { flexDirection:'row', alignItems:'center', backgroundColor:'rgba(255,255,255,.1)', borderRadius:14, padding:10, marginBottom:7 },
  catLabel: { color:'white', fontWeight:'800', fontSize:12, width:72, flexShrink:0 },
  chip: { paddingVertical:5, paddingHorizontal:10, borderRadius:99, backgroundColor:'rgba(255,255,255,.2)', marginRight:6 },
  chipActive: { backgroundColor:'white' },
  chipTxt: { color:'white', fontSize:11, fontWeight:'700' },
  chipTxtActive: { color:'#7c3aed' },
  saveBtn: { backgroundColor:'white', borderRadius:99, padding:15, alignItems:'center', marginTop:10 },
  saveTxt: { color:'#7c3aed', fontWeight:'900', fontSize:16 },
});
