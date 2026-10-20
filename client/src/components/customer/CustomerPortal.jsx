import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Coins, 
  Ticket, 
  Lock, 
  MapPin, 
  Compass, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  ShieldAlert, 
  Sparkles,
  QrCode,
  Calendar,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Key,
  Shield,
  EyeOff,
  Filter,
  Info,
  CheckCircle2,
  Copy,
  Zap,
  Terminal
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORY_COLORS = {
  'F&B': '#F59E0B',
  'Souvenirs': '#EC4899',
  'Photo': '#8B5CF6'
};

export default function CustomerPortal({ 
  user, 
  token, 
  onLogout, 
  lastSseEvent, 
  onErrorTrigger 
}) {
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'rides', 'wallet', 'lockers', 'map', 'security'
  
  // Dashboard state
  const [dashboardData, setDashboardData] = useState(null);
  const [ridesData, setRidesData] = useState([]);
  const [walletHistory, setWalletHistory] = useState(null);
  const [lockersData, setLockersData] = useState(null);
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Land filter for rides
  const [selectedLand, setSelectedLand] = useState('All');

  // Booking modal state
  const [selectedRideForBooking, setSelectedRideForBooking] = useState(null);
  const [selectedSlotTime, setSelectedSlotTime] = useState('13:30:00');
  const [bookedBoardingPass, setBookedBoardingPass] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Coin splash animation state on SSE top-up
  const [coinSplash, setCoinSplash] = useState(false);
  const [recentDelta, setRecentDelta] = useState(null);

  // Live balance state
  const [currentBalance, setCurrentBalance] = useState(user?.walletBalance || 0);

  // RFID Band Details & Tap Test State
  const [currentBandUid, setCurrentBandUid] = useState(user?.bandUid || 'UID-A101');
  const [wristbandStatus, setWristbandStatus] = useState(user?.status || 'Active');
  const [isSimulatingTap, setIsSimulatingTap] = useState(false);
  const [tapTelemetry, setTapTelemetry] = useState(null);
  const [reportingLost, setReportingLost] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);

  // Account Activation state
  const [isPending, setIsPending] = useState(user?.status === 'Pending');
  const [activationCelebration, setActivationCelebration] = useState(false);
  const [activationData, setActivationData] = useState(null);

  // Headers with customer token
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // Initial Data Fetch
  const fetchDashboard = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/me/dashboard', { headers });
      const data = await res.json();
      if (res.status === 403 && data.accountPending) {
        setIsPending(true);
        return;
      }
      if (data.success) {
        setIsPending(false);
        setDashboardData(data);
        setCurrentBalance(data.user.walletBalance);
        if (data.user.bandUid) {
          setCurrentBandUid(data.user.bandUid);
        }
        if (data.user.status) {
          setWristbandStatus(data.user.status);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRides = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/me/rides', { headers });
      const data = await res.json();
      if (data.success) {
        setRidesData(data.rides);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchWallet = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/me/wallet/history', { headers });
      const data = await res.json();
      if (data.success) {
        setWalletHistory(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLockers = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/me/lockers', { headers });
      const data = await res.json();
      if (data.success) {
        setLockersData(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMap = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/me/map', { headers });
      const data = await res.json();
      if (data.success) {
        setMapData(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchDashboard(), fetchRides(), fetchWallet(), fetchLockers(), fetchMap()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, [user.bandId]);

  // Listen to live SSE events targeting this wristband
  useEffect(() => {
    if (!lastSseEvent) return;

    if (lastSseEvent.type === 'account_activated') {
      const payload = lastSseEvent.data;
      if (payload.bandId === user.bandId || payload.bandUid === user.bandUid) {
        setIsPending(false);
        setActivationData(payload);
        setActivationCelebration(true);
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });

        // Count up animation
        const target = parseFloat(payload.newBalance || payload.openingAmount || 500);
        let start = 0;
        const step = Math.max(10, target / 20);
        const timer = setInterval(() => {
          start += step;
          if (start >= target) {
            setCurrentBalance(target);
            clearInterval(timer);
          } else {
            setCurrentBalance(Math.floor(start));
          }
        }, 50);

        loadAll();
        setTimeout(() => setActivationCelebration(false), 9000);
      }
    } else if (lastSseEvent.type === 'wallet_updated') {
      const payload = lastSseEvent.data;
      if (payload.bandId === user.bandId) {
        setCurrentBalance(payload.newBalance);
        setRecentDelta(payload.delta);
        setCoinSplash(true);
        setTimeout(() => setCoinSplash(false), 3000);
        fetchDashboard();
        fetchWallet();
      }
    } else if (lastSseEvent.type === 'queue_updated') {
      fetchDashboard();
      fetchRides();
    } else if (lastSseEvent.type === 'locker_updated') {
      fetchDashboard();
      fetchLockers();
    } else if (lastSseEvent.type === 'wristband_reassigned') {
      const payload = lastSseEvent.data;
      if (payload.bandId === user.bandId || payload.visitorId === user.visitorId) {
        const newUid = payload.newBandUid || payload.bandUid;
        if (newUid) {
          setCurrentBandUid(newUid);
          user.bandUid = newUid;
        }
        fetchDashboard();
      }
    } else if (lastSseEvent.type === 'wristband_reported_lost') {
      const payload = lastSseEvent.data;
      if (payload.bandId === user.bandId) {
        setWristbandStatus('Lost');
        fetchDashboard();
      }
    }
  }, [lastSseEvent]);

  // Simulate Contactless RFID Tap (Audio Chime + Hardware Telemetry)
  const handleSimulateTap = () => {
    setIsSimulatingTap(true);
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.4);
      });
    } catch (e) {}

    setTapTelemetry({
      timestamp: new Date().toLocaleTimeString(),
      readerId: 'FRONT-GATE-TURNSTILE-01',
      frequency: '13.56 MHz HF',
      protocol: 'ISO/IEC 14443 Type A',
      status: wristbandStatus,
      balance: currentBalance,
      heightClearance: `${user.heightCm} cm (Full Access)`
    });

    setTimeout(() => setIsSimulatingTap(false), 900);
  };

  // Report Wristband Lost (Water Park Emergency Freeze)
  const handleReportLost = async () => {
    if (!window.confirm("Are you sure you want to report this RFID wristband as LOST? All wallet charges and lockers will be instantly frozen to protect your balance.")) return;
    setReportingLost(true);
    try {
      const res = await fetch('http://localhost:5000/api/me/wristband/report-lost', {
        method: 'POST',
        headers
      });
      const data = await res.json();
      if (!res.ok) {
        onErrorTrigger(data);
        return;
      }
      setWristbandStatus('Lost');
      alert(data.message || 'Wristband reported lost and frozen.');
      fetchDashboard();
    } catch (e) {
      alert(e.message);
    } finally {
      setReportingLost(false);
    }
  };

  const handleCopyUid = () => {
    navigator.clipboard.writeText(currentBandUid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  // Book Virtual Queue Pass
  const handleBookPass = async (ride, slotStart, slotEnd) => {
    setBookingLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/me/queue/book', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          attractionId: ride.Attraction_ID,
          slotStartTime: slotStart,
          slotEndTime: slotEnd
        })
      });
      const data = await res.json();

      if (!res.ok) {
        // Trigger the universal SQL constraint modal with query context
        onErrorTrigger(data);
        return;
      }

      // Success confetti animation
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });

      setSelectedRideForBooking(null);
      setBookedBoardingPass(data.pass || data.boardingPass);
      
      if (data.newBalance !== undefined) {
        setCurrentBalance(data.newBalance);
        setRecentDelta(-parseFloat(data.debitedAmount || ride.Ride_Price || 0));
        setCoinSplash(true);
        setTimeout(() => setCoinSplash(false), 3500);
      }

      fetchDashboard();
      fetchRides();
      fetchWallet();

    } catch (err) {
      alert('Network error while booking pass: ' + err.message);
    } finally {
      setBookingLoading(false);
    }
  };

  // Cancel Virtual Queue Pass
  const handleCancelPass = async (passId) => {
    if (!confirm('Are you sure you want to cancel this FastPass reservation?')) return;
    try {
      const res = await fetch('http://localhost:5000/api/me/queue/cancel', {
        method: 'POST',
        headers,
        body: JSON.stringify({ passId })
      });
      const data = await res.json();
      if (!res.ok) {
        onErrorTrigger(data);
        return;
      }
      fetchDashboard();
      fetchRides();
    } catch (e) {
      console.error(e);
    }
  };

  // Locker Rent
  const handleRentLocker = async (lockerId) => {
    try {
      const res = await fetch('http://localhost:5000/api/me/lockers/rent', {
        method: 'POST',
        headers,
        body: JSON.stringify({ lockerId })
      });
      const data = await res.json();
      if (!res.ok) {
        onErrorTrigger(data);
        return;
      }
      fetchLockers();
      fetchDashboard();
    } catch (e) {
      console.error(e);
    }
  };

  // Locker Release
  const handleReleaseLocker = async (rentalId) => {
    if (!confirm('Release this locker? Please ensure your belongings are collected.')) return;
    try {
      const res = await fetch('http://localhost:5000/api/me/lockers/release', {
        method: 'POST',
        headers,
        body: JSON.stringify({ rentalId })
      });
      const data = await res.json();
      if (!res.ok) {
        onErrorTrigger(data);
        return;
      }
      fetchLockers();
      fetchDashboard();
    } catch (e) {
      console.error(e);
    }
  };

  // Security Spy Demonstration test
  const [spyResult, setSpyResult] = useState(null);
  const handleSecuritySpyTest = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/me/spy-other-visitor?targetBandId=99', { headers });
      const data = await res.json();
      setSpyResult({ status: res.status, data });
    } catch (e) {
      setSpyResult({ status: 500, data: { message: e.message } });
    }
  };

  // Extract unique park lands for filtering
  const parkLands = ['All', ...new Set(ridesData.map(r => r.Park_Land || 'Wonderla Resort').filter(Boolean))];

  const filteredRides = ridesData.filter(r => {
    if (selectedLand === 'All') return true;
    return (r.Park_Land || 'Wonderla Resort') === selectedLand;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-sky-50 text-slate-800 pb-24">
      
      {/* Floating Fairy Dust Ambient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 right-1/4 w-[500px] h-[500px] bg-sky-200/30 rounded-full blur-[100px]" />
        <div className="absolute top-1/3 left-10 w-[400px] h-[400px] bg-blue-200/20 rounded-full blur-[90px]" />
        <div className="absolute top-20 right-20 text-amber-400 text-xl animate-sparkle">✨</div>
        <div className="absolute top-64 left-16 text-sky-400 text-lg animate-sparkle" style={{ animationDelay: '1.2s' }}>⭐</div>
      </div>

      {/* Celebration Banner upon SSE Live Activation */}
      <AnimatePresence>
        {activationCelebration && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-emerald-600 to-sky-600 text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 border border-emerald-300"
          >
            <Sparkles className="w-8 h-8 text-amber-300 animate-spin" />
            <div>
              <div className="font-extrabold text-base">Account Activated by Park Staff!</div>
              <div className="text-xs text-emerald-100">
                Opening float allotted: <span className="font-bold text-amber-300">₹{currentBalance.toFixed(2)}</span> · All attractions and lockers unlocked!
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* If Account is in Pending Activation, show locked screen with animation */}
      {isPending ? (
        <div className="relative z-10 max-w-3xl mx-auto px-4 pt-10 pb-20 text-center font-sans">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-8 sm:p-12 rounded-3xl bg-white border border-amber-200 shadow-2xl shadow-amber-500/10 space-y-6"
          >
            {/* Animated Lock Icon */}
            <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="w-24 h-24 rounded-3xl bg-amber-50 border-2 border-amber-300 flex items-center justify-center shadow-inner"
              >
                <Lock className="w-12 h-12 text-amber-500" />
              </motion.div>
              <div className="absolute inset-0 rounded-3xl border-2 border-amber-400 animate-ping opacity-25 pointer-events-none" />
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="px-3.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-xs font-mono font-bold tracking-wider uppercase animate-pulse">
                ⏳ Pending Activation
              </span>
              <span className="px-3.5 py-1 rounded-full bg-sky-50 text-[#0072ce] border border-sky-200 text-xs font-mono font-bold">
                Wristband: {user.bandUid}
              </span>
            </div>

            <div>
              <h2 className="text-3xl font-extrabold text-[#002244]">
                Account Pending Opening Float
              </h2>
              <p className="text-base text-slate-600 font-medium max-w-lg mx-auto mt-2">
                "Visit a Top-up Counter. Staff will allot your opening amount."
              </p>
            </div>

            {/* Details Box */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs font-mono space-y-2 max-w-md mx-auto">
              <div className="flex justify-between">
                <span className="text-slate-500">Visitor Name:</span>
                <span className="font-bold text-slate-800">{user.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Registered Height:</span>
                <span className="font-bold text-slate-800">{user.heightCm} cm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current Balance:</span>
                <span className="font-bold text-amber-600">₹0.00</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-[11px] text-slate-500">
                <span>Relational Safety Guard:</span>
                <span className="text-indigo-600 font-bold">trg_block_unactivated_*</span>
              </div>
            </div>

            {/* Live SSE Listening Status */}
            <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-[#0072ce] flex items-center justify-center gap-2 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-ping" />
              <span>Listening live for counter activation... This screen will unlock automatically!</span>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={fetchDashboard}
                className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold transition-all shadow-sm"
              >
                🔄 Refresh Status
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all shadow-sm"
              >
                Log Out
              </button>
            </div>
          </motion.div>
        </div>
      ) : (
        <>
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* Top Visitor Identity & Navigation Tabs */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-sky-100 shadow-xl shadow-sky-100/70 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#0072ce] to-sky-400 flex items-center justify-center p-0.5 shadow-lg shadow-sky-500/20">
                <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                  <Radio className="w-8 h-8 text-[#0072ce] animate-pulse" />
                </div>
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-sm" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold font-display text-[#002244]">
                  {user.fullName}
                </h1>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-sky-50 text-[#0072ce] border border-sky-200 font-bold flex items-center gap-1">
                  <Radio className="w-3 h-3" />
                  {currentBandUid}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Height Profile: <span className="text-[#0072ce] font-bold">{user.heightCm} cm</span> · Band Status: <span className={`font-bold ${wristbandStatus === 'Active' ? 'text-emerald-600' : 'text-rose-600'}`}>{wristbandStatus}</span> · Wallet: <span className="text-amber-600 font-bold">₹{currentBalance.toFixed(2)}</span>
              </p>
            </div>
          </div>

          {/* Navigation Tabs (Disney World Style Pill Bar) */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto text-xs font-semibold">
            <button
              onClick={() => setActiveTab('home')}
              className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'home'
                  ? 'bg-[#0072ce] text-white font-bold shadow-md shadow-sky-500/30'
                  : 'text-slate-600 hover:text-[#0072ce] hover:bg-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Wristband Home
            </button>

            <button
              onClick={() => setActiveTab('rfid')}
              className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'rfid'
                  ? 'bg-[#0072ce] text-white font-bold shadow-md shadow-sky-500/30'
                  : 'text-slate-600 hover:text-[#0072ce] hover:bg-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              Unique RFID Pass
            </button>

            <button
              onClick={() => setActiveTab('rides')}
              className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'rides'
                  ? 'bg-[#0072ce] text-white font-bold shadow-md shadow-sky-500/30'
                  : 'text-slate-600 hover:text-[#0072ce] hover:bg-white'
              }`}
            >
              <Ticket className="w-3.5 h-3.5" />
              18 Rides & FastPass
            </button>

            <button
              onClick={() => setActiveTab('wallet')}
              className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'wallet'
                  ? 'bg-[#0072ce] text-white font-bold shadow-md shadow-sky-500/30'
                  : 'text-slate-600 hover:text-[#0072ce] hover:bg-white'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              Wallet & History
            </button>

            <button
              onClick={() => setActiveTab('lockers')}
              className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'lockers'
                  ? 'bg-[#0072ce] text-white font-bold shadow-md shadow-sky-500/30'
                  : 'text-slate-600 hover:text-[#0072ce] hover:bg-white'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              Lockers
            </button>

            <button
              onClick={() => setActiveTab('map')}
              className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'map'
                  ? 'bg-[#0072ce] text-white font-bold shadow-md shadow-sky-500/30'
                  : 'text-slate-600 hover:text-[#0072ce] hover:bg-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Park Map
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'security'
                  ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-200'
                  : 'text-rose-600 hover:bg-rose-50'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Security Check (403)
            </button>
          </div>

        </div>

        {/* Live SSE Top-up Splash Notification */}
        <AnimatePresence>
          {coinSplash && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 shadow-xl flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <Coins className="w-6 h-6 animate-bounce" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Real-Time Wallet Credit Received via SSE!</h4>
                  <p className="text-xs text-emerald-700">
                    +{recentDelta} added. New Closing Balance: <strong>₹{currentBalance.toFixed(2)}</strong>
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-100/80 px-2.5 py-1 rounded-lg">
                LIVE SYNC OK
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ======================================================== */}
        {/* TAB 1: WRISTBAND HOME / DASHBOARD OVERVIEW */}
        {/* ======================================================== */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Prepaid Contactless Wallet Card */}
              <div className="rounded-3xl p-6 bg-white border border-sky-100 shadow-xl shadow-sky-100/60 relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-32 h-32 bg-sky-50 rounded-full blur-2xl pointer-events-none" />

                <div>
                  <div className="flex items-center justify-between text-xs font-mono text-slate-500 mb-2">
                    <span className="font-bold uppercase tracking-wider">CONTACTLESS WALLET</span>
                    <Coins className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-4xl font-extrabold font-mono text-[#002244] mt-1">
                    ₹{currentBalance.toFixed(2)}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    NFC contactless payment accepted across all F&B counters and souvenir outlets.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-mono text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Zero Overdraw Enforced
                  </span>
                  <button
                    onClick={() => setActiveTab('wallet')}
                    className="text-xs text-[#0072ce] hover:underline font-bold"
                  >
                    View History →
                  </button>
                </div>
              </div>

              {/* Digital MagicBand Profile Card */}
              <div className="rounded-3xl p-6 bg-white border border-sky-100 shadow-xl shadow-sky-100/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-mono text-slate-500 mb-2">
                    <span className="font-bold uppercase tracking-wider">UNIQUE RFID WRISTBAND</span>
                    <Radio className="w-4 h-4 text-[#0072ce]" />
                  </div>
                  <h3 className="text-2xl font-extrabold text-[#002244] mt-1">
                    {user.fullName}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Registered Height: <strong className="text-[#0072ce]">{user.heightCm} cm</strong>
                  </p>
                </div>

                <div className="mt-4 p-3.5 rounded-2xl bg-sky-50/70 border border-sky-100 text-xs font-mono space-y-1">
                  <div className="text-slate-600 flex items-center justify-between">
                    <span>UID: <strong className="text-[#0072ce]">{currentBandUid}</strong></span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      wristbandStatus === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>{wristbandStatus}</span>
                  </div>
                  <div className="text-slate-600">Thrill Safety: <span className="text-emerald-700 font-bold">{parseFloat(user.heightCm) >= 140 ? 'Full Thrill Rider (140cm+)' : 'Family & Supervised Rider'}</span></div>
                  <div className="text-slate-600">Hardware Chip: <span className="text-amber-700 font-bold">13.56 MHz RFID / NFC</span></div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    1:1 Unique Wristband
                  </span>
                  <button
                    onClick={() => setActiveTab('rfid')}
                    className="text-xs text-[#0072ce] hover:underline font-bold flex items-center gap-1"
                  >
                    <span>Manage RFID Pass</span> →
                  </button>
                </div>
              </div>

              {/* Active Locker Quick Card */}
              <div className="rounded-3xl p-6 bg-white border border-sky-100 shadow-xl shadow-sky-100/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-mono text-slate-500 mb-2">
                    <span className="font-bold uppercase tracking-wider">KEYLESS LOCKER ACCESS</span>
                    <Lock className="w-4 h-4 text-[#0072ce]" />
                  </div>

                  {dashboardData?.activeLocker ? (
                    <div className="mt-2 p-4 rounded-2xl bg-sky-50 border border-sky-200">
                      <span className="text-xs text-[#0072ce] font-bold block uppercase">Assigned Locker</span>
                      <div className="text-3xl font-extrabold font-mono text-[#002244] mt-1">
                        {dashboardData.activeLocker.Number}
                      </div>
                      <span className="text-xs text-slate-600 block mt-1">
                        Zone: {dashboardData.activeLocker.Zone}
                      </span>
                      <button
                        onClick={() => handleReleaseLocker(dashboardData.activeLocker.Rental_ID)}
                        className="mt-3 w-full py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold transition-colors border border-rose-200"
                      >
                        Release Locker
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                      <Key className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-xs text-slate-500">No active locker rented right now.</p>
                      <button
                        onClick={() => setActiveTab('lockers')}
                        className="mt-3 px-4 py-1.5 rounded-xl bg-[#0072ce] hover:bg-[#0284c7] text-white text-xs font-bold shadow-sm transition-colors"
                      >
                        Rent a Locker
                      </button>
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-slate-400 font-mono mt-4">
                  Tap wristband against physical locker door sensor to unlock.
                </div>
              </div>

            </div>

            {/* Active Virtual Queue Passes Timeline */}
            <div className="rounded-3xl p-6 sm:p-8 bg-white border border-sky-100 shadow-xl shadow-sky-100/60">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-extrabold text-[#002244] flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-[#0072ce]" />
                    My Active Virtual Queue FastPasses
                  </h3>
                  <p className="text-xs text-slate-500">
                    Skip standby queues. The relational database trigger blocks overlapping reservations.
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('rides')}
                  className="px-4 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-[#0072ce] text-xs font-bold border border-sky-200 transition-colors"
                >
                  + Book Another FastPass (18 Rides)
                </button>
              </div>

              {dashboardData?.activePasses?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dashboardData.activePasses.map((p) => (
                    <div 
                      key={p.Pass_ID}
                      className="p-5 rounded-2xl bg-gradient-to-r from-sky-50 to-white border border-sky-200 shadow-md flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2 text-xs font-mono text-[#0072ce] font-bold">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Slot: {p.Slot_Start_Time} - {p.Slot_End_Time}</span>
                        </div>
                        <h4 className="text-lg font-extrabold text-[#002244] mt-1">
                          {p.Attraction_Name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                          <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 font-mono text-[10px] font-bold">
                            {p.Attraction_Category}
                          </span>
                          <span className="text-emerald-700 font-mono text-[11px] font-bold">
                            FastPass #{p.Pass_ID} Confirmed
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <button
                          onClick={() => setBookedBoardingPass(p)}
                          className="p-2.5 rounded-xl bg-white text-[#0072ce] hover:bg-sky-50 transition-colors border border-sky-200 shadow-sm"
                          title="View Digital QR Boarding Pass"
                        >
                          <QrCode className="w-5 h-5" />
                        </button>

                        <button
                          onClick={() => handleCancelPass(p.Pass_ID)}
                          className="text-[11px] font-mono text-slate-400 hover:text-rose-600 transition-colors font-semibold"
                        >
                          Cancel Pass
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center rounded-2xl bg-sky-50/50 border border-sky-100">
                  <Ticket className="w-10 h-10 text-sky-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-600">You don't hold any active virtual queue passes.</p>
                  <button
                    onClick={() => setActiveTab('rides')}
                    className="mt-3 px-5 py-2.5 rounded-2xl bg-[#0072ce] hover:bg-[#0284c7] text-white font-bold text-xs shadow-md shadow-sky-500/20 transition-all hover:scale-105"
                  >
                    Browse 18 Rides & Book FastPass
                  </button>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB: MY UNIQUE RFID WRISTBAND & NFC DIGITAL PASS */}
        {/* ======================================================== */}
        {activeTab === 'rfid' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            
            {/* Header */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-sky-100 shadow-xl shadow-sky-100/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#0072ce] border border-sky-200 flex items-center justify-center shadow-sm">
                    <Radio className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-extrabold text-[#002244]">
                      My Unique RFID Wristband
                    </h2>
                    <p className="text-xs text-slate-500">
                      Waterproof Smart Band · Contactless Identity, Digital Wallet & Keyless Locker Key
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono border ${
                  wristbandStatus === 'Active'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : wristbandStatus === 'Lost'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  ● {wristbandStatus.toUpperCase()}
                </span>
                <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                  Band ID #{user.bandId}
                </span>
              </div>
            </div>

            {/* Main Wristband Showcase Card */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Visual Physical MagicBand */}
              <div className="md:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-sky-100 shadow-xl shadow-sky-100/60 space-y-6">
                
                {/* Visual MagicBand Body */}
                <div className="relative p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-[#002244] to-slate-900 text-white shadow-2xl overflow-hidden border border-sky-500/30">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

                  {/* Top Bar of Band */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-400" />
                      <span className="font-serif font-black tracking-wider text-sm uppercase">Smart Theme Park Pass</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 font-bold">
                      13.56 MHz NFC
                    </span>
                  </div>

                  {/* Center RFID Puck with Interactive Tap */}
                  <div className="flex items-center gap-5 my-3">
                    <div 
                      onClick={handleSimulateTap}
                      className="relative cursor-pointer group"
                      title="Click to Simulate Physical Contactless Tap!"
                    >
                      {isSimulatingTap && (
                        <div className="absolute -inset-4 rounded-full bg-sky-400/40 animate-ping pointer-events-none" />
                      )}
                      <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl border-2 transition-all ${
                        isSimulatingTap 
                          ? 'border-emerald-400 bg-emerald-600 scale-105 shadow-emerald-500/50' 
                          : 'border-sky-400 bg-[#0072ce] group-hover:scale-105 shadow-sky-500/30'
                      }`}>
                        <Radio className={`w-9 h-9 text-white ${isSimulatingTap ? 'animate-bounce' : 'group-hover:rotate-12 transition-transform'}`} />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-mono text-sky-300 block uppercase tracking-wider">
                        Laser-Engraved Band UID
                      </span>
                      <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight flex items-center gap-2 mt-0.5">
                        <span className="text-white truncate">{currentBandUid}</span>
                        <button
                          type="button"
                          onClick={handleCopyUid}
                          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sky-200 transition-colors text-xs flex-shrink-0"
                          title="Copy Unique Band UID"
                        >
                          {copiedUid ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-300 font-sans mt-1">
                        Assigned to: <strong>{user.fullName}</strong> ({user.heightCm} cm)
                      </p>
                    </div>
                  </div>

                  {/* Bottom Strip of Card */}
                  <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                    <div>
                      <span className="text-slate-400 text-[10px] block">LIVE BALANCE</span>
                      <span className="font-bold text-amber-300 text-sm">₹{currentBalance.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">ACTIVE LOCKER</span>
                      <span className="font-bold text-sky-300 text-sm">
                        {dashboardData?.activeLocker ? `#${dashboardData.activeLocker.Number} (${dashboardData.activeLocker.Zone})` : 'None Rented'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleSimulateTap}
                      className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs transition-colors flex items-center gap-1 shadow-md"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Test Tap</span>
                    </button>
                  </div>
                </div>

                {/* Hardware Specifications Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase block font-sans font-bold">Chip Architecture</span>
                    <strong className="text-slate-700 text-xs mt-0.5 block">NXP MIFARE Ultralight EV1</strong>
                    <span className="text-[10px] text-slate-500">13.56 MHz ISO/IEC 14443A</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase block font-sans font-bold">Submersible Rating</span>
                    <strong className="text-emerald-700 text-xs mt-0.5 block flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> IP68 100% Waterproof
                    </strong>
                    <span className="text-[10px] text-slate-500">Wave Pool & Drop Slide Safe</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase block font-sans font-bold">Security Binding</span>
                    <strong className="text-slate-700 text-xs mt-0.5 block">Bcrypt PIN Hash Protected</strong>
                    <span className="text-[10px] text-slate-500">Zero plain-text storage</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase block font-sans font-bold">Database Mapping</span>
                    <strong className="text-[#0072ce] text-xs mt-0.5 block">1:1 Visitor Relation</strong>
                    <span className="text-[10px] text-slate-500">MySQL UNIQUE(Band_UID)</span>
                  </div>
                </div>

              </div>

              {/* Right Column: Tap Telemetry & Loss Protection */}
              <div className="md:col-span-5 space-y-6">
                
                {/* Telemetry Output Box */}
                <div className="p-6 rounded-3xl bg-slate-900 border border-sky-500/30 text-white shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="text-xs font-mono font-bold text-sky-400 flex items-center gap-1.5">
                      <Terminal className="w-4 h-4" />
                      NFC SENSOR TELEMETRY
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      ONLINE
                    </span>
                  </div>

                  {tapTelemetry ? (
                    <div className="space-y-2 text-xs font-mono text-slate-300">
                      <div className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        CONTACTLESS RFID READ OK ({tapTelemetry.timestamp})
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-[11px]">
                        <div><span className="text-slate-500">Reader:</span> <span className="text-sky-300">{tapTelemetry.readerId}</span></div>
                        <div><span className="text-slate-500">Tag UID:</span> <strong className="text-white">{currentBandUid}</strong></div>
                        <div><span className="text-slate-500">Signal:</span> <span className="text-amber-400">-42 dBm (Strong)</span></div>
                        <div><span className="text-slate-500">Balance:</span> <strong className="text-emerald-400">₹{tapTelemetry.balance.toFixed(2)}</strong></div>
                        <div><span className="text-slate-500">Height:</span> <span className="text-white">{tapTelemetry.heightClearance}</span></div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-400 space-y-2 font-mono text-xs">
                      <Radio className="w-8 h-8 text-sky-400/50 mx-auto animate-pulse" />
                      <p>Tap the center puck or click "Test Tap" to simulate holding your wristband against a park turnstile sensor.</p>
                    </div>
                  )}
                </div>

                {/* Water Park Lost Wristband Protection Protocol */}
                <div className="p-6 rounded-3xl bg-amber-50/80 border border-amber-200 shadow-lg space-y-3">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                    <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <h4>Water Park Loss Protection</h4>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Slipped off in the Wave Pool or High-Speed Slides? Unlike cash, your funds and lockers are protected in MySQL. Freeze your band below; staff at Counter #1 can assign a replacement band instantly.
                  </p>

                  {wristbandStatus === 'Lost' ? (
                    <div className="p-3 rounded-2xl bg-rose-100 border border-rose-300 text-rose-800 text-xs font-mono font-bold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                      <span>This wristband is FROZEN (Reported Lost). Visit Counter #1 for a replacement.</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleReportLost}
                      disabled={reportingLost}
                      className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>{reportingLost ? 'Freezing Account...' : 'Report Band Lost / Freeze Account'}</span>
                    </button>
                  )}
                </div>

              </div>

            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: RIDES & FASTPASS TIMELINE (ALL 18 RIDES) */}
        {/* ======================================================== */}
        {activeTab === 'rides' && (
          <div className="space-y-6">
            
            {/* Header & Land Filter */}
            <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-xl shadow-sky-100/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold text-[#002244] flex items-center gap-2">
                  <Ticket className="w-6 h-6 text-[#0072ce]" />
                  Disney World & Wonderla Attractions ({ridesData.length} Rides)
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Personalized height safety eligibility is verified automatically against your profile ({user.heightCm} cm).
                </p>
              </div>

              {/* Park Land Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Lands:
                </span>
                {parkLands.map(land => (
                  <button
                    key={land}
                    type="button"
                    onClick={() => setSelectedLand(land)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                      selectedLand === land
                        ? 'bg-[#0072ce] text-white shadow-md shadow-sky-500/30'
                        : 'bg-slate-100 text-slate-600 hover:bg-sky-50 hover:text-[#0072ce]'
                    }`}
                  >
                    {land}
                  </button>
                ))}
              </div>
            </div>

            {/* Ride Cards Grid (18 Rides from Wonderla & Disney World) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRides.map((ride) => (
                <div
                  key={ride.Attraction_ID}
                  className={`rounded-3xl bg-white border overflow-hidden shadow-lg hover:shadow-2xl transition-all flex flex-col justify-between ${
                    ride.isEligible ? 'border-sky-100 hover:border-[#0072ce]' : 'border-rose-200 bg-rose-50/20'
                  }`}
                >
                  {/* Ride Image Header */}
                  <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                    <img 
                      src={ride.Image_URL || 'https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?auto=format&fit=crop&w=800&q=80'} 
                      alt={ride.Attraction_Name}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                    
                    {/* Land pill tag */}
                    <div className="absolute top-3 left-3 bg-[#002244]/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/20">
                      {ride.Park_Land || 'Wonderla Resort'}
                    </div>

                    {/* Price & Wait Time Badges */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      <div className="bg-amber-400/95 backdrop-blur-md text-[#002244] text-xs font-extrabold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 border border-amber-300">
                        <span>₹{parseFloat(ride.Ride_Price || 150).toFixed(0)}</span>
                      </div>
                      <div className="bg-white/95 backdrop-blur-md text-[#002244] text-xs font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 border border-sky-100">
                        <Clock className="w-3.5 h-3.5 text-[#0072ce]" />
                        <span>{ride.Estimated_Wait_Min}m wait</span>
                      </div>
                    </div>

                    {/* Category Overlay */}
                    <div className="absolute bottom-3 left-3">
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white/95 text-slate-800 shadow-sm border border-slate-200">
                        {ride.Category} · {ride.Thrill_Level}
                      </span>
                    </div>
                  </div>

                  {/* Ride Details Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xl font-extrabold text-[#002244]">
                        {ride.Attraction_Name}
                      </h3>

                      {/* Height Safety Check Badge */}
                      <div className={`mt-3 p-3 rounded-2xl text-xs font-mono flex items-start gap-2 border ${
                        ride.isEligible
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-rose-50 border-rose-200 text-rose-800'
                      }`}>
                        {ride.isEligible ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                        )}
                        <div>
                          <span className="font-bold block">
                            {ride.isEligible ? "Rider Height Cleared!" : "Height Safety Restricted"}
                          </span>
                          <span className="text-[11px] text-slate-500 block mt-0.5">
                            Required: {ride.Min_Height_cm} - {ride.Max_Height_cm} cm (You are {user.heightCm} cm)
                          </span>
                        </div>
                      </div>

                      {/* Virtual Queue Congestion Load */}
                      <div className="mt-4">
                        <div className="flex justify-between text-[11px] font-mono text-slate-500 mb-1">
                          <span>Live Capacity ({ride.Active_Booked_Passes} booked)</span>
                          <span className="text-[#0072ce] font-bold">{ride.Congestion_Status}</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-sky-400 to-[#0072ce] rounded-full"
                            style={{ width: `${Math.min(100, (ride.Active_Booked_Passes / (ride.Capacity_Per_Slot || 40)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* FastPass Booking CTA */}
                    <div className="mt-6 pt-4 border-t border-slate-100">
                      {ride.hasActivePass ? (
                        <div className="flex items-center justify-between text-xs font-mono text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                          <span className="font-bold">Active FastPass Booked</span>
                          <button
                            onClick={() => setBookedBoardingPass(ride.activePass)}
                            className="underline font-bold text-[#0072ce] hover:text-[#002244]"
                          >
                            View Pass
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectedRideForBooking(ride)}
                          disabled={!ride.isEligible}
                          className={`w-full py-2.5 rounded-2xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 ${
                            ride.isEligible
                              ? 'bg-[#0072ce] hover:bg-[#0284c7] text-white shadow-sky-500/25'
                              : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                          }`}
                        >
                          {ride.isEligible ? (
                            <>
                              <span>⚡ Reserve FastPass</span>
                              <span className="opacity-90 font-mono font-semibold">· ₹{parseFloat(ride.Ride_Price || 150).toFixed(0)}</span>
                            </>
                          ) : (
                            'Denied by Height Safety Rule'
                          )}
                        </button>
                      )}
                    </div>

                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: WALLET & TRANSACTION HISTORY */}
        {/* ======================================================== */}
        {activeTab === 'wallet' && (
          <div className="space-y-6">
            
            {/* Top Cards: Balance & Spend Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="p-6 rounded-3xl bg-white border border-sky-100 shadow-xl shadow-sky-100/60">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">PREPAID RFID BALANCE</span>
                <div className="text-4xl font-extrabold font-mono text-[#002244] mt-2">
                  ₹{currentBalance.toFixed(2)}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Contactless payment supported at all park F&B counters, Souvenir shops, and photo booths.
                </p>
                <div className="mt-4 pt-4 border-t border-slate-100 text-xs font-semibold text-amber-600 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  Top-up at Main Entrance Cashier Counter or Admin Portal
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-sky-100 shadow-xl shadow-sky-100/60">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">TOTAL PARK SPEND</span>
                <div className="text-4xl font-extrabold font-mono text-rose-600 mt-2">
                  ₹{walletHistory?.totalSpent?.toFixed(2) || '0.00'}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Aggregate purchases recorded on this RFID wristband.
                </p>
              </div>

              {/* Spending by Category Donut */}
              <div className="p-6 rounded-3xl bg-white border border-sky-100 shadow-xl shadow-sky-100/60 flex flex-col justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">SPEND BY OUTLET CATEGORY</span>
                
                <div className="h-28 flex items-center justify-center">
                  {walletHistory?.spendingByCategory?.some(c => c.value > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={walletHistory.spendingByCategory}
                          innerRadius={25}
                          outerRadius={45}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {walletHistory.spendingByCategory.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || '#0072ce'} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <span className="text-xs font-mono text-slate-400">No purchases yet</span>
                  )}
                </div>

                <div className="flex justify-center gap-3 text-[10px] font-mono text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> F&B</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-500" /> Souvenirs</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /> Photo</span>
                </div>
              </div>

            </div>

            {/* Transaction Timeline */}
            <div className="rounded-3xl p-6 sm:p-8 bg-white border border-sky-100 shadow-xl shadow-sky-100/60">
              <h3 className="text-xl font-extrabold text-[#002244] mb-4 flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-500" />
                Ledger Transaction History
              </h3>

              <div className="space-y-3 divide-y divide-slate-100">
                {walletHistory?.transactions?.length > 0 ? (
                  walletHistory.transactions.map((tx) => (
                    <div key={tx.Transaction_ID} className="pt-3 first:pt-0 flex items-center justify-between text-xs font-mono">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                            tx.Transaction_Type === 'Top-up'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {tx.Transaction_Type}
                          </span>
                          <span className="text-[#002244] font-bold text-sm">
                            {tx.Outlet_Name || 'Front Desk Top-up Counter'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          {new Date(tx.Transaction_Time).toLocaleString()} · Txn #{tx.Transaction_ID}
                        </span>
                      </div>

                      <div className="text-right">
                        <div className={`text-base font-bold ${
                          tx.Transaction_Type === 'Top-up' ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {tx.Transaction_Type === 'Top-up' ? '+' : '-'}₹{parseFloat(tx.Amount).toFixed(2)}
                        </div>
                        <span className="text-[10px] text-slate-500">
                          Closing Balance: ₹{parseFloat(tx.Closing_Balance).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-slate-400 text-xs font-mono">
                    No transactions recorded for this wristband yet.
                  </div>
                )}
              </div>
            </div>

          </div>
        )}



        {/* ======================================================== */}
        {/* TAB 4: SMART LOCKERS */}
        {/* ======================================================== */}
        {activeTab === 'lockers' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-xl shadow-sky-100/60">
              <h2 className="text-2xl font-extrabold text-[#002244] flex items-center gap-2">
                <Lock className="w-6 h-6 text-[#0072ce]" />
                Keyless Smart Lockers
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                One locker per wristband is strictly enforced by MySQL stored procedure sp_rent_locker.
              </p>
            </div>

            {lockersData?.myLocker && (
              <div className="p-6 rounded-3xl bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 shadow-md flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono text-[#0072ce] font-bold block">
                    CURRENTLY RENTED BY YOU
                  </span>
                  <div className="text-2xl font-extrabold text-[#002244] mt-1">
                    Locker {lockersData.myLocker.Number} ({lockersData.myLocker.Zone})
                  </div>
                  <span className="text-xs text-slate-500 font-mono">
                    Unlocked with your wristband UID {user.bandUid}
                  </span>
                </div>

                <button
                  onClick={() => handleReleaseLocker(lockersData.myLocker.Rental_ID)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all shadow-md shadow-rose-200"
                >
                  Release Locker
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {lockersData?.lockers?.map((locker) => (
                <div 
                  key={locker.Locker_ID}
                  className={`p-6 rounded-3xl border text-center transition-all shadow-md ${
                    locker.Is_My_Locker
                      ? 'bg-sky-50 border-[#0072ce] shadow-sky-200/50'
                      : locker.Is_Available
                        ? 'bg-white border-slate-200 hover:border-sky-300'
                        : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-400 uppercase">{locker.Zone}</div>
                  <div className="text-3xl font-extrabold font-mono text-[#002244] my-2">
                    {locker.Number}
                  </div>

                  {locker.Is_My_Locker ? (
                    <span className="text-xs font-mono text-[#0072ce] font-bold block">
                      Your Locker
                    </span>
                  ) : locker.Is_Available ? (
                    <button
                      onClick={() => handleRentLocker(locker.Locker_ID)}
                      disabled={!!lockersData?.myLocker}
                      className={`w-full py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                        lockersData?.myLocker
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {lockersData?.myLocker ? '1 Locker Max' : 'Rent Now'}
                    </button>
                  ) : (
                    <span className="text-xs font-mono text-rose-500 font-semibold block">
                      Occupied
                    </span>
                  )}
                </div>
              ))}
            </div>

          </div>
        )}



        {/* ======================================================== */}
        {/* TAB 5: INTERACTIVE PARK MAP */}
        {/* ======================================================== */}
        {activeTab === 'map' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-xl shadow-sky-100/60">
              <h2 className="text-2xl font-extrabold text-[#002244] flex items-center gap-2">
                <Compass className="w-6 h-6 text-[#0072ce]" />
                Interactive Resort Lands & Crowd Density
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Visual heatmaps show live zone density across Disney World & Wonderla lands.
              </p>
            </div>

            <div className="rounded-3xl p-6 sm:p-8 bg-white border border-sky-100 shadow-xl shadow-sky-100/60">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Zone Cards */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-500 block mb-2 uppercase tracking-wider">RESORT LANDS & CROWD STATUS</span>
                  {mapData?.zones?.map(z => (
                    <div 
                      key={z.id}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: z.color }} />
                        <div>
                          <h4 className="text-sm font-bold text-[#002244]">{z.name}</h4>
                          <span className="text-[11px] text-slate-500 font-mono">Live Crowd Density</span>
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                        z.heat === 'High' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        z.heat === 'Moderate' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {z.heat} Crowd
                      </span>
                    </div>
                  ))}
                </div>

                {/* Amenities & Outlets */}
                <div className="space-y-4">
                  <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">KEY AMENITIES IN PARK</span>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-xs font-bold text-[#0072ce] font-mono block mb-2">POS OUTLETS (WALLET ENABLED)</span>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      {mapData?.outlets?.map(o => (
                        <div key={o.Outlet_ID} className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-sm">
                          <div className="font-bold text-[#002244] truncate">{o.Outlet_Name}</div>
                          <div className="text-[10px] text-amber-600 font-bold">{o.Type}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-xs font-bold text-indigo-700 font-mono block mb-2">SMART LOCKER HUBS</span>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      {mapData?.lockers?.map((l, i) => (
                        <div key={i} className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-sm">
                          <div className="font-bold text-[#002244]">{l.Zone}</div>
                          <div className="text-[10px] text-emerald-600 font-bold">{l.Total - l.Occupied} Free / {l.Total} Total</div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>
            </div>

          </div>
        )}



        {/* ======================================================== */}
        {/* TAB 6: SECURITY CHECK (403 PROOF) */}
        {/* ======================================================== */}
        {activeTab === 'security' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="p-6 sm:p-8 rounded-3xl bg-white border border-rose-200 shadow-xl shadow-rose-50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-200">
                  <ShieldAlert className="w-6 h-6 flex-shrink-0" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-[#002244]">
                    Access Control & Visitor Data Isolation Proof
                  </h3>
                  <p className="text-xs text-rose-700">
                    Proves that a visitor's JWT strictly isolates data access and attempts to inspect another visitor's data return HTTP 403 Forbidden.
                  </p>
                </div>
              </div>

              <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-700 space-y-2">
                <div><span className="text-slate-400">Your Authenticated Band ID: </span><span className="text-[#0072ce] font-bold">{user.bandId} ({user.bandUid})</span></div>
                <div><span className="text-slate-400">Attacking Query: </span><span className="text-amber-600 font-bold">GET /api/me/spy-other-visitor?targetBandId=99</span></div>
              </div>

              <button
                onClick={handleSecuritySpyTest}
                className="mt-4 px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-mono text-xs font-bold transition-all shadow-md shadow-rose-200"
              >
                Execute Unauthorized Cross-Visitor Request
              </button>

              {spyResult && (
                <div className={`mt-4 p-4 rounded-2xl border font-mono text-xs ${
                  spyResult.status === 403 
                    ? 'bg-rose-50 border-rose-300 text-rose-800' 
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}>
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px]">
                      HTTP {spyResult.status} FORBIDDEN
                    </span>
                    <span>Server Security Guard Activated</span>
                  </div>
                  <pre className="mt-2 text-[11px] whitespace-pre-wrap text-rose-900 overflow-x-auto bg-white p-3 rounded-xl border border-rose-200">
                    {JSON.stringify(spyResult.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}



      </div>

      {/* ======================================================== */}
      {/* MODAL: TIME SLOT PICKER FOR VIRTUAL QUEUE */}
      {/* ======================================================== */}
      <AnimatePresence>
        {selectedRideForBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white border border-sky-200 rounded-3xl shadow-2xl p-6 sm:p-8"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-xs font-bold text-[#0072ce] block uppercase tracking-wider">
                    RESERVE FASTPASS VIRTUAL QUEUE
                  </span>
                  <h3 className="text-2xl font-extrabold text-[#002244] mt-0.5">
                    {selectedRideForBooking.Attraction_Name}
                  </h3>
                </div>

                <button
                  onClick={() => setSelectedRideForBooking(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="my-4 p-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-[#002244] font-medium flex items-center gap-2">
                <Info className="w-4 h-4 text-[#0072ce] flex-shrink-0" />
                <span>Trigger rule <code>trg_no_overlapping_queue_pass</code> blocks conflicting time slots, and <code>trg_wallet_transaction_apply</code> checks sufficient wallet funds.</span>
              </div>

              {/* Wallet Cost Breakdown Box */}
              <div className="mb-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono">
                <div className="flex items-center justify-between text-slate-600 mb-1.5">
                  <span className="font-sans font-medium text-slate-700">Ride Pass Price:</span>
                  <span className="font-bold text-rose-600">-₹{parseFloat(selectedRideForBooking.Ride_Price || 150).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600 mb-1.5">
                  <span className="font-sans font-medium text-slate-700">Your Current Balance:</span>
                  <span className="font-bold text-[#002244]">₹{currentBalance.toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold">
                  <span className="font-sans text-[#002244]">Est. Balance After Pass:</span>
                  <span className={`${currentBalance >= parseFloat(selectedRideForBooking.Ride_Price || 150) ? 'text-emerald-700' : 'text-rose-600'}`}>
                    ₹{(currentBalance - parseFloat(selectedRideForBooking.Ride_Price || 150)).toFixed(2)}
                  </span>
                </div>

                {currentBalance < parseFloat(selectedRideForBooking.Ride_Price || 150) && (
                  <div className="mt-2 text-rose-700 font-sans font-bold flex items-center gap-1.5 text-[11px] bg-rose-50 p-2 rounded-xl border border-rose-200">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                    <span>Insufficient funds! Booking will trigger DBMS rule violation.</span>
                  </div>
                )}
              </div>

              {/* 30-Minute Slot Timeline Options */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700">
                  Select 30-Minute Ride Slot:
                </label>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  {[
                    { start: '12:00:00', end: '12:30:00', label: '12:00 PM - 12:30 PM' },
                    { start: '12:30:00', end: '13:00:00', label: '12:30 PM - 01:00 PM' },
                    { start: '13:00:00', end: '13:30:00', label: '01:00 PM - 01:30 PM (Conflict)' },
                    { start: '13:15:00', end: '13:45:00', label: '01:15 PM - 01:45 PM (Overlap test)' },
                    { start: '13:30:00', end: '14:00:00', label: '01:30 PM - 02:00 PM' },
                    { start: '14:00:00', end: '14:30:00', label: '02:00 PM - 02:30 PM' },
                    { start: '15:00:00', end: '15:30:00', label: '03:00 PM - 03:30 PM' }
                  ].map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleBookPass(selectedRideForBooking, s.start, s.end)}
                      disabled={bookingLoading}
                      className="p-3 rounded-2xl bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-[#0072ce] text-left transition-all shadow-sm"
                    >
                      <div className="font-bold text-[#002244]">{s.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">30 min FastPass window</div>
                    </button>
                  ))}
                </div>
              </div>

            </motion.div>
          </div>
        )}


      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL: DIGITAL BOARDING PASS WITH QR CODE */}
      {/* ======================================================== */}
      <AnimatePresence>
        {bookedBoardingPass && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-sm bg-white border-2 border-[#0072ce] rounded-3xl shadow-2xl p-6 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#0072ce] flex items-center justify-center mx-auto mb-3 border border-sky-200">
                <Ticket className="w-6 h-6" />
              </div>

              <span className="text-[10px] font-mono tracking-widest uppercase text-[#0072ce] font-bold">
                DISNEY RESORT FASTPASS
              </span>

              <h3 className="text-xl font-extrabold text-[#002244] mt-1">
                {bookedBoardingPass.Attraction_Name}
              </h3>

              {/* Stylized QR Code placeholder */}
              <div className="my-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 mx-auto inline-block shadow-sm">
                <QrCode className="w-32 h-32 text-[#002244]" />
              </div>

              <div className="p-3.5 rounded-2xl bg-sky-50/60 border border-sky-100 font-mono text-xs space-y-1 text-slate-700">
                <div>Pass ID: <span className="text-[#0072ce] font-bold">#{bookedBoardingPass.Pass_ID}</span></div>
                <div>Slot: <span className="text-amber-700 font-bold">{bookedBoardingPass.Slot_Start_Time} - {bookedBoardingPass.Slot_End_Time}</span></div>
                <div>Rider: <span className="text-[#002244] font-bold">{user.fullName} ({user.bandUid})</span></div>
              </div>

              <button
                onClick={() => setBookedBoardingPass(null)}
                className="mt-6 w-full py-2.5 rounded-2xl bg-[#0072ce] hover:bg-[#0284c7] text-white font-bold text-xs shadow-md shadow-sky-500/25 transition-colors"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}


      </AnimatePresence>
        </>
      )}

    </div>
  );
}
