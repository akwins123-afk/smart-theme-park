import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  User, 
  ShieldCheck, 
  Radio, 
  ArrowRight, 
  Users, 
  Compass, 
  Coins, 
  Zap, 
  Lock, 
  CreditCard,
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Search, 
  Ticket,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Plus,
  Clock,
  MapPin,
  Check,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

// Web Audio API Pure Synth Magic Chime & Sounds (Zero external files needed)
function playMagicChime(enabled = true) {
  if (!enabled) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);
      gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.07 + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.07);
      osc.stop(ctx.currentTime + idx * 0.07 + 0.5);
    });
  } catch (e) {
    // Autoplay restrictions safely ignored
  }
}

const STRAP_COLORS = {
  sky: { name: 'Tomorrowland Sky Blue', hex: '#0072ce', ring: 'ring-sky-400', bg: 'bg-[#0072ce]' },
  gold: { name: 'Wonderla Splash Gold', hex: '#f59e0b', ring: 'ring-amber-400', bg: 'bg-[#f59e0b]' },
  violet: { name: 'Galactic Violet', hex: '#8b5cf6', ring: 'ring-purple-400', bg: 'bg-[#8b5cf6]' },
  coral: { name: 'Fantasyland Coral', hex: '#f43f5e', ring: 'ring-rose-400', bg: 'bg-[#f43f5e]' },
  navy: { name: 'Midnight Obsidian', hex: '#0f172a', ring: 'ring-slate-400', bg: 'bg-[#0f172a]' }
};

export default function LandingPage({ 
  onCustomerLoginSuccess, 
  onAdminLoginSuccess, 
  onNavigateToCustomer, 
  onNavigateToAdmin 
}) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

  // Atmosphere mode: 'day', 'sunset', 'night'
  const [atmosphere, setAtmosphere] = useState('day');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // MagicBand+ interactive customizer states
  const [bandColor, setBandColor] = useState('sky');
  const [isTappingPuck, setIsTappingPuck] = useState(false);
  const [scannerHUD, setScannerHUD] = useState(null);

  // Disney-style widget tab state
  const [searchTab, setSearchTab] = useState('passes'); // 'passes' or 'resorts'
  const [selectedDate, setSelectedDate] = useState('Today - Park Open (09:00 - 22:00)');
  const [accessibleFilter, setAccessibleFilter] = useState(false);

  // 18 Rides Public Catalog state
  const [ridesCatalog, setRidesCatalog] = useState([]);
  const [selectedLandFilter, setSelectedLandFilter] = useState('ALL');
  const [inspectingRide, setInspectingRide] = useState(null);

  // Demo wristbands list for 1-click testing
  const [demoBands, setDemoBands] = useState([]);
  const [selectedBandUid, setSelectedBandUid] = useState('UID-A101');
  const [customerPin, setCustomerPin] = useState('1234');
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerError, setCustomerError] = useState(null);

  // New Account Registration states
  const [customerModalTab, setCustomerModalTab] = useState('login'); // 'login' or 'register'
  const [regFullName, setRegFullName] = useState('');
  const [regHeight, setRegHeight] = useState('165');
  const [regPin, setRegPin] = useState('1234');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState(null);

  // Admin login states
  const [adminPassword, setAdminPassword] = useState('ThemePark@2026');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState(null);
  const [shakeAdmin, setShakeAdmin] = useState(false);

  // Parallax on mouse move
  useEffect(() => {
    const handleMouseMove = (e) => {
      const { clientWidth, clientHeight } = document.documentElement;
      const x = (e.clientX / clientWidth - 0.5) * 20;
      const y = (e.clientY / clientHeight - 0.5) * 20;
      setMousePos({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Fetch demo wristbands on load
  useEffect(() => {
    fetch('http://localhost:5000/api/auth/customer/demo-wristbands')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.wristbands) {
          setDemoBands(data.wristbands);
        }
      })
      .catch(err => console.error('Error fetching demo wristbands:', err));
  }, []);

  // Fetch 18 rides public catalog
  useEffect(() => {
    fetch('http://localhost:5000/api/public/rides')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.rides) {
          setRidesCatalog(data.rides);
        }
      })
      .catch(err => console.error('Error fetching public rides:', err));
  }, []);

  // Interactive MagicBand Puck Tap
  const handlePuckTap = () => {
    setIsTappingPuck(true);
    playMagicChime(soundEnabled);
    const currentVisitor = demoBands.find(b => b.Band_UID === selectedBandUid) || {
      Full_Name: 'Aarav Menon',
      Band_UID: 'UID-A101',
      Wallet_Balance: '2500.00',
      Height_cm: 175
    };
    setScannerHUD(currentVisitor);
    setTimeout(() => setIsTappingPuck(false), 800);
  };

  // Customer Login Handler
  const handleCustomerLogin = async (e) => {
    if (e) e.preventDefault();
    setCustomerLoading(true);
    setCustomerError(null);

    try {
      const res = await fetch('http://localhost:5000/api/auth/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bandUid: selectedBandUid, pin: customerPin })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Customer login failed.');
      }

      playMagicChime(soundEnabled);
      setShowCustomerModal(false);
      onCustomerLoginSuccess(data.user, data.token);
    } catch (err) {
      setCustomerError(err.message);
    } finally {
      setCustomerLoading(false);
    }
  };

  // Customer New Account Registration Handler
  const handleRegisterCustomer = async (e) => {
    if (e) e.preventDefault();
    setRegLoading(true);
    setRegError(null);

    try {
      const res = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: regFullName,
          heightCm: regHeight,
          pin: regPin,
          email: regEmail,
          phone: regPhone
        })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Registration failed.');
      }

      playMagicChime(soundEnabled);
      setShowCustomerModal(false);
      onCustomerLoginSuccess({
        bandId: data.bandId,
        bandUid: data.bandUid,
        fullName: data.fullName,
        status: 'Pending',
        walletBalance: 0
      }, data.token);
    } catch (err) {
      setRegError(err.message);
    } finally {
      setRegLoading(false);
    }
  };

  // Admin Login Handler
  const handleAdminLogin = async (e) => {
    if (e) e.preventDefault();
    setAdminLoading(true);
    setAdminError(null);
    setShakeAdmin(false);

    try {
      const res = await fetch('http://localhost:5000/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.shake) {
          setShakeAdmin(true);
          setTimeout(() => setShakeAdmin(false), 500);
        }
        throw new Error(data.message || 'Invalid administrative password.');
      }

      playMagicChime(soundEnabled);
      setShowAdminModal(false);
      onAdminLoginSuccess(data.token);
    } catch (err) {
      setAdminError(err.message);
    } finally {
      setAdminLoading(false);
    }
  };

  const activeVisitor = demoBands.find(b => b.Band_UID === selectedBandUid) || {
    Full_Name: 'Aarav Menon',
    Band_UID: 'UID-A101',
    Wallet_Balance: '3000.00',
    Status: 'Active',
    Height_cm: 175
  };

  // Unique park lands for attractions tab
  const parkLands = ['ALL', 'Tomorrowland', 'Wonderla Thrills', 'Wonderla Water', 'Adventureland', 'Fantasyland', 'Galaxy Edge'];

  return (
    <div 
      className={`relative min-h-[calc(100vh-4rem)] flex flex-col justify-between overflow-hidden transition-colors duration-700 select-none ${
        atmosphere === 'day'
          ? 'bg-gradient-to-b from-[#e0f2fe] via-[#f0f9ff] to-white text-slate-800'
          : atmosphere === 'sunset'
          ? 'bg-gradient-to-b from-[#fed7aa] via-[#fce7f3] to-[#e0f2fe] text-slate-900'
          : 'bg-gradient-to-b from-[#020617] via-[#09142e] to-[#021330] text-white'
      }`}
    >
      {/* TOP LIVE THEME PARK STATUS TICKER */}
      <div className={`py-1.5 px-4 text-[11px] font-mono border-b overflow-hidden relative z-30 flex items-center justify-between ${
        atmosphere === 'night'
          ? 'bg-slate-900/90 border-sky-500/20 text-sky-300'
          : 'bg-[#002244] border-sky-200 text-sky-100 shadow-sm'
      }`}>
        <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-bold tracking-wider uppercase text-amber-300">PARK TELEMETRY:</span>
          <div className="inline-block animate-marquee whitespace-nowrap space-x-6 text-xs">
            <span>🎢 Space Mountain: 10m Wait</span>
            <span>⚡ TRON Lightcycle / Run: FastPass Available</span>
            <span>🚀 Star Wars: Rise of Resistance: Standby Open</span>
            <span>🌊 Thunder Rapids Water Slide: 5m Wait</span>
            <span>🔐 Smart Keyless Lockers: 5 Units Online</span>
            <span>💳 Contactless RFID Wallet Auto-Debit: Active</span>
            <span>☀️ Temperature: 28°C Clear Skies</span>
          </div>
        </div>

        {/* Atmosphere & Sound Toggles */}
        <div className="flex items-center gap-2 pl-4 flex-shrink-0">
          {/* Atmosphere Modes */}
          <div className="flex items-center bg-black/25 rounded-full p-0.5 border border-white/20">
            <button
              type="button"
              onClick={() => setAtmosphere('day')}
              className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-bold flex items-center gap-1 transition-all ${
                atmosphere === 'day' ? 'bg-sky-500 text-white shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Sun className="w-2.5 h-2.5" /> Day Resort
            </button>
            <button
              type="button"
              onClick={() => setAtmosphere('sunset')}
              className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-bold flex items-center gap-1 transition-all ${
                atmosphere === 'sunset' ? 'bg-amber-500 text-white shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              🌅 Sunset Glow
            </button>
            <button
              type="button"
              onClick={() => setAtmosphere('night')}
              className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-bold flex items-center gap-1 transition-all ${
                atmosphere === 'night' ? 'bg-indigo-600 text-white shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Moon className="w-2.5 h-2.5" /> Night Horizon
            </button>
          </div>

          {/* Sound FX Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1 rounded-full bg-black/20 hover:bg-black/40 text-slate-200 transition-colors"
            title={soundEnabled ? 'Mute Theme Park Sound FX' : 'Enable Sound FX'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-300" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
          </button>
        </div>
      </div>

      {/* BACKGROUND SKYLINE: ROTATING FERRIS WHEEL, CASTLE & ZOOMING ROLLERCOASTER */}
      <div 
        className="absolute inset-0 pointer-events-none transition-transform duration-200 ease-out overflow-hidden"
        style={{
          transform: `translate(${mousePos.x}px, ${mousePos.y}px)`
        }}
      >
        {/* Ambient glows */}
        <div className={`absolute top-10 left-1/4 w-[500px] h-[500px] rounded-full blur-3xl animate-pulse-slow ${
          atmosphere === 'night' ? 'bg-indigo-900/30' : 'bg-sky-300/30'
        }`} />
        <div className={`absolute top-1/3 right-10 w-[450px] h-[450px] rounded-full blur-3xl ${
          atmosphere === 'night' ? 'bg-purple-900/20' : 'bg-blue-400/20'
        }`} />

        {/* Grand Theme Park Skyline SVG with Dynamic Movement */}
        <svg 
          className="absolute bottom-0 w-full h-[58vh] opacity-85 text-sky-300/40" 
          viewBox="0 0 1440 400" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Support Towers */}
          <path d="M120 400L160 200L200 400M160 200L160 400" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
          <path d="M450 400L520 80L590 400M520 80L520 400" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
          <path d="M850 400L920 140L990 400M920 140L920 400" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
          <path d="M1200 400L1260 180L1320 400" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />

          {/* Cinderella Castle Silhouette */}
          <g transform="translate(680, 150)" opacity={atmosphere === 'night' ? '0.7' : '0.35'}>
            <path d="M40 0L48 45H32L40 0Z M15 35L22 75H8L15 35Z M65 35L72 75H58L65 35Z M0 95H80V180H0V95Z M25 55H55V95H25V55Z" fill="#0072ce" />
            <circle cx="40" cy="0" r="3" fill="#fef08a" className="animate-ping" />
          </g>

          {/* Rollercoaster Dual Rails */}
          <path 
            id="coaster-path"
            d="M0 340C120 340 140 190 240 190C360 190 420 70 540 70C660 70 720 280 840 280C940 280 980 130 1100 130C1220 130 1280 250 1440 250" 
            stroke="url(#track-grad)" 
            strokeWidth="4" 
            strokeLinecap="round" 
          />
          <path 
            d="M0 350C120 350 140 200 240 200C360 200 420 80 540 80C660 80 720 290 840 290C940 290 980 140 1100 140C1220 140 1280 260 1440 260" 
            stroke="url(#track-grad)" 
            strokeWidth="2" 
            strokeDasharray="8 8"
          />

          {/* ANIMATED ROLLERCOASTER MULTI-CAR TRAIN ZOOMING ALONG TRACK */}
          <g>
            <animateMotion 
              path="M0 340C120 340 140 190 240 190C360 190 420 70 540 70C660 70 720 280 840 280C940 280 980 130 1100 130C1220 130 1280 250 1440 250" 
              dur="7.5s" 
              repeatCount="indefinite"
              rotate="auto"
            />
            {/* Engine Car */}
            <rect x="-18" y="-7" width="16" height="10" rx="3" fill="#0072ce" stroke="#ffffff" strokeWidth="1" />
            <circle cx="-10" cy="-9" r="3" fill="#fbbf24" />
            {/* Car 2 */}
            <rect x="-36" y="-6" width="14" height="9" rx="2" fill="#0284c7" stroke="#ffffff" strokeWidth="0.8" />
            <circle cx="-29" cy="-8" r="2.5" fill="#38bdf8" />
            {/* Car 3 */}
            <rect x="-52" y="-6" width="14" height="9" rx="2" fill="#38bdf8" stroke="#ffffff" strokeWidth="0.8" />
            {/* Coaster Sparkle trail */}
            <circle cx="-58" cy="-2" r="2" fill="#f59e0b" className="animate-ping" />
          </g>

          {/* CONTINUOUSLY ROTATING FERRIS WHEEL WITH ILLUMINATED GONDOLAS */}
          <g transform="translate(1320, 180)">
            <g>
              <animateTransform 
                attributeName="transform" 
                type="rotate" 
                from="0" 
                to="360" 
                dur="22s" 
                repeatCount="indefinite" 
              />
              <circle cx="0" cy="0" r="75" stroke="#0072ce" strokeWidth="2" fill="none" opacity="0.6" />
              <circle cx="0" cy="0" r="60" stroke="#38bdf8" strokeWidth="1" fill="none" strokeDasharray="6 6" opacity="0.5" />
              <line x1="0" y1="-75" x2="0" y2="75" stroke="#0072ce" strokeWidth="1.5" opacity="0.5" />
              <line x1="-75" y1="0" x2="75" y2="0" stroke="#0072ce" strokeWidth="1.5" opacity="0.5" />
              <line x1="-53" y1="-53" x2="53" y2="53" stroke="#0072ce" strokeWidth="1.5" opacity="0.5" />
              <line x1="-53" y1="53" x2="53" y2="-53" stroke="#0072ce" strokeWidth="1.5" opacity="0.5" />
              {/* Glowing Gondolas */}
              <circle cx="0" cy="-75" r="5" fill="#f59e0b" />
              <circle cx="53" cy="-53" r="5" fill="#ec4899" />
              <circle cx="75" cy="0" r="5" fill="#10b981" />
              <circle cx="53" cy="53" r="5" fill="#3b82f6" />
              <circle cx="0" cy="75" r="5" fill="#f59e0b" />
              <circle cx="-53" cy="53" r="5" fill="#ec4899" />
              <circle cx="-75" cy="0" r="5" fill="#10b981" />
              <circle cx="-53" cy="-53" r="5" fill="#3b82f6" />
            </g>
            {/* Support Legs */}
            <line x1="0" y1="0" x2="-35" y2="120" stroke="#002244" strokeWidth="3" opacity="0.6" />
            <line x1="0" y1="0" x2="35" y2="120" stroke="#002244" strokeWidth="3" opacity="0.6" />
          </g>

          <defs>
            <linearGradient id="track-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#0072ce" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.8" />
            </linearGradient>
          </defs>
        </svg>

        {/* Soft Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0284c708_1px,transparent_1px),linear-gradient(to_bottom,#0284c708_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      {/* MAIN HERO CONTAINER */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-10 flex-1 flex flex-col justify-center">
        
        {/* Top Tagline & Headline */}
        <div className="text-center space-y-3 max-w-4xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-semibold shadow-md ${
              atmosphere === 'night'
                ? 'bg-slate-900/90 border-purple-500/40 text-purple-200'
                : 'bg-white/90 border-sky-200 text-sky-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>Walt Disney World & Wonderla Edition · Smart RFID Resort & Virtual Queue</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`text-4xl sm:text-6xl font-display font-extrabold tracking-tight leading-tight ${
              atmosphere === 'night' ? 'text-white' : 'text-[#002244]'
            }`}
          >
            Enjoy Magic in{' '}
            <span className="bg-gradient-to-r from-[#0072ce] via-sky-400 to-[#0284c7] bg-clip-text text-transparent italic">
              Every Moment
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className={`text-sm sm:text-base max-w-3xl mx-auto leading-relaxed ${
              atmosphere === 'night' ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            One waterproof RFID wristband replaces physical tickets: your digital identity, contactless wallet, keyless locker, and virtual queue FastPass — backed by MySQL 3NF integrity.
          </motion.p>
        </div>

        {/* ======================================================== */}
        {/* DISNEY WORLD INTERACTIVE WIDGET (TICKETS VS 18 RIDES) */}
        {/* ======================================================== */}
        <motion.div 
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="my-6 max-w-4xl mx-auto w-full"
        >
          <div className={`rounded-3xl shadow-2xl border p-4 sm:p-6 transition-all ${
            atmosphere === 'night'
              ? 'bg-slate-900/90 border-sky-500/30 shadow-sky-950/80 text-white'
              : 'bg-white border-sky-100 shadow-sky-200/50'
          }`}>
            
            {/* Widget Tabs Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSearchTab('passes')}
                  className={`flex items-center gap-2 pb-2 px-4 text-xs sm:text-sm font-bold transition-all relative ${
                    searchTab === 'passes'
                      ? atmosphere === 'night' ? 'text-sky-300 font-extrabold' : 'text-[#002244] font-extrabold'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Ticket className="w-4 h-4 text-[#0072ce]" />
                  <span>Tickets, FastPass & Wristbands</span>
                  {searchTab === 'passes' && (
                    <motion.div 
                      layoutId="activeTabUnderline"
                      className={`absolute bottom-0 left-0 right-0 h-1 rounded-full ${
                        atmosphere === 'night' ? 'bg-sky-400' : 'bg-[#002244]'
                      }`}
                    />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setSearchTab('resorts')}
                  className={`flex items-center gap-2 pb-2 px-4 text-xs sm:text-sm font-bold transition-all relative ${
                    searchTab === 'resorts'
                      ? atmosphere === 'night' ? 'text-amber-300 font-extrabold' : 'text-[#002244] font-extrabold'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Compass className="w-4 h-4 text-amber-500" />
                  <span>Resorts & Attractions (18 Rides Showcase)</span>
                  {searchTab === 'resorts' && (
                    <motion.div 
                      layoutId="activeTabUnderline"
                      className={`absolute bottom-0 left-0 right-0 h-1 rounded-full ${
                        atmosphere === 'night' ? 'bg-amber-400' : 'bg-[#002244]'
                      }`}
                    />
                  )}
                </button>
              </div>
            </div>

            {/* TAB 1: PASSES & SEARCH CAPSULE */}
            {searchTab === 'passes' ? (
              <>
                <div className={`grid grid-cols-1 md:grid-cols-12 gap-3 items-center p-2.5 rounded-2xl border ${
                  atmosphere === 'night' ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50/80 border-slate-200'
                }`}>
                  {/* Field 1: Dates */}
                  <div className="md:col-span-4 px-3 py-1.5 rounded-xl hover:bg-white/80 transition-colors cursor-pointer border border-transparent hover:border-slate-200">
                    <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Park Day & Time</span>
                    <div className="text-sm font-bold flex items-center gap-1.5 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-[#0072ce]" />
                      <span>Today · Open until 10 PM</span>
                    </div>
                  </div>

                  {/* Field 2: Guests / Wristband Quick Select */}
                  <div 
                    onClick={() => setShowCustomerModal(true)}
                    className="md:col-span-4 px-3 py-1.5 rounded-xl hover:bg-white/80 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                  >
                    <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Active Guest Pass</span>
                    <div className="text-sm font-bold flex items-center gap-1.5 mt-0.5">
                      <User className="w-3.5 h-3.5 text-[#0072ce]" />
                      <span>{activeVisitor.Full_Name} ({activeVisitor.Band_UID})</span>
                    </div>
                  </div>

                  {/* Field 3: Accessible Checkbox */}
                  <div className="md:col-span-3 px-3 py-1.5 flex items-center gap-2">
                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={accessibleFilter} 
                        onChange={(e) => setAccessibleFilter(e.target.checked)}
                        className="w-4 h-4 text-[#0072ce] rounded border-slate-300 focus:ring-sky-500" 
                      />
                      <span>Full Thrill Clearance</span>
                    </label>
                  </div>

                  {/* Action Button: Circular Tap */}
                  <div className="md:col-span-1 flex justify-center sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setShowCustomerModal(true)}
                      className="w-12 h-12 rounded-full bg-[#0072ce] hover:bg-[#0284c7] text-white flex items-center justify-center shadow-lg shadow-sky-500/30 transition-transform hover:scale-105 active:scale-95"
                      title="Tap Wristband & Enter Park"
                    >
                      <Search className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 text-xs text-slate-400 flex items-center justify-between px-1">
                  <span>💡 <strong>Pro tip:</strong> Tap your RFID Wristband to automatically verify ride height clearance and book FastPasses.</span>
                  <button 
                    onClick={() => setShowCustomerModal(true)}
                    className="text-[#0072ce] font-bold hover:underline flex items-center gap-1"
                  >
                    <span>Tap or Switch Wristband</span> →
                  </button>
                </div>
              </>
            ) : (
              /* TAB 2: INTERACTIVE 18 RIDES LIVE EXPLORER */
              <div className="space-y-3">
                {/* Top Label & Live Count Badge */}
                <div className="flex items-center justify-between pb-0.5">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-sans">
                    Filter by Park Land:
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                    <span>18 Live DB Attractions</span>
                  </div>
                </div>

                {/* Full-width Horizontal Scrollable Land Buttons */}
                <div className="flex gap-2 overflow-x-auto text-[11px] font-mono pb-2 border-b border-slate-100 dark:border-slate-800 scrollbar-thin">
                  {parkLands.map(land => (
                    <button
                      key={land}
                      type="button"
                      onClick={() => setSelectedLandFilter(land)}
                      className={`px-3.5 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap shadow-sm ${
                        selectedLandFilter === land
                          ? 'bg-[#0072ce] text-white shadow-sky-500/25 ring-2 ring-sky-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-[#0072ce] hover:bg-sky-50'
                      }`}
                    >
                      {land}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-56 overflow-y-auto pr-1">
                  {ridesCatalog
                    .filter(r => selectedLandFilter === 'ALL' || (r.Park_Land || '').toLowerCase().includes(selectedLandFilter.toLowerCase().replace(' ', '')))
                    .map(r => (
                      <div
                        key={r.Attraction_ID}
                        onClick={() => setInspectingRide(r)}
                        className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-[#0072ce] cursor-pointer transition-all hover:scale-[1.02] shadow-sm flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between text-[10px] font-mono mb-1.5">
                            <span className="text-slate-500 font-medium truncate max-w-[120px]" title={r.Park_Land}>{r.Park_Land}</span>
                            <span className="font-bold text-[#0072ce] bg-sky-50 dark:bg-sky-950/70 px-2 py-0.5 rounded-md text-[11px]">₹{parseFloat(r.Ride_Price).toFixed(0)}</span>
                          </div>
                          <h4 className="font-bold text-xs leading-snug line-clamp-2 text-[#002244] dark:text-white">{r.Attraction_Name}</h4>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-200 dark:border-slate-700 pt-1.5 font-mono">
                          <span>Min {r.Min_Height_cm}cm</span>
                          <span className="text-emerald-500 font-bold">FastPass</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

          </div>
        </motion.div>

        {/* ======================================================== */}
        {/* INTERACTIVE 3D MAGICBAND+ CUSTOMIZER & RFID SCANNER TEST */}
        {/* ======================================================== */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="my-4 flex flex-col items-center justify-center space-y-3"
        >
          {/* Strap Color Switcher Chips */}
          <div className="flex items-center gap-2 p-1.5 rounded-full bg-white/80 dark:bg-slate-900/80 border border-sky-200 backdrop-blur-md shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">Wristband Style:</span>
            {Object.entries(STRAP_COLORS).map(([key, item]) => (
              <button
                key={key}
                type="button"
                onClick={(e) => { e.stopPropagation(); setBandColor(key); playMagicChime(soundEnabled); }}
                className={`w-6 h-6 rounded-full transition-transform hover:scale-110 flex items-center justify-center ${item.bg} ${
                  bandColor === key ? 'ring-2 ring-offset-2 ring-sky-500 scale-110' : 'opacity-80'
                }`}
                title={item.name}
              >
                {bandColor === key && <Check className="w-3 h-3 text-white" />}
              </button>
            ))}
          </div>

          {/* Interactive Wristband Body */}
          <div 
            onClick={handlePuckTap}
            className="relative group cursor-pointer"
            title="Click to Simulate Contactless RFID Wristband Tap!"
          >
            {/* Outer NFC Glow wave on tap */}
            {isTappingPuck && (
              <div className="absolute -inset-6 rounded-full bg-sky-400/30 animate-ping pointer-events-none" />
            )}

            <div className={`relative flex items-center gap-4 px-6 py-4 rounded-3xl bg-white/95 dark:bg-slate-900/95 border shadow-2xl backdrop-blur-xl transition-all duration-300 group-hover:scale-[1.02] ${
              isTappingPuck 
                ? 'border-emerald-400 ring-4 ring-emerald-400/30' 
                : 'border-sky-200 hover:border-[#0072ce]'
            }`}>
              {/* RFID Center Puck */}
              <div 
                id="magicband-puck"
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:rotate-6 text-white ${
                  STRAP_COLORS[bandColor].bg
                }`}
              >
                <Radio className={`w-7 h-7 ${isTappingPuck ? 'animate-bounce text-amber-300' : 'animate-pulse'}`} />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[#0072ce] font-bold uppercase tracking-wider">
                    RFID MagicBand+ {activeVisitor.Band_UID}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                    {activeVisitor.Status || 'Active'}
                  </span>
                  <span className="text-[10px] text-amber-500 font-bold animate-pulse">⚡ TAP TO TEST</span>
                </div>

                <div className="text-lg font-extrabold text-[#002244] dark:text-white">
                  {activeVisitor.Full_Name} · ₹{parseFloat(activeVisitor.Wallet_Balance || 0).toFixed(2)}
                </div>

                <span className="text-xs text-slate-500">
                  Click center puck to test 13.56 MHz NFC tap & sound effect
                </span>
              </div>

              <div className="pl-4 border-l border-slate-200 hidden sm:block">
                <span className="text-[10px] font-mono text-slate-400 block uppercase">NFC Pass</span>
                <span className="text-xs font-mono text-sky-700 dark:text-sky-400 font-bold">13.56 MHz RFID</span>
              </div>
            </div>
          </div>

          {/* Scanner HUD Readout overlay */}
          <AnimatePresence>
            {scannerHUD && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 rounded-2xl bg-slate-950 text-sky-300 font-mono text-xs border border-sky-500/40 shadow-2xl flex items-center gap-4"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-emerald-400 font-bold">NFC READ: 100% OK</span>
                </div>
                <span>UID: <strong>{scannerHUD.Band_UID}</strong></span>
                <span>GUEST: <strong>{scannerHUD.Full_Name}</strong></span>
                <span>BALANCE: <strong>₹{parseFloat(scannerHUD.Wallet_Balance || 0).toFixed(2)}</strong></span>
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(true)}
                  className="px-2.5 py-1 rounded-lg bg-sky-600 text-white font-sans font-bold hover:bg-sky-500"
                >
                  Enter Portal →
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ======================================================== */}
        {/* EXACTLY TWO BIG GLOWING PORTAL CARDS */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full mt-4">
          
          {/* Card 1: Visitor Portal */}
          <motion.div
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCustomerModal(true)}
            className={`group relative rounded-3xl p-6 sm:p-8 cursor-pointer border shadow-xl hover:shadow-2xl overflow-hidden transition-all ${
              atmosphere === 'night'
                ? 'bg-slate-900/90 border-sky-500/30 hover:border-sky-400'
                : 'bg-white border-sky-200 hover:border-[#0072ce] shadow-sky-100'
            }`}
          >
            <div className="absolute top-0 right-0 w-36 h-36 bg-sky-100/50 rounded-full blur-2xl group-hover:bg-sky-200 transition-all pointer-events-none" />

            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-[#0072ce] group-hover:scale-110 transition-transform shadow-sm">
                <User className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold text-[#0072ce] bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
                Guest Self-Service
              </span>
            </div>

            <h3 className="text-2xl font-display font-extrabold text-[#002244] dark:text-white group-hover:text-[#0072ce] transition-colors">
              I'm a Visitor
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Tap your RFID wristband to inspect live balance, book virtual queue FastPasses across 18 rides with conflict detection, rent smart lockers, and explore park lands.
            </p>

            <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-[#0072ce]">
                Tap Wristband & Enter Guest Pass →
              </span>
              <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-[#0072ce] group-hover:translate-x-1 transition-transform">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </motion.div>

          {/* Card 2: Park Staff / Admin */}
          <motion.div
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAdminModal(true)}
            className={`group relative rounded-3xl p-6 sm:p-8 cursor-pointer border shadow-xl hover:shadow-2xl overflow-hidden transition-all ${
              atmosphere === 'night'
                ? 'bg-slate-900/90 border-purple-500/30 hover:border-purple-400'
                : 'bg-white border-indigo-200 hover:border-indigo-500 shadow-indigo-50'
            }`}
          >
            <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-50/50 rounded-full blur-2xl group-hover:bg-indigo-100 transition-all pointer-events-none" />

            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 group-hover:scale-110 transition-transform shadow-sm">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Password Protected
              </span>
            </div>

            <h3 className="text-2xl font-display font-extrabold text-[#002244] dark:text-white group-hover:text-indigo-600 transition-colors">
              Park Staff / Admin
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Open the Database Transparency Center (ER diagram, live SQL inspector, guarded console, 3NF DDL) and Park Operations (wallet top-ups, turnstiles, POS simulators, keyless lockers).
            </p>

            <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-indigo-700">
                Unlock Control Room & Mission Control →
              </span>
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 group-hover:translate-x-1 transition-transform">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </motion.div>

        </div>

        {/* ANIMATED METRIC COUNTERS */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto w-full"
        >
          <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-sky-100 dark:border-slate-800 shadow-md text-center">
            <Users className="w-5 h-5 text-[#0072ce] mx-auto mb-1" />
            <div className="text-2xl font-extrabold text-[#002244] dark:text-white font-mono">
              {demoBands.length || 8}
            </div>
            <div className="text-xs text-slate-500 font-medium">Guests in Park</div>
          </div>

          <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-sky-100 dark:border-slate-800 shadow-md text-center">
            <Compass className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
            <div className="text-2xl font-extrabold text-[#002244] dark:text-white font-mono">18</div>
            <div className="text-xs text-slate-500 font-medium">Disney & Wonderla Rides</div>
          </div>

          <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-sky-100 dark:border-slate-800 shadow-md text-center">
            <Coins className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <div className="text-2xl font-extrabold text-[#002244] dark:text-white font-mono">₹4,250</div>
            <div className="text-xs text-slate-500 font-medium">Live POS Revenue</div>
          </div>

          <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-sky-100 dark:border-slate-800 shadow-md text-center">
            <Zap className="w-5 h-5 text-sky-500 mx-auto mb-1" />
            <div className="text-2xl font-extrabold text-[#002244] dark:text-white font-mono">12</div>
            <div className="text-xs text-slate-500 font-medium">Active FastPasses</div>
          </div>
        </motion.div>

      </div>

      {/* ======================================================== */}
      {/* MODAL 1: CUSTOMER RFID TAP & REGISTER */}
      {/* ======================================================== */}
      <AnimatePresence>
        {showCustomerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white border border-sky-200 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-800"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-sky-50 text-[#0072ce] flex items-center justify-center border border-sky-200">
                    <Radio className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-[#002244]">
                      {customerModalTab === 'login' ? 'Tap RFID Wristband' : 'Create New Account'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {customerModalTab === 'login' 
                        ? 'Select demo wristband or enter Band UID & PIN' 
                        : 'Register your visitor pass (starts in Pending Activation)'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowCustomerModal(false)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Subtab Switcher: Tap vs Register */}
              <div className="flex bg-slate-100 p-1 rounded-2xl mb-4 text-xs font-bold font-sans">
                <button
                  type="button"
                  onClick={() => setCustomerModalTab('login')}
                  className={`flex-1 py-2 rounded-xl transition-all ${
                    customerModalTab === 'login'
                      ? 'bg-white text-[#0072ce] shadow-sm font-extrabold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Tap Existing Wristband
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerModalTab('register')}
                  className={`flex-1 py-2 rounded-xl transition-all ${
                    customerModalTab === 'register'
                      ? 'bg-[#0072ce] text-white shadow-sm font-extrabold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  + Create Account
                </button>
              </div>

              {customerModalTab === 'login' ? (
                <>
                  {/* Demo Band Quick Select Chips */}
                  <div className="mb-5">
                    <span className="text-[11px] font-bold text-[#0072ce] block mb-2 uppercase tracking-wider">
                      QUICK-TAP DEMO WRISTBANDS (FROM REVIEW 2 DATASET):
                    </span>
                    <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                      {demoBands.map((b) => (
                        <button
                          key={b.Band_ID}
                          type="button"
                          onClick={() => {
                            setSelectedBandUid(b.Band_UID);
                            setCustomerPin('1234');
                            playMagicChime(soundEnabled);
                          }}
                          className={`text-left p-2.5 rounded-2xl text-xs font-mono transition-all border ${
                            selectedBandUid === b.Band_UID
                              ? 'bg-sky-50 border-[#0072ce] text-[#002244] shadow-sm font-bold ring-2 ring-sky-300'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-sky-300'
                          }`}
                        >
                          <div className="font-bold flex items-center justify-between">
                            <span>{b.Full_Name.split(' ')[0]}</span>
                            <span className="text-[10px] text-[#0072ce]">{b.Band_UID}</span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {b.Height_cm} cm · ₹{b.Wallet_Balance}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <form onSubmit={handleCustomerLogin} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        RFID Band UID
                      </label>
                      <input
                        type="text"
                        value={selectedBandUid}
                        onChange={(e) => setSelectedBandUid(e.target.value)}
                        placeholder="e.g. UID-A101"
                        className="w-full rounded-xl px-4 py-2.5 text-sm font-mono border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0072ce]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span>4-Digit Security PIN</span>
                        <span className="text-[#0072ce] text-[10px]">Default demo PIN is 1234</span>
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        value={customerPin}
                        onChange={(e) => setCustomerPin(e.target.value)}
                        placeholder="1234"
                        className="w-full rounded-xl px-4 py-2.5 text-sm font-mono border border-slate-300 tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-[#0072ce]"
                        required
                      />
                    </div>

                    {customerError && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{customerError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={customerLoading}
                      className="w-full py-3 rounded-2xl bg-[#0072ce] hover:bg-[#0284c7] text-white font-bold text-sm shadow-lg shadow-sky-500/25 transition-all flex items-center justify-center gap-2"
                    >
                      {customerLoading ? (
                        'Scanning RFID Wristband...'
                      ) : (
                        <>
                          <Radio className="w-4 h-4" />
                          Tap Wristband & Access Profile
                        </>
                      )}
                    </button>
                  </form>
                </>
              ) : (
                /* CREATE NEW ACCOUNT FORM */
                <form onSubmit={handleRegisterCustomer} className="space-y-3.5">
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                    <span className="font-bold">⚠️ Activation Rule:</span> Newly created accounts start in <span className="font-mono font-bold">Pending</span> status with ₹0. Visit a park counter where staff will allot your opening amount.
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      placeholder="e.g. Akash R"
                      className="w-full rounded-xl px-4 py-2.5 text-sm font-sans border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0072ce]"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Height in cm (Safety) *
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={regHeight}
                        onChange={(e) => setRegHeight(e.target.value)}
                        placeholder="175"
                        className="w-full rounded-xl px-4 py-2 text-sm font-mono border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0072ce]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        4-Digit PIN *
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        value={regPin}
                        onChange={(e) => setRegPin(e.target.value)}
                        placeholder="1234"
                        className="w-full rounded-xl px-4 py-2 text-sm font-mono border border-slate-300 tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-[#0072ce]"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Email (Optional)
                      </label>
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="akash@example.com"
                        className="w-full rounded-xl px-4 py-2 text-sm font-sans border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0072ce]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Phone (Optional)
                      </label>
                      <input
                        type="tel"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="+91 9120896769"
                        className="w-full rounded-xl px-4 py-2 text-sm font-sans border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0072ce]"
                      />
                    </div>
                  </div>

                  {regError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{regError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={regLoading}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#0072ce] to-[#002244] hover:opacity-95 text-white font-bold text-sm shadow-lg shadow-sky-500/25 transition-all flex items-center justify-center gap-2"
                  >
                    {regLoading ? (
                      'Generating Digital Wristband...'
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        Create Account & Generate RFID Band
                      </>
                    )}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL 2: ADMIN PASSWORD GATE */}
      {/* ======================================================== */}
      <AnimatePresence>
        {showAdminModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`relative w-full max-w-md bg-white border border-indigo-200 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-800 ${
                shakeAdmin ? 'animate-shake' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-200">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-[#002244]">Park Staff / Admin</h3>
                    <p className="text-xs text-slate-500">Mission Control & Database Transparency</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowAdminModal(false)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4 p-3 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900">
                <span className="font-bold">Demo Evaluation Password:</span> <code className="font-mono bg-white px-2 py-0.5 rounded border border-indigo-300 font-bold">ThemePark@2026</code>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Master Admin Password
                  </label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Enter admin password"
                    className="w-full rounded-xl px-4 py-2.5 text-sm font-mono border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    required
                  />
                </div>

                {adminError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{adminError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={adminLoading}
                  className="w-full py-3 rounded-2xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2"
                >
                  {adminLoading ? 'Verifying Security Token...' : 'Unlock Mission Control'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL 3: RIDE DETAILS PREVIEW */}
      {/* ======================================================== */}
      <AnimatePresence>
        {inspectingRide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-white border border-sky-200 rounded-3xl shadow-2xl p-6 text-slate-800 space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-[10px] font-mono text-[#0072ce] font-bold uppercase tracking-wider">
                  {inspectingRide.Park_Land}
                </span>
                <button onClick={() => setInspectingRide(null)} className="text-slate-400 hover:text-slate-700 p-1">✕</button>
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-[#002244]">{inspectingRide.Attraction_Name}</h3>
                <span className="text-xs text-slate-500 font-mono">{inspectingRide.Category} Attraction</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Ride Fee:</span>
                  <span className="font-bold text-[#0072ce]">₹{parseFloat(inspectingRide.Ride_Price).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Min Safety Height:</span>
                  <span className="font-bold text-slate-800">{inspectingRide.Min_Height_cm} cm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Max Height Limit:</span>
                  <span className="font-bold text-slate-800">{inspectingRide.Max_Height_cm} cm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Slot Capacity:</span>
                  <span className="font-bold text-emerald-600">{inspectingRide.Capacity_Per_Slot} riders</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setInspectingRide(null);
                  setShowCustomerModal(true);
                }}
                className="w-full py-2.5 rounded-xl bg-[#0072ce] hover:bg-[#0284c7] text-white font-bold text-xs shadow-md shadow-sky-500/25"
              >
                Tap Wristband to Book FastPass
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
