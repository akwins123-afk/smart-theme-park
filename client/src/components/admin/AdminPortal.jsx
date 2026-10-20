import React, { useState, useEffect } from 'react';
import { 
  Database, 
  SlidersHorizontal, 
  Table as TableIcon, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  ExternalLink, 
  Terminal, 
  Zap, 
  FileCode, 
  Network, 
  Lock, 
  Coins, 
  UserPlus, 
  ShoppingBag, 
  Compass, 
  Activity, 
  TrendingUp, 
  ShieldAlert, 
  Printer, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  ArrowRight,
  Clock,
  Key,
  Users,
  Eye,
  BarChart3,
  Layers,
  Sparkles,
  Ticket,
  Filter,
  AlertTriangle,
  X,
  Radio,
  CheckCircle2,
  UserCheck
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';
import ErDiagram from '../er-diagram/ErDiagram';

export default function AdminPortal({ token, onLogout, onErrorTrigger, lastSseEvent }) {
  // Master Mode: 'transparency' (Option 1) or 'operations' (Option 2)
  const [adminMode, setAdminMode] = useState('transparency');

  // Option 1 Subtabs: 'tables', 'er_diagram', 'schema', 'sql_console', 'analytical', 'index_lab', 'privileges'
  const [transparencyTab, setTransparencyTab] = useState('tables');

  // Option 2 Subtabs: 'telemetry', 'registration', 'wallet', 'pos', 'turnstile', 'revenue', 'audit'
  const [operationsTab, setOperationsTab] = useState('telemetry');

  // Operations: Telemetry & Activity Center
  const [telemetryList, setTelemetryList] = useState([]);
  const [telemetryLoading, setTelemetryLoading] = useState(false);
  const [telemetrySearch, setTelemetrySearch] = useState('');
  const [telemetryFilter, setTelemetryFilter] = useState('ALL'); // 'ALL', 'ON_RIDE', 'QUEUED', 'LOCKER'
  const [selectedVisitor360, setSelectedVisitor360] = useState(null);

  // Operations: Visitor Edit & Set Wallet
  const [visitorToEdit, setVisitorToEdit] = useState(null);
  const [editForm, setEditForm] = useState({
    fullName: '',
    heightCm: '',
    email: '',
    phone: '',
    status: 'Active',
    setWalletBalance: '',
    bandUid: ''
  });
  const [editLoading, setEditLoading] = useState(false);

  // Operations: Dispatch to Ride
  const [attractionsList, setAttractionsList] = useState([]);
  const [dispatchBandId, setDispatchBandId] = useState('');
  const [dispatchAttractionId, setDispatchAttractionId] = useState('');
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [dispatchResult, setDispatchResult] = useState(null);

  // Operations: Account Activation
  const [pendingAccounts, setPendingAccounts] = useState([]);
  const [activationHistory, setActivationHistory] = useState([]);
  const [activationLoading, setActivationLoading] = useState(false);
  const [selectedPendingForAllot, setSelectedPendingForAllot] = useState(null);
  const [allotAmount, setAllotAmount] = useState('500');
  const [allotMode, setAllotMode] = useState('Cash');
  const [allotRemarks, setAllotRemarks] = useState('Front Counter Float');
  const [activationReceipt, setActivationReceipt] = useState(null);

  // Operations: Keyless Lockers Control & Expansion
  const [lockersList, setLockersList] = useState([]);
  const [lockersLoading, setLockersLoading] = useState(false);
  const [selectedLockerZoneFilter, setSelectedLockerZoneFilter] = useState('ALL');
  const [newLockerZone, setNewLockerZone] = useState('Entrance Zone');
  const [newLockerNumber, setNewLockerNumber] = useState('');
  const [addLockerLoading, setAddLockerLoading] = useState(false);
  const [addLockerSuccess, setAddLockerSuccess] = useState(null);

  // Tables state
  const [tablesList, setTablesList] = useState([]);
  const [selectedTable, setSelectedTable] = useState('Visitor');
  const [tableData, setTableData] = useState(null);
  const [tableSearch, setTableSearch] = useState('');
  const [tableLoading, setTableLoading] = useState(false);

  // Dynamic CRUD Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [formData, setFormData] = useState({});
  const [fkOptions, setFkOptions] = useState({});

  // Schema & DDL
  const [schemaData, setSchemaData] = useState(null);

  // ER Diagram data
  const [erData, setErData] = useState(null);

  // SQL Console
  const [sqlQueryInput, setSqlQueryInput] = useState('SELECT * FROM Attraction ORDER BY Min_Height_cm ASC;');
  const [sqlConsoleResult, setSqlConsoleResult] = useState(null);
  const [sqlConsoleLoading, setSqlConsoleLoading] = useState(false);
  const [mutationConfirm, setMutationConfirm] = useState(null);

  // Analytical Queries
  const [analyticalQueries, setAnalyticalQueries] = useState([]);
  const [analyticalLoading, setAnalyticalLoading] = useState(false);

  // Index Lab
  const [indexLabBenchmark, setIndexLabBenchmark] = useState(null);
  const [indexLabLoading, setIndexLabLoading] = useState(false);

  // Privileges
  const [privilegesData, setPrivilegesData] = useState([]);

  // Operations: Wallet
  const [wristbandsList, setWristbandsList] = useState([]);
  const [selectedBandForTopup, setSelectedBandForTopup] = useState('1');
  const [topupAmount, setTopupAmount] = useState('500');
  const [printableReceipt, setPrintableReceipt] = useState(null);
  const [topupLoading, setTopupLoading] = useState(false);

  // Operations: Registration Desk
  const [newVisitorName, setNewVisitorName] = useState('');
  const [newVisitorHeight, setNewVisitorHeight] = useState('165');
  const [newVisitorEmail, setNewVisitorEmail] = useState('');
  const [newVisitorPhone, setNewVisitorPhone] = useState('+91 ');
  const [newVisitorFloat, setNewVisitorFloat] = useState('500');
  const [regSuccessData, setRegSuccessData] = useState(null);

  // Operations: POS Simulator
  const [outletsList, setOutletsList] = useState([]);
  const [posSelectedOutlet, setPosSelectedOutlet] = useState('1');
  const [posSelectedBand, setPosSelectedBand] = useState('3'); // Kabir Nair (₹420)
  const [posAmount, setPosAmount] = useState('500'); // Triggers overdraw test!
  const [posResult, setPosResult] = useState(null);

  // Operations: Turnstile Tap Simulator
  const [turnstileAttraction, setTurnstileAttraction] = useState('1'); // Dragon Fury (Min 140)
  const [turnstileBand, setTurnstileBand] = useState('3'); // Kabir Nair (128cm) -> triggers denial
  const [turnstileResult, setTurnstileResult] = useState(null);
  const [turnstileAnimation, setTurnstileAnimation] = useState(false);

  // Operations: Revenue Dashboard & Audit Log
  const [revenueData, setRevenueData] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // Load initial tables, wristbands, and telemetry
  useEffect(() => {
    fetchTables();
    fetchWristbands();
    fetchOutlets();
    fetchSchema();
    fetchErDiagram();
    fetchPrivileges();
    fetchTelemetry();
    fetchAttractions();
    fetchPendingAccounts();
    fetchActivationHistory();
    fetchLockersOverview();
  }, []);

  // Real-time SSE listener to update telemetry live
  useEffect(() => {
    if (!lastSseEvent) return;
    fetchTelemetry();
    fetchWristbands();
    fetchPendingAccounts();
    fetchActivationHistory();
    fetchLockersOverview();
  }, [lastSseEvent]);

  // Operations: Keyless Lockers API Handlers
  const fetchLockersOverview = async () => {
    setLockersLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/admin/ops/lockers/overview', { headers });
      const data = await res.json();
      if (data.success) {
        setLockersList(data.lockers || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLockersLoading(false);
    }
  };

  const handleForceReleaseLocker = async (rentalId, number, zone) => {
    if (!confirm(`Master Override: Are you sure you want to force-release Locker ${number} (${zone})?`)) return;
    try {
      const res = await fetch('http://localhost:5000/api/admin/ops/lockers/force-release', {
        method: 'POST',
        headers,
        body: JSON.stringify({ rentalId })
      });
      const data = await res.json();
      if (!res.ok) {
        onErrorTrigger(data);
        return;
      }
      fetchLockersOverview();
      fetchTelemetry();
      fetchTables();
      alert(`Locker ${number} (${zone}) successfully master-unlocked and released!`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddLocker = async (e) => {
    if (e) e.preventDefault();
    if (!newLockerNumber.trim()) return;
    setAddLockerLoading(true);
    setAddLockerSuccess(null);
    try {
      const res = await fetch('http://localhost:5000/api/admin/ops/lockers/add', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          zone: newLockerZone,
          number: newLockerNumber.trim().toUpperCase()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        onErrorTrigger(data);
        return;
      }
      setAddLockerSuccess(data.message);
      setNewLockerNumber('');
      fetchLockersOverview();
      fetchTables();
      setTimeout(() => setAddLockerSuccess(null), 4000);
    } catch (err) {
      alert(err.message);
    } finally {
      setAddLockerLoading(false);
    }
  };

  // Activation & Opening Float API Handlers
  const fetchPendingAccounts = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/admin/pending', { headers });
      const data = await res.json();
      if (data.success) setPendingAccounts(data.pending || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchActivationHistory = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/admin/activations', { headers });
      const data = await res.json();
      if (data.success) setActivationHistory(data.activations || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleActivateAccount = async (e) => {
    if (e) e.preventDefault();
    if (!selectedPendingForAllot) return;
    setActivationLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/admin/activate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          bandId: selectedPendingForAllot.Band_ID,
          amount: parseFloat(allotAmount),
          paymentMode: allotMode,
          remarks: allotRemarks
        })
      });
      const data = await res.json();
      if (!res.ok) {
        onErrorTrigger(data);
        return;
      }
      setActivationReceipt(data.receipt);
      setSelectedPendingForAllot(null);
      fetchPendingAccounts();
      fetchActivationHistory();
      fetchWristbands();
      fetchTelemetry();
      fetchTables();
    } catch (err) {
      alert(err.message);
    } finally {
      setActivationLoading(false);
    }
  };

  const handleRejectPending = async (bandId) => {
    if (!confirm('Are you sure you want to reject and cancel this pending registration?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/admin/pending/${bandId}`, {
        method: 'DELETE',
        headers
      });
      const data = await res.json();
      if (!res.ok) {
        onErrorTrigger(data);
        return;
      }
      fetchPendingAccounts();
      fetchTelemetry();
    } catch (err) {
      alert(err.message);
    }
  };

  const fetchTelemetry = async () => {
    setTelemetryLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/admin/ops/customers/live-telemetry', { headers });
      const data = await res.json();
      if (data.success) {
        setTelemetryList(data.customers);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTelemetryLoading(false);
    }
  };

  const fetchAttractions = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/admin/transparency/table/Attraction?limit=50', { headers });
      const data = await res.json();
      if (data.success && data.rows) {
        setAttractionsList(data.rows);
        if (data.rows.length > 0 && !dispatchAttractionId) {
          setDispatchAttractionId(String(data.rows[0].Attraction_ID));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenEditVisitor = (visitor) => {
    setVisitorToEdit(visitor);
    setEditForm({
      fullName: visitor.Full_Name || '',
      heightCm: visitor.Height_cm !== undefined ? String(visitor.Height_cm) : '',
      email: visitor.Email || '',
      phone: visitor.Phone || '',
      status: visitor.Wristband_Status || 'Active',
      setWalletBalance: visitor.Wallet_Balance !== undefined ? String(visitor.Wallet_Balance) : '',
      bandUid: visitor.Band_UID || ''
    });
  };

  const handleSaveVisitorEdit = async (e) => {
    if (e) e.preventDefault();
    if (!visitorToEdit) return;
    setEditLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/admin/ops/visitor/update', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          visitorId: visitorToEdit.Visitor_ID,
          bandId: visitorToEdit.Band_ID,
          fullName: editForm.fullName,
          heightCm: editForm.heightCm,
          email: editForm.email,
          phone: editForm.phone,
          status: editForm.status,
          setWalletBalance: editForm.setWalletBalance,
          bandUid: editForm.bandUid
        })
      });
      const data = await res.json();
      if (!res.ok) {
        onErrorTrigger(data);
        return;
      }
      setVisitorToEdit(null);
      fetchTelemetry();
      fetchWristbands();
      fetchTables();
      alert(`Visitor "${editForm.fullName}" profile & RFID Band (${editForm.bandUid}) updated successfully!`);
    } catch (err) {
      alert(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDispatchRide = async () => {
    if (!dispatchBandId || !dispatchAttractionId) {
      alert('Please select both a visitor and an attraction.');
      return;
    }
    setDispatchLoading(true);
    setDispatchResult(null);
    try {
      const res = await fetch('http://localhost:5000/api/admin/ops/turnstile/board-ride', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          bandId: dispatchBandId,
          attractionId: dispatchAttractionId
        })
      });
      const data = await res.json();
      setDispatchResult(data);
      if (!res.ok) {
        onErrorTrigger(data);
      }
      fetchTelemetry();
      fetchWristbands();
    } catch (err) {
      setDispatchResult({ error: true, message: err.message });
    } finally {
      setDispatchLoading(false);
    }
  };

  const fetchTables = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/admin/transparency/tables', { headers });
      const data = await res.json();
      if (data.success) setTablesList(data.tables);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTableData = async (tblName, search = '') => {
    setTableLoading(true);
    try {
      const url = `http://localhost:5000/api/admin/transparency/table/${tblName}?search=${encodeURIComponent(search)}`;
      const res = await fetch(url, { headers });
      const data = await res.json();
      if (data.success) {
        setTableData(data);
        setSelectedTable(tblName);
      } else {
        onErrorTrigger(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTable) {
      fetchTableData(selectedTable, tableSearch);
    }
  }, [selectedTable]);

  const fetchWristbands = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/customer/demo-wristbands');
      const data = await res.json();
      if (data.success) setWristbandsList(data.wristbands);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchOutlets = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/admin/transparency/foreign-key-options/POS_Outlet', { headers });
      const data = await res.json();
      if (data.success) setOutletsList(data.options);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSchema = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/admin/transparency/schema', { headers });
      const data = await res.json();
      if (data.success) setSchemaData(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchErDiagram = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/admin/transparency/er-diagram', { headers });
      const data = await res.json();
      if (data.success) setErData(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAnalytical = async () => {
    setAnalyticalLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/admin/transparency/analytical-queries', { headers });
      const data = await res.json();
      if (data.success) setAnalyticalQueries(data.queries);
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyticalLoading(false);
    }
  };

  const fetchIndexLab = async (queryType = 'queue') => {
    setIndexLabLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/admin/transparency/index-lab', {
        method: 'POST',
        headers,
        body: JSON.stringify({ queryType })
      });
      const data = await res.json();
      if (data.success) setIndexLabBenchmark(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIndexLabLoading(false);
    }
  };

  const fetchPrivileges = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/admin/transparency/privileges', { headers });
      const data = await res.json();
      if (data.success) setPrivilegesData(data.roles);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRevenueDashboard = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/admin/ops/revenue-dashboard', { headers });
      const data = await res.json();
      if (data.success) setRevenueData(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/admin/ops/audit-log', { headers });
      const data = await res.json();
      if (data.success) setAuditLogs(data.logs);
    } catch (e) {
      console.error(e);
    }
  };

  // Switch tabs loader trigger
  useEffect(() => {
    if (adminMode === 'transparency') {
      if (transparencyTab === 'analytical') fetchAnalytical();
      if (transparencyTab === 'index_lab') fetchIndexLab();
    } else {
      if (operationsTab === 'revenue') fetchRevenueDashboard();
      if (operationsTab === 'audit') fetchAuditLogs();
    }
  }, [adminMode, transparencyTab, operationsTab]);

  // Execute Guarded SQL
  const handleExecuteSql = async (confirm = false) => {
    setSqlConsoleLoading(true);
    setMutationConfirm(null);
    try {
      const res = await fetch('http://localhost:5000/api/admin/transparency/query', {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: sqlQueryInput, confirmWrite: confirm })
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.requiresConfirmation) {
          setMutationConfirm(data);
        } else {
          onErrorTrigger(data);
        }
        return;
      }
      setSqlConsoleResult(data);
      fetchTables();
    } catch (e) {
      alert('SQL Error: ' + e.message);
    } finally {
      setSqlConsoleLoading(false);
    }
  };

  // Operations: Top-up Wallet
  const handleTopup = async (e) => {
    if (e) e.preventDefault();
    setTopupLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/admin/ops/wallet/topup', {
        method: 'POST',
        headers,
        body: JSON.stringify({ bandId: selectedBandForTopup, amount: topupAmount })
      });
      const data = await res.json();
      if (!res.ok) {
        onErrorTrigger(data);
        return;
      }
      setPrintableReceipt(data.receipt);
      fetchWristbands();
    } catch (e) {
      alert(e.message);
    } finally {
      setTopupLoading(false);
    }
  };

  // Operations: Register Visitor + Band in 1 atomic transaction
  const handleRegisterVisitor = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/admin/ops/register', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fullName: newVisitorName,
          heightCm: newVisitorHeight,
          email: newVisitorEmail,
          phone: newVisitorPhone,
          openingBalance: newVisitorFloat
        })
      });
      const data = await res.json();
      if (!res.ok) {
        onErrorTrigger(data);
        return;
      }
      setRegSuccessData(data);
      setNewVisitorName('');
      setNewVisitorEmail('');
      fetchWristbands();
      fetchTelemetry();
      fetchTables();
    } catch (e) {
      alert(e.message);
    }
  };

  // Operations: POS Simulator
  const handleSimulatePos = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/admin/ops/pos/simulate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          bandId: posSelectedBand,
          outletId: posSelectedOutlet,
          amount: posAmount
        })
      });
      const data = await res.json();
      setPosResult(data);
      if (!res.ok) {
        onErrorTrigger(data);
      } else {
        fetchWristbands();
      }
    } catch (e) {
      alert(e.message);
    }
  };

  // Operations: Turnstile Ride Simulator
  const handleSimulateTurnstile = async () => {
    setTurnstileAnimation(true);
    setTurnstileResult(null);
    try {
      const res = await fetch('http://localhost:5000/api/admin/ops/turnstile/simulate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          bandId: turnstileBand,
          attractionId: turnstileAttraction
        })
      });
      const data = await res.json();
      setTurnstileResult(data);
    } catch (e) {
      alert(e.message);
    } finally {
      setTimeout(() => setTurnstileAnimation(false), 500);
    }
  };

  // Dynamic CRUD: Save Record
  const handleSaveRecord = async (e) => {
    e.preventDefault();
    const isEdit = !!editingRow;
    const url = isEdit
      ? `http://localhost:5000/api/admin/transparency/table/${selectedTable}/${editingRow[tableData.columns.find(c => c.key === 'PRI')?.name]}`
      : `http://localhost:5000/api/admin/transparency/table/${selectedTable}`;

    // Sanitize formData: auto-convert DD-MM-YYYY to YYYY-MM-DD and prune empty strings for defaults
    const sanitized = {};
    for (const [key, val] of Object.entries(formData)) {
      if (val === '' || val === undefined) {
        if (!isEdit) continue;
        sanitized[key] = null;
        continue;
      }
      if (typeof val === 'string') {
        const dmy = val.trim().match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2}:\d{2}(?::\d{2})?))?$/);
        if (dmy) {
          const d = dmy[1].padStart(2, '0');
          const m = dmy[2].padStart(2, '0');
          const y = dmy[3];
          const t = dmy[4] ? (dmy[4].length === 5 ? dmy[4] + ':00' : dmy[4]) : '00:00:00';
          sanitized[key] = `${y}-${m}-${d} ${t}`;
          continue;
        }
      }
      sanitized[key] = val;
    }

    try {
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify(sanitized)
      });
      const data = await res.json();
      if (!res.ok) {
        onErrorTrigger(data);
        return;
      }
      setShowAddModal(false);
      setEditingRow(null);
      setFormData({});
      fetchTableData(selectedTable, tableSearch);
      fetchTables();
    } catch (err) {
      alert('Save failed: ' + err.message);
    }
  };

  // Dynamic CRUD: Delete Record
  const handleDeleteRecord = async (row) => {
    const pkCol = tableData.columns.find(c => c.key === 'PRI')?.name;
    const id = row[pkCol];
    if (!confirm(`Are you sure you want to delete ${selectedTable} record #${id}?`)) return;

    try {
      const res = await fetch(`http://localhost:5000/api/admin/transparency/table/${selectedTable}/${id}`, {
        method: 'DELETE',
        headers
      });
      const data = await res.json();
      if (!res.ok) {
        onErrorTrigger(data);
        return;
      }
      fetchTableData(selectedTable, tableSearch);
      fetchTables();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-sky-50 text-slate-800 flex flex-col pb-24">
      
      {/* Top Admin Switcher Banner (Option 1 vs Option 2) */}
      <div className="bg-[#002244] border-b border-sky-200 px-4 sm:px-8 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-300 flex items-center justify-center border border-sky-400/40">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Park Staff Mission Control (Disney & Wonderla)
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-900 text-sky-200 border border-sky-600 font-bold">
                Cast Member SuperAdmin
              </span>
            </h2>
            <span className="text-xs text-sky-200 font-mono">
              Enforcing Relational Safety & Park Operations on MySQL 8
            </span>
          </div>
        </div>

        {/* The Exact Two Big Admin Options */}
        <div className="flex items-center gap-2 bg-[#001736] p-1 rounded-2xl border border-sky-800">
          
          <button
            onClick={() => setAdminMode('transparency')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 ${
              adminMode === 'transparency'
                ? 'bg-[#0072ce] text-white shadow-md shadow-sky-500/30'
                : 'text-sky-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <Database className="w-4 h-4" />
            OPTION 1: Database Transparency Center
          </button>

          <button
            onClick={() => setAdminMode('operations')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 ${
              adminMode === 'operations'
                ? 'bg-[#0072ce] text-white shadow-md shadow-sky-500/30'
                : 'text-sky-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            OPTION 2: Park Operations & Finance
          </button>

        </div>

      </div>

      {/* ======================================================== */}
      {/* OPTION 1: DATABASE TRANSPARENCY CENTER */}
      {/* ======================================================== */}
      {adminMode === 'transparency' && (
        <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          
          {/* Subtabs for Transparency Center */}
          <div className="flex items-center gap-1.5 pb-4 border-b border-sky-200 overflow-x-auto text-xs font-mono">
            {[
              { id: 'tables', label: '8 Live Data Grids', icon: TableIcon },
              { id: 'er_diagram', label: 'Interactive ER Model', icon: Network },
              { id: 'schema', label: 'Schema DDL & 3NF Report', icon: FileCode },
              { id: 'sql_console', label: 'Guarded SQL Console', icon: Terminal },
              { id: 'analytical', label: 'Review 2 Analytical Queries', icon: BarChart3 },
              { id: 'index_lab', label: 'Index Lab & Benchmarks', icon: Zap },
              { id: 'privileges', label: 'MySQL RBAC Privileges', icon: Key }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setTransparencyTab(tab.id)}
                  className={`px-3.5 py-2 rounded-2xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    transparencyTab === tab.id
                      ? 'bg-[#0072ce] text-white font-bold shadow-md shadow-sky-500/25'
                      : 'bg-white text-slate-600 hover:text-[#0072ce] border border-sky-100 hover:border-sky-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* 1.1 LIVE DATA GRID FOR ALL 8 TABLES */}
          {transparencyTab === 'tables' && (
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
              
              {/* Tables Sidebar */}
              <div className="space-y-2">
                <span className="text-xs font-mono text-[#0072ce] font-bold block mb-2 uppercase tracking-wider">
                  Relational Tables (3NF)
                </span>
                {tablesList.map((t) => (
                  <button
                    key={t.name}
                    onClick={() => {
                      setSelectedTable(t.name);
                      setTableSearch('');
                    }}
                    className={`w-full text-left p-3 rounded-2xl text-xs font-mono transition-all border flex items-center justify-between ${
                      selectedTable === t.name
                        ? 'bg-sky-50 border-[#0072ce] text-[#002244] font-bold shadow-sm ring-1 ring-sky-300'
                        : 'bg-white border-sky-100 text-slate-700 hover:border-sky-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <TableIcon className="w-3.5 h-3.5 text-[#0072ce]" />
                      <span className="font-bold truncate">{t.name}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                      {t.rowCount} rows
                    </span>
                  </button>
                ))}
              </div>

              {/* Live Table Data View */}
              <div className="lg:col-span-3 space-y-4">
                
                {/* Table Control Bar */}
                <div className="p-4 rounded-2xl bg-white border border-sky-100 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-[#002244] font-mono">{selectedTable}</h3>
                    <span className="text-xs text-slate-500 font-mono">
                      ({tableData?.pagination?.totalRows || 0} total records)
                    </span>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {/* Search */}
                    <div className="relative flex-1 sm:w-60">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search records..."
                        value={tableSearch}
                        onChange={(e) => {
                          setTableSearch(e.target.value);
                          fetchTableData(selectedTable, e.target.value);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0072ce]"
                      />
                    </div>

                    <button
                      onClick={() => {
                        setEditingRow(null);
                        setFormData({});
                        setShowAddModal(true);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[#0072ce] hover:bg-[#0284c7] text-white font-mono text-xs font-bold transition-all shadow-md flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Record
                    </button>
                  </div>
                </div>

                {/* Data Grid */}
                <div className="rounded-2xl border border-sky-100 bg-white overflow-hidden shadow-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-sky-50 text-[#002244] border-b border-sky-100">
                        <tr>
                          {tableData?.columns?.map((col) => (
                            <th key={col.name} className="px-4 py-3 font-semibold">
                              <div className="flex items-center gap-1">
                                {col.key === 'PRI' && <span className="text-amber-400 font-bold">[PK]</span>}
                                {col.foreignKey && <span className="text-cyan-400 font-bold">[FK]</span>}
                                <span>{col.name}</span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-normal block">
                                {col.type}
                              </span>
                            </th>
                          ))}
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {tableLoading ? (
                          <tr>
                            <td colSpan={tableData?.columns?.length + 1} className="py-12 text-center text-slate-400">
                              Loading live table data...
                            </td>
                          </tr>
                        ) : tableData?.rows?.length === 0 ? (
                          <tr>
                            <td colSpan={tableData?.columns?.length + 1} className="py-12 text-center text-slate-400">
                              No records found matching search query.
                            </td>
                          </tr>
                        ) : (
                          tableData?.rows?.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-sky-50/60 transition-colors">
                              {tableData.columns.map((col) => (
                                <td key={col.name} className="px-4 py-3 text-slate-700 font-medium">
                                  {col.foreignKey && row[col.name] !== null ? (
                                    <button
                                      onClick={() => {
                                        setSelectedTable(col.foreignKey.targetTable);
                                        setTableSearch(String(row[col.name]));
                                      }}
                                      className="text-[#0072ce] font-bold underline hover:text-[#002244] flex items-center gap-1"
                                      title={`Jump to ${col.foreignKey.targetTable} #${row[col.name]}`}
                                    >
                                      {String(row[col.name])}
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </button>
                                  ) : (
                                    String(row[col.name] !== null && row[col.name] !== undefined ? row[col.name] : 'NULL')
                                  )}
                                </td>
                              ))}
                              
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => {
                                      setEditingRow(row);
                                      setFormData(row);
                                      setShowAddModal(true);
                                    }}
                                    className="p-1 hover:text-[#0072ce] text-slate-400 transition-colors"
                                    title="Edit record"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteRecord(row)}
                                    className="p-1 hover:text-rose-600 text-slate-400 transition-colors"
                                    title="Delete record"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* 1.2 INTERACTIVE ER MODEL */}
          {transparencyTab === 'er_diagram' && (
            <div className="mt-6">
              <ErDiagram 
                erData={erData} 
                onSelectTable={(tbl) => {
                  setSelectedTable(tbl);
                  setTransparencyTab('tables');
                }} 
              />
            </div>
          )}

          {/* 1.3 SCHEMA DDL & 3NF REPORT */}
          {transparencyTab === 'schema' && (
            <div className="mt-6 space-y-6">
              {/* 3NF Compliance Summary Card */}
              <div className="p-6 rounded-3xl bg-white border border-sky-100 shadow-xl shadow-sky-100/60">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  {schemaData?.normalizationDoc?.title}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  {schemaData?.normalizationDoc?.summary}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {schemaData?.normalizationDoc?.forms?.map((f, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs">
                      <span className="font-bold text-cyan-400 block mb-1">{f.nf}</span>
                      <span className="text-emerald-400 text-[10px] font-bold block mb-2">STATUS: {f.status}</span>
                      <p className="text-slate-400 text-[11px] leading-relaxed">{f.details}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Full DDL Statements */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold font-mono text-slate-300 uppercase">
                  CREATE TABLE DDL (Raw MySQL 8 Syntax)
                </h4>
                {schemaData?.tables && Object.keys(schemaData.tables).map((tbl) => (
                  <div key={tbl} className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
                    <span className="text-xs font-mono font-bold text-cyan-400 block mb-2">
                      Table: {tbl}
                    </span>
                    <pre className="text-xs font-mono text-emerald-300 bg-slate-950 p-3 rounded-xl overflow-x-auto whitespace-pre-wrap">
                      {schemaData.tables[tbl]}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 1.4 GUARDED SQL CONSOLE WITH EXPLAIN */}
          {transparencyTab === 'sql_console' && (
            <div className="mt-6 space-y-6">
              <div className="p-6 rounded-3xl bg-white border border-sky-100 shadow-xl shadow-sky-100/60">
                <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-purple-400" />
                  Guarded SQL Console with Execution Plan (EXPLAIN)
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Write queries directly against MySQL. Free SELECT queries execute automatically; mutation statements (INSERT, UPDATE, DELETE) enforce interactive confirmation.
                </p>

                <div className="space-y-3">
                  <textarea
                    rows={4}
                    value={sqlQueryInput}
                    onChange={(e) => setSqlQueryInput(e.target.value)}
                    className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300 focus:outline-none focus:border-purple-500"
                    placeholder="Enter SQL statement (e.g. SELECT * FROM Attraction;)"
                  />

                  <div className="flex items-center justify-between">
                    <div className="flex gap-2 text-xs font-mono text-slate-400">
                      <span>Quick presets:</span>
                      <button 
                        onClick={() => setSqlQueryInput("SELECT * FROM Vw_Outlet_Revenue;")}
                        className="text-cyan-400 underline hover:text-cyan-300"
                      >
                        Revenue View
                      </button>
                      <span>·</span>
                      <button 
                        onClick={() => setSqlQueryInput("SELECT * FROM Virtual_Queue_Pass WHERE Status = 'Booked';")}
                        className="text-cyan-400 underline hover:text-cyan-300"
                      >
                        Active Passes
                      </button>
                    </div>

                    <button
                      onClick={() => handleExecuteSql(false)}
                      disabled={sqlConsoleLoading}
                      className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold transition-all shadow-md shadow-purple-950 flex items-center gap-2"
                    >
                      <Zap className="w-4 h-4" />
                      {sqlConsoleLoading ? 'Executing...' : 'Run Query'}
                    </button>
                  </div>
                </div>

                {/* Guard Confirmation Warning Banner */}
                {mutationConfirm && (
                  <div className="mt-4 p-4 rounded-2xl bg-amber-950/40 border border-amber-600/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <span className="font-bold text-amber-400 font-mono text-xs block">
                        GUARD CONFIRMATION REQUIRED
                      </span>
                      <p className="text-xs text-amber-200 mt-0.5">
                        {mutationConfirm.message}
                      </p>
                    </div>
                    <button
                      onClick={() => handleExecuteSql(true)}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono text-xs whitespace-nowrap"
                    >
                      Confirm Execution
                    </button>
                  </div>
                )}

                {/* Console Output Table */}
                {sqlConsoleResult && (
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                      <span className="text-emerald-400 font-bold">
                        Query Returned {sqlConsoleResult.results?.length || sqlConsoleResult.affectedRows || 0} Records
                      </span>
                    </div>

                    {sqlConsoleResult.results && sqlConsoleResult.results.length > 0 && (
                      <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-x-auto max-h-72">
                        <table className="w-full text-left text-xs font-mono">
                          <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                            <tr>
                              {sqlConsoleResult.fields.map(f => (
                                <th key={f} className="px-3 py-2 font-semibold">{f}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {sqlConsoleResult.results.map((row, i) => (
                              <tr key={i} className="hover:bg-slate-900/40">
                                {sqlConsoleResult.fields.map(f => (
                                  <td key={f} className="px-3 py-2 text-slate-300">
                                    {String(row[f] !== null ? row[f] : 'NULL')}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Visual EXPLAIN Tree */}
                    {sqlConsoleResult.explainPlan && (
                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                        <span className="text-xs font-mono text-cyan-400 font-bold block mb-2">
                          Visual EXPLAIN Execution Tree
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                          <div className="p-2 rounded bg-slate-900 border border-slate-800">
                            <span className="text-slate-500 text-[10px] block">JOIN TYPE</span>
                            <span className="text-amber-400 font-bold">{sqlConsoleResult.explainPlan[0]?.type || 'N/A'}</span>
                          </div>
                          <div className="p-2 rounded bg-slate-900 border border-slate-800">
                            <span className="text-slate-500 text-[10px] block">INDEX USED</span>
                            <span className="text-cyan-400 font-bold">{sqlConsoleResult.explainPlan[0]?.key || 'PRIMARY/TABLE SCAN'}</span>
                          </div>
                          <div className="p-2 rounded bg-slate-900 border border-slate-800">
                            <span className="text-slate-500 text-[10px] block">ROWS EXAMINED</span>
                            <span className="text-white font-bold">{sqlConsoleResult.explainPlan[0]?.rows || '1'}</span>
                          </div>
                          <div className="p-2 rounded bg-slate-900 border border-slate-800">
                            <span className="text-slate-500 text-[10px] block">FILTERED</span>
                            <span className="text-emerald-400 font-bold">{sqlConsoleResult.explainPlan[0]?.filtered || '100%'}%</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 1.5 PRE-BUILT ANALYTICAL QUERIES GALLERY */}
          {transparencyTab === 'analytical' && (
            <div className="mt-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-400" />
                    Review 2 Pre-Built Analytical Queries Gallery
                  </h3>
                  <p className="text-xs text-slate-400">
                    The 5 benchmark queries presented in Review 2 with live execution.
                  </p>
                </div>
                <button
                  onClick={fetchAnalytical}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 font-mono text-xs border border-purple-500/30 flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh All
                </button>
              </div>

              <div className="space-y-6">
                {analyticalQueries.map((q) => (
                  <div key={q.id} className="p-6 rounded-3xl bg-white border border-sky-100 shadow-xl shadow-sky-100/60 space-y-4">
                    <div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950 text-purple-400 border border-purple-800">
                        {q.category}
                      </span>
                      <h4 className="text-base font-bold text-white mt-1">{q.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{q.description}</p>
                    </div>

                    <pre className="p-3 rounded-xl bg-slate-950 text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap">
                      {q.sql}
                    </pre>

                    {/* Results Table */}
                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                          <tr>
                            {q.columns?.map(col => (
                              <th key={col} className="px-3 py-2 font-semibold">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {q.results?.map((row, i) => (
                            <tr key={i} className="hover:bg-slate-900/40">
                              {q.columns?.map(col => (
                                <td key={col} className="px-3 py-2 text-slate-300">
                                  {String(row[col])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 1.6 INDEX LAB */}
          {transparencyTab === 'index_lab' && (
            <div className="mt-6 space-y-6">
              <div className="p-6 rounded-3xl bg-white border border-sky-100 shadow-xl shadow-sky-100/60">
                <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  Index Lab: EXPLAIN Optimization Benchmarking
                </h3>
                <p className="text-xs text-slate-400 mb-6">
                  Demonstrates how B-Tree indexes on high-traffic FKs (idx_vq_band_status, idx_txn_band_time) transform full table scans into index lookups.
                </p>

                <div className="flex gap-3 mb-6">
                  {[
                    { id: 'queue', label: 'Virtual Queue Filter (idx_vq_band_status)' },
                    { id: 'wallet', label: 'Wallet History Order (idx_txn_band_time)' },
                    { id: 'height', label: 'Safety Height Range Scan (idx_attr_height)' }
                  ].map(b => (
                    <button
                      key={b.id}
                      onClick={() => fetchIndexLab(b.id)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono border border-slate-700 text-slate-200"
                    >
                      Benchmark: {b.label}
                    </button>
                  ))}
                </div>

                {indexLabBenchmark && (
                  <div className="space-y-4">
                    <pre className="p-3 rounded-xl bg-slate-950 font-mono text-xs text-emerald-300">
                      {indexLabBenchmark.sql}
                    </pre>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                        <span className="text-slate-500 text-[10px] block">EXECUTION TIME</span>
                        <span className="text-cyan-400 text-xl font-bold">{indexLabBenchmark.executionTimeMs} ms</span>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                        <span className="text-slate-500 text-[10px] block">JOIN TYPE</span>
                        <span className="text-emerald-400 text-xl font-bold">{indexLabBenchmark.explain.type}</span>
                        <span className="text-[10px] text-slate-500">Ref lookup vs Full Scan</span>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                        <span className="text-slate-500 text-[10px] block">INDEX UTILIZED</span>
                        <span className="text-purple-400 text-sm font-bold truncate block">{indexLabBenchmark.explain.keyUsed}</span>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                        <span className="text-slate-500 text-[10px] block">ROWS SCANNED</span>
                        <span className="text-white text-xl font-bold">{indexLabBenchmark.explain.rowsScanned}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 1.7 PRIVILEGES & RBAC TAB */}
          {transparencyTab === 'privileges' && (
            <div className="mt-6 space-y-6">
              <div className="p-6 rounded-3xl bg-white border border-sky-100 shadow-xl shadow-sky-100/60">
                <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                  <Key className="w-5 h-5 text-cyan-400" />
                  Role-Based Access Control (RBAC) & Privileges
                </h3>
                <p className="text-xs text-slate-400 mb-6">
                  Verified using MySQL SHOW GRANTS. Customer sessions connect with strictly scoped park_customer user.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {privilegesData.map(p => (
                    <div key={p.role} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-cyan-400 font-bold">{p.user}@{p.host}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">Active Role</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mb-3">{p.description}</p>
                      
                      <div className="space-y-1">
                        {p.grants?.map((g, i) => (
                          <div key={i} className="p-2 rounded bg-slate-900 border border-slate-800/80 text-[11px] text-emerald-300 break-all">
                            {g}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ======================================================== */}
      {/* OPTION 2: PARK OPERATIONS & FINANCE */}
      {/* ======================================================== */}
      {adminMode === 'operations' && (
        <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          
          {/* Subtabs for Operations */}
          <div className="flex items-center gap-1.5 pb-4 border-b border-sky-200 overflow-x-auto text-xs font-mono">
            {[
              { id: 'telemetry', label: 'Live Customer & Ride Monitor', icon: Activity },
              { 
                id: 'activation', 
                label: 'Account Activation', 
                icon: CheckCircle2, 
                badge: pendingAccounts.length 
              },
              { 
                id: 'lockers', 
                label: 'Keyless Lockers & Override', 
                icon: Lock, 
                badge: lockersList.filter(l => l.Rental_Status === 'Active').length 
              },
              { id: 'registration', label: 'Registration & Visitor Manager', icon: UserPlus },
              { id: 'wallet', label: 'Wallet Management & Top-up', icon: Coins },
              { id: 'turnstile', label: 'Turnstile Ride Tap Simulator', icon: Compass },
              { id: 'pos', label: 'POS Tap Simulator', icon: ShoppingBag },
              { id: 'revenue', label: 'Live Revenue Dashboard', icon: TrendingUp },
              { id: 'audit', label: 'Immutable Audit Log', icon: Clock }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setOperationsTab(tab.id)}
                  className={`px-3.5 py-2 rounded-2xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    operationsTab === tab.id
                      ? 'bg-[#0072ce] text-white font-bold shadow-md shadow-sky-500/25'
                      : 'bg-white text-slate-600 hover:text-[#0072ce] border border-sky-100 hover:border-sky-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.badge > 0 && (
                    <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 2.0 LIVE CUSTOMER TELEMETRY & RIDE ACTIVITY MONITOR */}
          {operationsTab === 'telemetry' && (
            <div className="mt-6 space-y-6">
              
              {/* Top Live Statistics Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-sky-100 shadow-md text-center">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">GUESTS IN PARK</span>
                  <div className="text-2xl font-extrabold text-[#002244] font-mono mt-1">
                    {telemetryList.length}
                  </div>
                  <span className="text-[10px] text-emerald-600 font-bold">● Live Monitored</span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-sky-100 shadow-md text-center">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">ON A RIDE NOW</span>
                  <div className="text-2xl font-extrabold text-purple-700 font-mono mt-1">
                    {telemetryList.filter(c => c.currentActivity?.state === 'ON_RIDE').length}
                  </div>
                  <span className="text-[10px] text-purple-600 font-bold">Turnstiles Active</span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-sky-100 shadow-md text-center">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">IN VIRTUAL QUEUE</span>
                  <div className="text-2xl font-extrabold text-[#0072ce] font-mono mt-1">
                    {telemetryList.filter(c => c.currentActivity?.state === 'QUEUED').length}
                  </div>
                  <span className="text-[10px] text-[#0072ce] font-bold">FastPass Holds</span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-sky-100 shadow-md text-center">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">LOCKERS RENTED</span>
                  <div className="text-2xl font-extrabold text-indigo-700 font-mono mt-1">
                    {telemetryList.filter(c => c.activeLocker).length}
                  </div>
                  <span className="text-[10px] text-indigo-600 font-bold">Keyless In-Use</span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-sky-100 shadow-md text-center col-span-2 sm:col-span-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">TOTAL PARK SALES</span>
                  <div className="text-2xl font-extrabold text-amber-600 font-mono mt-1">
                    ₹{telemetryList.reduce((acc, c) => acc + (c.totalSpent || 0), 0).toFixed(0)}
                  </div>
                  <span className="text-[10px] text-amber-700 font-bold">Rides + Outlets</span>
                </div>
              </div>

              {/* Interactive Turnstile Dispatcher Card (Send Customer on a Ride) */}
              <div className="p-6 rounded-3xl bg-white border border-sky-100 shadow-xl shadow-sky-100/60">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <h3 className="text-lg font-extrabold text-[#002244] flex items-center gap-2">
                      <Compass className="w-5 h-5 text-[#0072ce]" />
                      Interactive Ride Turnstile Dispatcher (Send Customer to Ride)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Dispatches any visitor directly to an attraction turnstile. Verifies height clearance and checks/debits ride price from wristband.
                    </p>
                  </div>
                  <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-sky-50 text-[#0072ce] border border-sky-200 font-bold">
                    Turnstile Simulation
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  
                  {/* Select Customer */}
                  <div className="md:col-span-5 space-y-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Select Park Visitor:
                    </label>
                    <select
                      value={dispatchBandId}
                      onChange={(e) => setDispatchBandId(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-[#002244] focus:ring-2 focus:ring-[#0072ce]"
                    >
                      <option value="">-- Choose Customer --</option>
                      {telemetryList.map(c => (
                        <option key={c.Band_ID} value={c.Band_ID}>
                          {c.Full_Name} ({c.Band_UID}) · ₹{c.Wallet_Balance.toFixed(0)} · {c.Height_cm}cm
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select Ride */}
                  <div className="md:col-span-5 space-y-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Select Disney / Wonderla Ride:
                    </label>
                    <select
                      value={dispatchAttractionId}
                      onChange={(e) => setDispatchAttractionId(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-[#002244] focus:ring-2 focus:ring-[#0072ce]"
                    >
                      <option value="">-- Choose Attraction --</option>
                      {attractionsList.map(a => (
                        <option key={a.Attraction_ID} value={a.Attraction_ID}>
                          {a.Attraction_Name} · ₹{parseFloat(a.Ride_Price || 150).toFixed(0)} · Min {a.Min_Height_cm}cm
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Action Button */}
                  <div className="md:col-span-2">
                    <button
                      type="button"
                      onClick={handleDispatchRide}
                      disabled={dispatchLoading || !dispatchBandId || !dispatchAttractionId}
                      className="w-full py-2.5 rounded-xl bg-[#0072ce] hover:bg-[#0284c7] disabled:bg-slate-300 text-white font-bold text-xs shadow-md shadow-sky-500/25 transition-all flex items-center justify-center gap-1.5"
                    >
                      {dispatchLoading ? 'Verifying...' : '⚡ Board Ride'}
                    </button>
                  </div>

                </div>

                {/* Dispatch Result Notification */}
                {dispatchResult && (
                  <div className={`mt-4 p-4 rounded-2xl border text-xs font-mono flex items-center justify-between ${
                    dispatchResult.status === 'GRANTED' || dispatchResult.success
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : 'bg-rose-50 border-rose-300 text-rose-800'
                  }`}>
                    <div className="flex items-center gap-2">
                      {dispatchResult.status === 'GRANTED' || dispatchResult.success ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                      )}
                      <div>
                        <span className="font-bold block">
                          {dispatchResult.status === 'GRANTED' ? 'TURNSTILE UNLOCKED - ENTRY GRANTED' : 'ENTRY DENIED BY RELATIONAL RULE'}
                        </span>
                        <span>{dispatchResult.message || dispatchResult.reason}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setDispatchResult(null)}
                      className="text-slate-400 hover:text-slate-700 text-sm font-bold ml-2"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* Customer Filter and Search Bar */}
              <div className="p-4 rounded-2xl bg-white border border-sky-100 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs font-bold text-slate-500">Filter Status:</span>
                  <div className="flex items-center gap-1 overflow-x-auto">
                    {[
                      { id: 'ALL', label: `All (${telemetryList.length})` },
                      { id: 'ON_RIDE', label: `On Ride (${telemetryList.filter(c => c.currentActivity?.state === 'ON_RIDE').length})` },
                      { id: 'QUEUED', label: `In Queue (${telemetryList.filter(c => c.currentActivity?.state === 'QUEUED').length})` },
                      { id: 'LOCKER', label: `Locker (${telemetryList.filter(c => c.activeLocker).length})` }
                    ].map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setTelemetryFilter(f.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                          telemetryFilter === f.id
                            ? 'bg-[#0072ce] text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-sky-50'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search visitor or UID..."
                    value={telemetrySearch}
                    onChange={(e) => setTelemetrySearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0072ce]"
                  />
                </div>
              </div>

              {/* Customer Telemetry Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {telemetryList
                  .filter(c => {
                    if (telemetryFilter === 'ON_RIDE') return c.currentActivity?.state === 'ON_RIDE';
                    if (telemetryFilter === 'QUEUED') return c.currentActivity?.state === 'QUEUED';
                    if (telemetryFilter === 'LOCKER') return !!c.activeLocker;
                    return true;
                  })
                  .filter(c => {
                    if (!telemetrySearch) return true;
                    const q = telemetrySearch.toLowerCase();
                    return c.Full_Name?.toLowerCase().includes(q) || 
                           c.Band_UID?.toLowerCase().includes(q) ||
                           c.currentActivity?.label?.toLowerCase().includes(q);
                  })
                  .map(c => (
                    <div 
                      key={c.Visitor_ID}
                      className="p-5 rounded-3xl bg-white border border-sky-100 shadow-md hover:shadow-xl transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Visitor Header */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#0072ce] to-sky-400 flex items-center justify-center text-white font-extrabold text-sm shadow-md">
                              {c.Full_Name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <h4 className="font-extrabold text-base text-[#002244]">
                                {c.Full_Name}
                              </h4>
                              <span className="text-[11px] font-mono text-[#0072ce] font-bold">
                                {c.Band_UID}
                              </span>
                            </div>
                          </div>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            c.Wristband_Status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {c.Wristband_Status}
                          </span>
                        </div>

                        {/* Current Real-Time Activity Status Badge */}
                        <div className={`p-3 rounded-2xl border text-xs mb-3 ${
                          c.currentActivity?.state === 'ON_RIDE'
                            ? 'bg-purple-50 border-purple-200 text-purple-900'
                            : c.currentActivity?.state === 'QUEUED'
                              ? 'bg-sky-50 border-sky-200 text-[#002244]'
                              : c.currentActivity?.state === 'LOCKER'
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        }`}>
                          <div className="flex items-center gap-2">
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#0072ce]" />
                            </span>
                            <span className="font-extrabold text-[11px] uppercase tracking-wider">
                              CURRENT LIVE STATUS
                            </span>
                          </div>
                          <div className="font-bold text-sm mt-1">
                            {c.currentActivity?.label}
                          </div>
                          {c.currentActivity?.slotTime && (
                            <span className="text-[11px] opacity-80 block mt-0.5 font-mono">
                              Slot: {c.currentActivity.slotTime}
                            </span>
                          )}
                        </div>

                        {/* Demographic & Wallet Stats */}
                        <div className="grid grid-cols-2 gap-2 text-xs font-mono p-3 rounded-2xl bg-slate-50 border border-slate-200 mb-4">
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase">Wallet Balance</span>
                            <span className="text-base font-extrabold text-[#002244]">
                              ₹{c.Wallet_Balance.toFixed(2)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase">Rider Height</span>
                            <span className="text-sm font-bold text-slate-700">
                              {c.Height_cm} cm
                            </span>
                          </div>
                          <div className="col-span-2 pt-1 border-t border-slate-200 flex justify-between text-[11px]">
                            <span className="text-slate-500 font-sans">Total Park Purchases:</span>
                            <span className="font-bold text-rose-600">₹{c.totalSpent.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            setDispatchBandId(String(c.Band_ID));
                            window.scrollTo({ top: 120, behavior: 'smooth' });
                          }}
                          className="py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-[#0072ce] font-bold text-xs border border-sky-200 transition-colors flex items-center justify-center gap-1"
                        >
                          <Compass className="w-3.5 h-3.5" />
                          <span>Dispatch Ride</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedVisitor360(c)}
                          className="py-2 rounded-xl bg-[#0072ce] hover:bg-[#0284c7] text-white font-bold text-xs shadow-sm transition-colors flex items-center justify-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Visitor 360</span>
                        </button>
                      </div>

                    </div>
                  ))}
              </div>

            </div>
          )}

          {/* 2.1 WALLET MANAGEMENT */}
          {operationsTab === 'wallet' && (
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              <div className="p-6 rounded-3xl bg-white border border-sky-100 shadow-xl shadow-sky-100/60 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Coins className="w-5 h-5 text-amber-400" />
                    Top-up Contactless Wristband Wallet
                  </h3>
                  <p className="text-xs text-slate-400">
                    Inserts into Wallet_Transaction. The trigger trg_wallet_transaction_apply updates the live balance and broadcasts SSE to the customer viewport instantly.
                  </p>
                </div>

                <form onSubmit={handleTopup} className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1">
                      Select Visitor / Wristband:
                    </label>
                    <select
                      value={selectedBandForTopup}
                      onChange={(e) => setSelectedBandForTopup(e.target.value)}
                      className="w-full glass-input rounded-xl px-4 py-2.5 text-xs font-mono text-white"
                    >
                      {wristbandsList.map(b => (
                        <option key={b.Band_ID} value={b.Band_ID} className="bg-slate-900">
                          {b.Full_Name} ({b.Band_UID}) — Current Balance: ₹{b.Wallet_Balance}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1">
                      Top-up Amount (₹ INR):
                    </label>
                    <input
                      type="number"
                      step="50"
                      min="50"
                      value={topupAmount}
                      onChange={(e) => setTopupAmount(e.target.value)}
                      className="w-full glass-input rounded-xl px-4 py-2.5 text-lg font-mono font-bold text-white"
                      required
                    />

                    {/* Quick Amount Chips */}
                    <div className="flex gap-2 mt-2">
                      {['100', '500', '1000', '2000'].map(amt => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setTopupAmount(amt)}
                          className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-cyan-300 border border-slate-700"
                        >
                          +₹{amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={topupLoading}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold font-mono text-xs transition-all shadow-lg shadow-amber-950"
                  >
                    {topupLoading ? 'Applying Trigger...' : 'Apply Top-up & Issue Thermal Receipt'}
                  </button>
                </form>
              </div>

              {/* Thermal Receipt Preview */}
              <div className="p-6 rounded-3xl bg-white border border-sky-100 shadow-xl shadow-sky-100/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono text-slate-400 font-bold">
                      PRINTABLE THERMAL RECEIPT
                    </span>
                    {printableReceipt && (
                      <button
                        onClick={() => window.print()}
                        className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 flex items-center gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Print Thermal Receipt
                      </button>
                    )}
                  </div>

                  {printableReceipt ? (
                    <div id="printable-receipt" className="p-6 rounded-2xl bg-white text-slate-950 font-mono text-xs space-y-3 shadow-xl">
                      <div className="text-center border-b border-dashed border-slate-400 pb-3">
                        <div className="font-extrabold text-sm uppercase">Smart Theme Park</div>
                        <div className="text-[10px] text-slate-600">Front Desk Kiosk #1</div>
                        <div className="text-[10px] text-slate-600">{printableReceipt.receiptNumber}</div>
                        <div className="text-[10px] text-slate-500">{printableReceipt.dateTime}</div>
                      </div>

                      <div className="space-y-1 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Visitor:</span>
                          <span className="font-bold">{printableReceipt.visitorName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">RFID Band UID:</span>
                          <span className="font-bold">{printableReceipt.bandUid}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Previous Balance:</span>
                          <span>₹{printableReceipt.previousBalance.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t border-dashed border-slate-400 pt-1 text-sm font-bold">
                          <span>Top-up Amount:</span>
                          <span>₹{printableReceipt.topUpAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t border-dashed border-slate-400 pt-1 font-extrabold">
                          <span>Closing Balance:</span>
                          <span>₹{printableReceipt.closingBalance.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="text-center text-[10px] text-slate-500 border-t border-dashed border-slate-400 pt-2">
                        Validated by Trigger trg_wallet_transaction_apply. Have a magical day!
                      </div>
                    </div>
                  ) : (
                    <div className="py-20 text-center text-slate-500 text-xs font-mono">
                      Execute a top-up to generate an instant printable thermal receipt.
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* 2.15 ACCOUNT ACTIVATION & OPENING FLOAT ALLOTMENT */}
          {operationsTab === 'activation' && (
            <div className="mt-6 space-y-8 font-sans">
              
              {/* Header Card */}
              <div className="p-6 rounded-3xl bg-white border border-sky-100 shadow-xl shadow-sky-100/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                    <CheckCircle2 className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#002244]">
                      Pending Account Activations & Opening Float Allotment
                    </h2>
                    <p className="text-xs text-slate-500">
                      Rule: Newly registered accounts start 'Pending' with ₹0 and cannot use park services until staff allots an opening amount.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    {pendingAccounts.length} Pending
                  </span>
                  <button
                    onClick={() => { fetchPendingAccounts(); fetchActivationHistory(); }}
                    className="px-3.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-[#0072ce] font-bold text-xs border border-sky-200 transition-colors"
                  >
                    Refresh List
                  </button>
                </div>
              </div>

              {/* Pending Accounts Table */}
              <div className="p-6 rounded-3xl bg-white border border-sky-100 shadow-xl shadow-sky-100/60">
                <h3 className="text-sm font-bold text-[#002244] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span>⏳ Awaiting Counter Float Allotment</span>
                  <span className="text-xs font-mono text-slate-400">({pendingAccounts.length} guest{pendingAccounts.length === 1 ? '' : 's'})</span>
                </h3>

                {pendingAccounts.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-xs">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                    <p className="font-bold text-slate-700">No pending accounts!</p>
                    <p className="text-slate-400 mt-0.5">All customer wristbands are fully active and funded.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-sky-50/80 text-slate-600 border-b border-sky-100 uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="px-4 py-3">Visitor ID</th>
                          <th className="px-4 py-3">Guest Name</th>
                          <th className="px-4 py-3">Height</th>
                          <th className="px-4 py-3">Band UID</th>
                          <th className="px-4 py-3">Phone</th>
                          <th className="px-4 py-3">Registered At</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pendingAccounts.map((acc) => (
                          <tr key={acc.Band_ID} className="hover:bg-amber-50/40 transition-colors">
                            <td className="px-4 py-3 text-slate-400">#{acc.Visitor_ID}</td>
                            <td className="px-4 py-3 font-bold text-[#002244] font-sans">{acc.Full_Name}</td>
                            <td className="px-4 py-3 text-slate-600">{acc.Height_cm} cm</td>
                            <td className="px-4 py-3 font-bold text-[#0072ce]">{acc.Band_UID}</td>
                            <td className="px-4 py-3 text-slate-500">{acc.Phone || 'N/A'}</td>
                            <td className="px-4 py-3 text-slate-400 text-[11px]">
                              {new Date(acc.Registration_Date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                                Pending
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedPendingForAllot(acc);
                                    setAllotAmount('500');
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-[#0072ce] hover:bg-[#0284c7] text-white font-bold text-xs shadow-md shadow-sky-500/20 transition-all flex items-center gap-1 font-sans"
                                >
                                  <span>⚡</span>
                                  <span>Allot Amount</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectPending(acc.Band_ID)}
                                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 text-xs font-bold transition-all"
                                  title="Reject Registration"
                                >
                                  Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Modal: Allot Amount */}
              {selectedPendingForAllot && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                  <div className="w-full max-w-md bg-white border border-sky-200 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="text-lg font-bold text-[#002244]">Allot Opening Float</h3>
                        <p className="text-xs text-slate-500">
                          {selectedPendingForAllot.Full_Name} ({selectedPendingForAllot.Band_UID})
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedPendingForAllot(null)}
                        className="text-slate-400 hover:text-slate-700 p-1"
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleActivateAccount} className="space-y-4 text-xs font-sans">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">
                          Opening Amount (₹) *
                        </label>
                        <input
                          type="number"
                          step="50"
                          min="50"
                          value={allotAmount}
                          onChange={(e) => setAllotAmount(e.target.value)}
                          placeholder="e.g. 500"
                          className="w-full rounded-xl px-4 py-2.5 text-base font-bold font-mono border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0072ce]"
                          required
                        />

                        {/* Quick Chips */}
                        <div className="flex gap-2 mt-2 font-mono">
                          {['500', '1000', '2000'].map((chip) => (
                            <button
                              key={chip}
                              type="button"
                              onClick={() => setAllotAmount(chip)}
                              className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                                allotAmount === chip
                                  ? 'bg-[#0072ce] text-white border-[#0072ce]'
                                  : 'bg-sky-50 text-[#0072ce] border-sky-200 hover:bg-sky-100'
                              }`}
                            >
                              ₹{chip}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">
                          Payment Mode *
                        </label>
                        <select
                          value={allotMode}
                          onChange={(e) => setAllotMode(e.target.value)}
                          className="w-full rounded-xl px-4 py-2.5 text-xs font-bold font-sans border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0072ce]"
                        >
                          <option value="Cash">Cash (Physical Bill Counter)</option>
                          <option value="UPI">UPI (QR Contactless)</option>
                          <option value="Card">Card (POS Terminal Swipe)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">
                          Remarks / Counter Note
                        </label>
                        <input
                          type="text"
                          value={allotRemarks}
                          onChange={(e) => setAllotRemarks(e.target.value)}
                          placeholder="e.g. Counter 2 Opening Float"
                          className="w-full rounded-xl px-4 py-2 text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0072ce]"
                        />
                      </div>

                      <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-[11px] text-[#0072ce] space-y-1">
                        <span className="font-bold">Transaction Ledger Pipeline:</span>
                        <p className="text-slate-600">
                          Calls <code className="text-[#0072ce]">sp_activate_account</code> in an atomic transaction: credits ₹{allotAmount} into <code className="text-[#0072ce]">Wallet_Transaction</code>, inserts into <code className="text-[#0072ce]">Account_Activation</code>, sets Status to 'Active', and triggers SSE customer unlock.
                        </p>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setSelectedPendingForAllot(null)}
                          className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={activationLoading}
                          className="px-5 py-2.5 rounded-xl bg-[#0072ce] hover:bg-[#0284c7] text-white font-bold shadow-md shadow-sky-500/25 flex items-center gap-1.5"
                        >
                          {activationLoading ? 'Activating Wristband...' : 'Confirm & Activate Wristband'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Activation Receipt Modal */}
              {activationReceipt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                  <div className="w-full max-w-sm bg-white border border-emerald-300 rounded-3xl shadow-2xl p-6 text-center space-y-4 font-sans">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center border-2 border-emerald-300">
                      <CheckCircle className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold text-[#002244]">Activation Receipt</h3>
                      <p className="text-xs text-slate-500">Account is now Active with opening float</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs font-mono space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Wristband:</span>
                        <span className="font-bold text-[#0072ce]">{activationReceipt.bandUid}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Guest:</span>
                        <span className="font-bold text-slate-800">{activationReceipt.visitorName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Allotted Float:</span>
                        <span className="font-bold text-emerald-600">₹{parseFloat(activationReceipt.openingAmount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Payment:</span>
                        <span className="font-bold text-slate-700">{activationReceipt.paymentMode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Allocated By:</span>
                        <span className="font-bold text-slate-700">{activationReceipt.allocatedBy}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActivationReceipt(null)}
                      className="w-full py-2.5 rounded-xl bg-[#0072ce] hover:bg-[#0284c7] text-white font-bold text-xs shadow-md shadow-sky-500/25"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}

              {/* Activation History Table */}
              <div className="p-6 rounded-3xl bg-white border border-sky-100 shadow-xl shadow-sky-100/60">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#002244] uppercase tracking-wider">
                      📜 Activation History (Account_Activation Table)
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">
                      Audit trail of all initial float allocations recorded by administrators.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    {activationHistory.length} Record{activationHistory.length === 1 ? '' : 's'}
                  </span>
                </div>

                {activationHistory.length === 0 ? (
                  <p className="text-xs text-slate-400 font-mono text-center py-6">
                    No activation history records found yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-sky-50/80 text-slate-600 border-b border-sky-100 uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="px-4 py-3">Act ID</th>
                          <th className="px-4 py-3">Band UID</th>
                          <th className="px-4 py-3">Visitor Name</th>
                          <th className="px-4 py-3">Opening Float</th>
                          <th className="px-4 py-3">Mode</th>
                          <th className="px-4 py-3">Allocated By</th>
                          <th className="px-4 py-3">Remarks</th>
                          <th className="px-4 py-3">Allocated At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activationHistory.map((row) => (
                          <tr key={row.Activation_ID} className="hover:bg-sky-50/40 transition-colors">
                            <td className="px-4 py-3 text-slate-400">#{row.Activation_ID}</td>
                            <td className="px-4 py-3 font-bold text-[#0072ce]">{row.Band_UID}</td>
                            <td className="px-4 py-3 font-sans font-bold text-slate-800">{row.Full_Name}</td>
                            <td className="px-4 py-3 font-bold text-emerald-600">₹{parseFloat(row.Opening_Amount).toFixed(2)}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                {row.Payment_Mode}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{row.Allocated_By}</td>
                            <td className="px-4 py-3 text-slate-500 italic max-w-xs truncate">{row.Remarks || '-'}</td>
                            <td className="px-4 py-3 text-slate-400 text-[11px]">
                              {new Date(row.Allocated_At).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* 2.16 KEYLESS SMART LOCKERS & MASTER CONTROL PORTAL */}
          {operationsTab === 'lockers' && (
            <div className="mt-6 space-y-8 font-sans">
              
              {/* Header Card */}
              <div className="p-6 rounded-3xl bg-white border border-sky-100 shadow-xl shadow-sky-100/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center border border-cyan-200">
                    <Lock className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#002244]">
                      Keyless Smart Lockers & Master Control Portal
                    </h2>
                    <p className="text-xs text-slate-500">
                      Live occupancy monitoring, administrator master unlock override (<code className="text-[#0072ce]">sp_release_locker</code>), and dynamic locker addition when all lockers are full.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchLockersOverview}
                    className="px-3.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-[#0072ce] font-bold text-xs border border-sky-200 transition-colors"
                  >
                    Refresh Lockers
                  </button>
                </div>
              </div>

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-sky-100 shadow-md text-center">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Total Lockers</span>
                  <span className="text-2xl font-extrabold text-[#002244] font-mono">{lockersList.length}</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Physical Compartments</span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-amber-100 shadow-md text-center">
                  <span className="text-[10px] font-mono text-amber-500 block uppercase">Occupied</span>
                  <span className="text-2xl font-extrabold text-amber-600 font-mono">
                    {lockersList.filter(l => l.Rental_Status === 'Active').length}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Active Guest Rentals</span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-emerald-100 shadow-md text-center">
                  <span className="text-[10px] font-mono text-emerald-500 block uppercase">Vacant Available</span>
                  <span className="text-2xl font-extrabold text-emerald-600 font-mono">
                    {lockersList.filter(l => l.Rental_Status !== 'Active').length}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Ready for Guest Tap</span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-sky-100 shadow-md text-center">
                  <span className="text-[10px] font-mono text-sky-500 block uppercase">Occupancy Rate</span>
                  <span className="text-2xl font-extrabold text-[#0072ce] font-mono">
                    {lockersList.length > 0
                      ? Math.round((lockersList.filter(l => l.Rental_Status === 'Active').length / lockersList.length) * 100)
                      : 0}%
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Park Utilization</span>
                </div>
              </div>

              {/* Fullness Alert if all lockers are occupied */}
              {lockersList.length > 0 && lockersList.filter(l => l.Rental_Status !== 'Active').length === 0 && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-center justify-between gap-3 animate-pulse">
                  <div className="flex items-center gap-2 font-bold">
                    <span>🚨</span>
                    <span>ALL LOCKERS IN THE PARK ARE 100% OCCUPIED! Guests cannot rent new lockers. Add more compartments below.</span>
                  </div>
                </div>
              )}

              {/* Form Card: Commission New Lockers (When all are full) */}
              <div className="p-6 rounded-3xl bg-white border border-sky-100 shadow-xl shadow-sky-100/60">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#002244] uppercase tracking-wider">
                      Commission New Locker Compartment (Expand Capacity)
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">
                      Add a new locker box to any zone. Enforced by unique constraint <code className="text-[#0072ce]">UNIQUE(Zone, Number)</code>.
                    </p>
                  </div>
                </div>

                {addLockerSuccess && (
                  <div className="p-3 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{addLockerSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleAddLocker} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1 font-sans">Locker Zone *</label>
                    <select
                      value={newLockerZone}
                      onChange={(e) => setNewLockerZone(e.target.value)}
                      className="w-full rounded-xl px-4 py-2.5 bg-slate-50 border border-slate-300 font-sans text-xs focus:ring-2 focus:ring-[#0072ce]"
                    >
                      <option value="Entrance Zone">Entrance Zone (Main Gate)</option>
                      <option value="Water Zone">Water Zone (Slide Haven)</option>
                      <option value="Thrill Zone">Thrill Zone (Coaster Area)</option>
                      <option value="Adventure Zone">Adventure Zone</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1 font-sans">Locker Number *</label>
                    <input
                      type="text"
                      value={newLockerNumber}
                      onChange={(e) => setNewLockerNumber(e.target.value)}
                      placeholder="e.g. L-103, L-203, L-301"
                      className="w-full rounded-xl px-4 py-2.5 bg-slate-50 border border-slate-300 font-mono text-xs uppercase focus:ring-2 focus:ring-[#0072ce]"
                      required
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={addLockerLoading}
                      className="w-full py-2.5 rounded-xl bg-[#0072ce] hover:bg-[#0284c7] text-white font-bold text-xs font-sans shadow-md shadow-sky-500/25 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{addLockerLoading ? 'Adding...' : 'Commission Locker'}</span>
                    </button>
                  </div>
                </form>

                {/* Quick Auto-Suggest Chips */}
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <span className="text-[11px] text-slate-400 font-sans">Quick Suggestions:</span>
                  {['L-103', 'L-104', 'L-203', 'L-204', 'L-301'].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        setNewLockerNumber(num);
                        if (num.startsWith('L-1')) setNewLockerZone('Entrance Zone');
                        else if (num.startsWith('L-2')) setNewLockerZone('Water Zone');
                        else setNewLockerZone('Adventure Zone');
                      }}
                      className="px-2 py-0.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-[#0072ce] border border-sky-200 text-[10px] font-mono font-bold"
                    >
                      +{num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Locker Grid & Zone Filter */}
              <div className="p-6 rounded-3xl bg-white border border-sky-100 shadow-xl shadow-sky-100/60 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-[#002244] uppercase tracking-wider">
                      Compartments Grid & Master Release Controls
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">
                      Staff can force-release any occupied locker using MySQL procedure <code className="text-[#0072ce]">sp_release_locker(rental_id, 0)</code>.
                    </p>
                  </div>

                  {/* Filter chips */}
                  <div className="flex gap-1.5 overflow-x-auto text-xs font-mono">
                    {['ALL', 'Entrance Zone', 'Water Zone', 'Thrill Zone', 'Adventure Zone'].map((z) => (
                      <button
                        key={z}
                        onClick={() => setSelectedLockerZoneFilter(z)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                          selectedLockerZoneFilter === z
                            ? 'bg-[#002244] text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {z}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Locker Boxes Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {lockersList
                    .filter((l) => selectedLockerZoneFilter === 'ALL' || l.Zone === selectedLockerZoneFilter)
                    .map((locker) => {
                      const isOccupied = locker.Rental_Status === 'Active';
                      return (
                        <div
                          key={locker.Locker_ID}
                          className={`p-5 rounded-2xl border transition-all shadow-sm flex flex-col justify-between ${
                            isOccupied
                              ? 'bg-amber-50/50 border-amber-200 shadow-amber-500/5'
                              : 'bg-emerald-50/30 border-emerald-200 shadow-emerald-500/5 hover:border-emerald-400'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                                {locker.Zone}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                                  isOccupied
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                }`}
                              >
                                {isOccupied ? 'Occupied' : 'Vacant'}
                              </span>
                            </div>

                            <div className="text-2xl font-extrabold font-mono text-[#002244] mb-2 flex items-center justify-between">
                              <span>{locker.Number}</span>
                              {isOccupied ? (
                                <Lock className="w-5 h-5 text-amber-500" />
                              ) : (
                                <span className="text-xs px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 font-sans font-bold">
                                  Available
                                </span>
                              )}
                            </div>

                            {isOccupied ? (
                              <div className="p-3 rounded-xl bg-white border border-amber-200 text-xs font-mono space-y-1 mb-3">
                                <div className="text-[10px] text-slate-400 uppercase">Renter Details</div>
                                <div className="font-bold text-slate-800 font-sans">{locker.Renter_Name}</div>
                                <div className="text-[11px] text-[#0072ce]">{locker.Band_UID}</div>
                                {locker.Rental_Start_Time && (
                                  <div className="text-[10px] text-slate-400">
                                    Since: {new Date(locker.Rental_Start_Time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="p-3 rounded-xl bg-white/70 border border-dashed border-emerald-200 text-[11px] text-emerald-700 font-sans mb-3 text-center">
                                ✨ Ready for guest contactless RFID wristband tap.
                              </div>
                            )}
                          </div>

                          {/* Action Button */}
                          <div>
                            {isOccupied ? (
                              <button
                                type="button"
                                onClick={() => handleForceReleaseLocker(locker.Rental_ID, locker.Number, locker.Zone)}
                                className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition-all flex items-center justify-center gap-1 font-sans"
                              >
                                <span>🔓 Master Unlock & Release</span>
                              </button>
                            ) : (
                              <div className="text-center py-2 text-xs font-mono text-emerald-600 font-semibold bg-emerald-50 rounded-xl border border-emerald-100">
                                Open for Visitors
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

            </div>
          )}

          {/* 2.2 REGISTRATION & VISITOR MANAGER */}
          {operationsTab === 'registration' && (
            <div className="mt-6 space-y-8">
              
              {/* Registration Form Card */}
              <div className="max-w-3xl mx-auto p-6 sm:p-8 rounded-3xl bg-white border border-sky-100 shadow-xl shadow-sky-100/60">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-2xl bg-sky-50 text-[#0072ce] flex items-center justify-center border border-sky-200">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-[#002244]">
                      Visitor Registration Desk & Wristband Issuance
                    </h3>
                    <p className="text-xs text-slate-500">
                      Registers visitor, issues waterproof RFID wristband, and credits initial float in ONE atomic transaction with automatic rollback.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleRegisterVisitor} className="mt-6 space-y-4 text-xs font-mono">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1 font-sans">Full Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Rahul Sen"
                        value={newVisitorName}
                        onChange={(e) => setNewVisitorName(e.target.value)}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-slate-800"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1 font-sans">Height in cm (For Ride Safety) *</label>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="165.0"
                        value={newVisitorHeight}
                        onChange={(e) => setNewVisitorHeight(e.target.value)}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-slate-800"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1 font-sans">Email Address *</label>
                      <input
                        type="email"
                        placeholder="rahul.sen@example.com"
                        value={newVisitorEmail}
                        onChange={(e) => setNewVisitorEmail(e.target.value)}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-slate-800"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1 font-sans">Phone Number *</label>
                      <input
                        type="tel"
                        placeholder="+91 9876543220"
                        value={newVisitorPhone}
                        onChange={(e) => setNewVisitorPhone(e.target.value)}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-slate-800"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1 font-sans">Opening Wallet Balance (₹ INR)</label>
                    <input
                      type="number"
                      step="50"
                      min="0"
                      value={newVisitorFloat}
                      onChange={(e) => setNewVisitorFloat(e.target.value)}
                      className="w-full glass-input rounded-xl px-4 py-2.5 text-[#002244] font-bold text-base"
                    />

                    {/* Quick Float Chips */}
                    <div className="flex gap-2 mt-2 font-mono">
                      {['250', '500', '1000', '2500', '5000'].map(amt => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setNewVisitorFloat(amt)}
                          className="px-3 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-xs text-[#0072ce] font-bold border border-sky-200 transition-colors"
                        >
                          +₹{amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-2xl bg-[#0072ce] hover:bg-[#0284c7] text-white font-bold text-sm transition-all shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 font-sans"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Register Visitor & Issue RFID Wristband (Atomic Transaction)</span>
                  </button>
                </form>

                {regSuccessData && (
                  <div className="mt-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs font-mono space-y-1 text-emerald-800">
                    <div className="font-bold text-emerald-700 flex items-center gap-1.5 text-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      Registration Transaction Committed Successfully!
                    </div>
                    <div>Visitor ID: #{regSuccessData.visitorId}</div>
                    <div>Issued Band UID: <span className="font-bold text-[#002244]">{regSuccessData.bandUid}</span></div>
                    <div>Opening Balance: <span className="font-bold text-emerald-700">₹{parseFloat(newVisitorFloat || 0).toFixed(2)}</span></div>
                  </div>
                )}
              </div>

              {/* All Registered Visitors & RFID Management Table */}
              <div className="p-6 sm:p-8 rounded-3xl bg-white border border-sky-100 shadow-xl shadow-sky-100/60">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                  <div>
                    <h3 className="text-xl font-extrabold text-[#002244] flex items-center gap-2">
                      <Users className="w-5 h-5 text-[#0072ce]" />
                      Registered Park Visitors & Wristband Manager ({telemetryList.length})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Administrator can directly update height, edit details, and set or modify wallet balances.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={fetchTelemetry}
                    className="px-4 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-[#0072ce] font-bold text-xs border border-sky-200 transition-colors"
                  >
                    Refresh Directory
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-sky-50 text-[#002244] border-b border-sky-100 font-bold">
                        <tr>
                          <th className="px-4 py-3">ID</th>
                          <th className="px-4 py-3">Visitor Name</th>
                          <th className="px-4 py-3">Height</th>
                          <th className="px-4 py-3">Band UID</th>
                          <th className="px-4 py-3">Wallet Balance</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {telemetryList.map(v => (
                          <tr key={v.Visitor_ID} className="hover:bg-sky-50/60 transition-colors">
                            <td className="px-4 py-3 text-slate-400">#{v.Visitor_ID}</td>
                            <td className="px-4 py-3 font-bold text-[#002244]">{v.Full_Name}</td>
                            <td className="px-4 py-3 text-slate-600">{v.Height_cm} cm</td>
                            <td className="px-4 py-3 text-[#0072ce] font-bold">{v.Band_UID}</td>
                            <td className="px-4 py-3 font-extrabold text-emerald-700">₹{v.Wallet_Balance.toFixed(2)}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                v.Wristband_Status === 'Active'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {v.Wristband_Status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleOpenEditVisitor(v)}
                                className="px-3.5 py-1.5 rounded-xl bg-[#0072ce] hover:bg-[#0284c7] text-white font-bold text-xs shadow-sm transition-all inline-flex items-center gap-1.5"
                              >
                                <Radio className="w-3.5 h-3.5 text-sky-200" />
                                <span>Edit & Assign Band</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* 2.3 POS SIMULATOR */}
          {operationsTab === 'pos' && (
            <div className="mt-6 max-w-2xl mx-auto p-6 sm:p-8 rounded-3xl bg-white border border-sky-100 shadow-xl shadow-sky-100/60 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-pink-400" />
                  Point-of-Sale (POS) Contactless Tap Simulator
                </h3>
                <p className="text-xs text-slate-400">
                  Simulate tap-and-pay transactions at any retail or snack outlet. Overdrawing triggers the database error rejection.
                </p>
              </div>

              <div className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-slate-300 mb-1">Select POS Outlet:</label>
                  <select
                    value={posSelectedOutlet}
                    onChange={(e) => setPosSelectedOutlet(e.target.value)}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-white"
                  >
                    {outletsList.map(o => (
                      <option key={o.id} value={o.id} className="bg-slate-900">
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Tap Customer Wristband:</label>
                  <select
                    value={posSelectedBand}
                    onChange={(e) => setPosSelectedBand(e.target.value)}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-white"
                  >
                    {wristbandsList.map(b => (
                      <option key={b.Band_ID} value={b.Band_ID} className="bg-slate-900">
                        {b.Full_Name} ({b.Band_UID}) — Balance: ₹{b.Wallet_Balance}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Charge Amount (₹ INR):</label>
                  <input
                    type="number"
                    value={posAmount}
                    onChange={(e) => setPosAmount(e.target.value)}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-white font-bold text-base"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Tip: Enter ₹1000 for Kabir Nair (Balance ₹420) to trigger overdraw rejection.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleSimulatePos}
                  className="w-full py-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs transition-all shadow-lg shadow-pink-950 flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Tap Wristband & Process Purchase (sp_make_purchase)
                </button>
              </div>

              {posResult && (
                <div className={`p-4 rounded-2xl border text-xs font-mono ${
                  posResult.status === 'APPROVED'
                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-800 text-rose-300'
                }`}>
                  <div className="font-bold flex items-center gap-2">
                    {posResult.status === 'APPROVED' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    <span>Transaction {posResult.status}</span>
                  </div>
                  <p className="mt-1">{posResult.message}</p>
                </div>
              )}
            </div>
          )}

          {/* 2.4 TURNSTILE RIDE TAP SIMULATOR */}
          {operationsTab === 'turnstile' && (
            <div className="mt-6 max-w-2xl mx-auto p-6 sm:p-8 rounded-3xl bg-white border border-sky-100 shadow-xl shadow-sky-100/60 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Compass className="w-5 h-5 text-cyan-400" />
                  Ride Turnstile RFID Scanner Simulation
                </h3>
                <p className="text-xs text-slate-400">
                  Simulates physical turnstile tap-in. Stored procedure sp_ride_tap_in verifies wristband status, height safety limits, and virtual queue pass validity.
                </p>
              </div>

              <div className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-slate-300 mb-1">Select Ride Turnstile:</label>
                  <select
                    value={turnstileAttraction}
                    onChange={(e) => setTurnstileAttraction(e.target.value)}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-white"
                  >
                    <option value="1">Dragon Fury Rollercoaster (Min 140 cm)</option>
                    <option value="4">Sky Drop Tower (Min 150 cm)</option>
                    <option value="2">Thunder Rapids Water Slide (Min 120 cm)</option>
                    <option value="3">4D Galaxy Theater (Min 90 cm)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Tap Visitor Wristband:</label>
                  <select
                    value={turnstileBand}
                    onChange={(e) => setTurnstileBand(e.target.value)}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-white"
                  >
                    {wristbandsList.map(b => (
                      <option key={b.Band_ID} value={b.Band_ID}>
                        {b.Full_Name} ({b.Height_cm} cm) — UID {b.Band_UID}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleSimulateTurnstile}
                  className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-cyan-950 flex items-center justify-center gap-2"
                >
                  <Radio className="w-4 h-4 animate-pulse" />
                  Tap Turnstile Gate (sp_ride_tap_in)
                </button>
              </div>

              {/* Turnstile Animated Visual Gate */}
              {turnstileResult && (
                <div className={`p-6 rounded-3xl border-2 text-center transition-all ${
                  turnstileResult.status === 'GRANTED'
                    ? 'bg-emerald-950/40 border-emerald-500 shadow-2xl shadow-emerald-950/50'
                    : 'bg-rose-950/40 border-rose-500 shadow-2xl shadow-rose-950/50'
                }`}>
                  <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-3 ${
                    turnstileResult.status === 'GRANTED'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {turnstileResult.status === 'GRANTED' ? <CheckCircle className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
                  </div>

                  <span className={`text-2xl font-extrabold font-mono uppercase tracking-wider block ${
                    turnstileResult.status === 'GRANTED' ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    TURNSTILE GATE: {turnstileResult.status}
                  </span>

                  <p className="text-sm font-mono text-slate-200 mt-2 max-w-md mx-auto">
                    {turnstileResult.reason}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 2.5 REVENUE DASHBOARD */}
          {operationsTab === 'revenue' && (
            <div className="mt-6 space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="p-6 rounded-3xl bg-white border border-sky-100 shadow-xl shadow-sky-100/60">
                  <span className="text-xs font-mono text-slate-400">TOTAL FLOATING WALLET MONEY</span>
                  <div className="text-3xl font-extrabold font-mono text-cyan-400 mt-2">
                    ₹{revenueData?.summary?.totalFloat?.toFixed(2) || '0.00'}
                  </div>
                  <span className="text-xs text-slate-500 font-mono mt-1 block">Held across {revenueData?.summary?.totalWristbands} wristbands</span>
                </div>

                <div className="p-6 rounded-3xl bg-white border border-sky-100 shadow-xl shadow-sky-100/60">
                  <span className="text-xs font-mono text-slate-400">AVERAGE BALANCE PER VISITOR</span>
                  <div className="text-3xl font-extrabold font-mono text-purple-400 mt-2">
                    ₹{revenueData?.summary?.avgBalance?.toFixed(2) || '0.00'}
                  </div>
                  <span className="text-xs text-slate-500 font-mono mt-1 block">Live computed balance</span>
                </div>

                <div className="p-6 rounded-3xl bg-white border border-sky-100 shadow-xl shadow-sky-100/60">
                  <span className="text-xs font-mono text-slate-400">TOP EARNING OUTLET</span>
                  <div className="text-3xl font-extrabold font-mono text-emerald-400 mt-2">
                    {revenueData?.outletRevenue?.[0]?.Outlet_Name || 'Park Memories'}
                  </div>
                  <span className="text-xs text-slate-500 font-mono mt-1 block">
                    ₹{revenueData?.outletRevenue?.[0]?.Total_Revenue_INR} revenue
                  </span>
                </div>
              </div>

              {/* Outlet Revenue Recharts */}
              <div className="p-6 rounded-3xl bg-white border border-sky-100 shadow-xl shadow-sky-100/60">
                <h4 className="text-sm font-bold font-mono text-slate-300 uppercase mb-4">
                  Revenue per POS Outlet (Vw_Outlet_Revenue)
                </h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData?.outletRevenue || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="Outlet_Name" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                      <Bar dataKey="Total_Revenue_INR" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* 2.6 IMMUTABLE AUDIT LOG */}
          {operationsTab === 'audit' && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-purple-400" />
                    Park Audit Log (Park_Audit_Log)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Immutable event stream of turnstile entries, wallet changes, and smart locker unlock operations.
                  </p>
                </div>
                <button
                  onClick={fetchAuditLogs}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-xs font-mono text-slate-300 hover:text-white"
                >
                  Refresh Logs
                </button>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3">ID</th>
                        <th className="px-4 py-3">Event Type</th>
                        <th className="px-4 py-3">Band UID / Visitor</th>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3 text-right">Logged At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {auditLogs.map((log) => (
                        <tr key={log.Log_ID} className="hover:bg-slate-800/40">
                          <td className="px-4 py-3 text-slate-500">#{log.Log_ID}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 text-[10px] border border-purple-800">
                              {log.Event_Type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            {log.Full_Name ? `${log.Full_Name} (${log.Band_UID})` : 'System'}
                          </td>
                          <td className="px-4 py-3 text-slate-200">{log.Description}</td>
                          <td className="px-4 py-3 text-slate-500 text-right">
                            {new Date(log.Logged_At).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDIT VISITOR PROFILE & SET WALLET BALANCE */}
      {/* ======================================================== */}
      {visitorToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white border border-sky-200 rounded-3xl shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-50 text-[#0072ce] flex items-center justify-center border border-sky-200">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-[#002244]">
                    Edit Profile & Set Wallet
                  </h3>
                  <p className="text-xs text-slate-500">
                    Visitor #{visitorToEdit.Visitor_ID} · Band {visitorToEdit.Band_UID}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setVisitorToEdit(null)} 
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveVisitorEdit} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1 font-sans">Full Name *</label>
                  <input
                    type="text"
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 font-sans">Height (cm) *</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editForm.heightCm}
                    onChange={(e) => setEditForm({ ...editForm, heightCm: e.target.value })}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 font-sans">Email Address</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 font-sans">Phone Number</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-slate-800"
                  />
                </div>
              </div>

              {/* Unique RFID Wristband Assignment Block */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-indigo-950 font-bold font-sans text-xs flex items-center gap-1.5">
                    <Radio className="w-4 h-4 text-indigo-600" />
                    <span>Unique RFID Band UID (Laser-Engraved / NFC Chip) *</span>
                  </label>
                  <span className="text-[10px] font-mono text-indigo-600 bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                    1:1 UNIQUE CONSTRAINT
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editForm.bandUid}
                    onChange={(e) => setEditForm({ ...editForm, bandUid: e.target.value.toUpperCase() })}
                    className="flex-1 glass-input rounded-xl px-4 py-2 text-indigo-950 font-mono font-bold bg-white text-sm uppercase tracking-wider"
                    placeholder="e.g. UID-A101 or UID-W9201"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const rand = Math.floor(1000 + Math.random() * 9000);
                      setEditForm({ ...editForm, bandUid: `UID-WB${rand}` });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition-colors shadow-sm whitespace-nowrap flex items-center gap-1"
                    title="Generate new unique physical wristband UID"
                  >
                    <span>🎲</span> Auto-Gen
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const randHex = Math.floor(1000 + Math.random() * 9000);
                      setEditForm({ ...editForm, bandUid: `UID-NFC${randHex}` });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shadow-sm whitespace-nowrap flex items-center gap-1"
                    title="Simulate scanning a physical waterproof RFID wristband"
                  >
                    <span>📡</span> Scan Tag
                  </button>
                </div>
                <p className="text-[10px] text-indigo-800/80 font-sans">
                  Assigning a new UID updates the visitor's physical band binding in MySQL while retaining their entire balance and active lockers.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 font-sans">Wristband Operational Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-slate-800"
                >
                  <option value="Active">Active (Permits all rides & payments)</option>
                  <option value="Pending">Pending (Waiting for counter opening float)</option>
                  <option value="Inactive">Inactive (Temporarily suspended)</option>
                  <option value="Lost">Lost (Reported missing / in wave pool - all taps denied)</option>
                </select>
              </div>

              {/* Set or Adjust Wallet Balance */}
              <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200">
                <label className="block text-[#002244] font-bold mb-1 font-sans text-sm flex items-center justify-between">
                  <span>Set / Override Wallet Balance (₹ INR)</span>
                  <span className="text-[10px] text-slate-500 font-mono">Current: ₹{parseFloat(visitorToEdit.Wallet_Balance || 0).toFixed(2)}</span>
                </label>
                <input
                  type="number"
                  step="50"
                  min="0"
                  value={editForm.setWalletBalance}
                  onChange={(e) => setEditForm({ ...editForm, setWalletBalance: e.target.value })}
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-xl font-bold font-mono text-[#002244] bg-white"
                  placeholder="e.g. 2500.00"
                  required
                />

                <div className="flex gap-2 mt-2">
                  {['500', '1000', '2500', '5000'].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, setWalletBalance: amt })}
                      className="px-3 py-1 rounded-lg bg-white hover:bg-sky-100 text-xs text-[#0072ce] font-bold border border-sky-200 transition-colors shadow-sm"
                    >
                      Set to ₹{amt}
                    </button>
                  ))}
                </div>

                <p className="text-[11px] text-slate-500 mt-2 font-sans">
                  💡 Setting this amount executes an audited transaction and live-broadcasts SSE so the visitor's screen updates immediately.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setVisitorToEdit(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition-colors font-sans"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-6 py-2.5 rounded-xl bg-[#0072ce] hover:bg-[#0284c7] text-white font-bold text-xs font-sans shadow-md shadow-sky-500/25 transition-all"
                >
                  {editLoading ? 'Saving...' : 'Save Profile & Wallet Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DRAWER: VISITOR 360 & RIDE ACTIVITY TELEMETRY */}
      {/* ======================================================== */}
      {selectedVisitor360 && (
        <div className="fixed inset-0 z-50 flex items-center justify-end p-0 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-xl h-full bg-white border-l border-sky-200 shadow-2xl p-6 sm:p-8 flex flex-col justify-between overflow-y-auto">
            <div>
              {/* Drawer Top Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0072ce] to-sky-400 flex items-center justify-center text-white font-extrabold text-base shadow-md">
                    {selectedVisitor360.Full_Name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-[#002244]">
                      {selectedVisitor360.Full_Name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-mono text-[#0072ce] font-bold">
                        {selectedVisitor360.Band_UID}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                        {selectedVisitor360.Wristband_Status}
                      </span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedVisitor360(null)} 
                  className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1 rounded-lg"
                >
                  ✕
                </button>
              </div>

              {/* Current Activity Banner */}
              <div className={`mt-5 p-4 rounded-2xl border ${
                selectedVisitor360.currentActivity?.state === 'ON_RIDE'
                  ? 'bg-purple-50 border-purple-200 text-purple-900'
                  : selectedVisitor360.currentActivity?.state === 'QUEUED'
                    ? 'bg-sky-50 border-sky-200 text-[#002244]'
                    : selectedVisitor360.currentActivity?.state === 'LOCKER'
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#0072ce]" />
                  </span>
                  <span className="font-extrabold text-[11px] uppercase tracking-wider">
                    CURRENT REAL-TIME ACTIVITY
                  </span>
                </div>
                <div className="font-extrabold text-base mt-1">
                  {selectedVisitor360.currentActivity?.label}
                </div>
                {selectedVisitor360.currentActivity?.slotTime && (
                  <span className="text-xs font-mono opacity-80 block mt-0.5">
                    Time Window: {selectedVisitor360.currentActivity.slotTime}
                  </span>
                )}
              </div>

              {/* Core Telemetry Indicators */}
              <div className="grid grid-cols-2 gap-3 mt-4 text-xs font-mono">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-400 block uppercase">Wallet Balance</span>
                  <span className="text-xl font-extrabold text-[#002244]">
                    ₹{selectedVisitor360.Wallet_Balance.toFixed(2)}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-400 block uppercase">Total Park Spend</span>
                  <span className="text-xl font-extrabold text-rose-600">
                    ₹{selectedVisitor360.totalSpent.toFixed(2)}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-400 block uppercase">Height Safety Rating</span>
                  <span className="text-sm font-bold text-slate-800">
                    {selectedVisitor360.Height_cm} cm
                  </span>
                  <span className="text-[10px] text-emerald-600 block mt-0.5">
                    {selectedVisitor360.Height_cm >= 140 ? 'Full Thrills Cleared' : 'Supervised Rider'}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-400 block uppercase">Keyless Locker</span>
                  <span className="text-sm font-bold text-[#002244]">
                    {selectedVisitor360.activeLocker ? `Locker ${selectedVisitor360.activeLocker.Locker_Number}` : 'None Rented'}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {selectedVisitor360.activeLocker ? `Zone: ${selectedVisitor360.activeLocker.Locker_Zone}` : 'Available'}
                  </span>
                </div>
              </div>

              {/* Active FastPass Reservations */}
              <div className="mt-6">
                <h4 className="font-extrabold text-sm text-[#002244] mb-2 flex items-center gap-1.5 font-sans">
                  <Ticket className="w-4 h-4 text-[#0072ce]" />
                  <span>Virtual Queue FastPasses ({selectedVisitor360.activePasses?.length || 0})</span>
                </h4>

                <div className="space-y-2">
                  {selectedVisitor360.activePasses?.length > 0 ? (
                    selectedVisitor360.activePasses.map(p => (
                      <div key={p.Pass_ID} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs font-mono">
                        <div>
                          <div className="font-bold text-[#002244]">{p.Attraction_Name}</div>
                          <span className="text-[11px] text-slate-500">
                            Slot: {p.Slot_Start_Time} - {p.Slot_End_Time} · Pass #{p.Pass_ID}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.Status === 'Used'
                            ? 'bg-purple-100 text-purple-800'
                            : p.Status === 'Booked'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-600'
                        }`}>
                          {p.Status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-xs text-slate-400 bg-slate-50 rounded-2xl">
                      No virtual queue passes held right now.
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Ledger Transactions */}
              <div className="mt-6">
                <h4 className="font-extrabold text-sm text-[#002244] mb-2 flex items-center gap-1.5 font-sans">
                  <Coins className="w-4 h-4 text-amber-500" />
                  <span>Recent Ledger Transactions</span>
                </h4>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedVisitor360.recentTransactions?.length > 0 ? (
                    selectedVisitor360.recentTransactions.map(t => (
                      <div key={t.Transaction_ID} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs font-mono">
                        <div>
                          <div className="font-bold text-slate-800">{t.Outlet_Or_Ride}</div>
                          <span className="text-[10px] text-slate-400">
                            {new Date(t.Transaction_Time).toLocaleTimeString()} · Txn #{t.Transaction_ID}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className={`font-bold ${
                            t.Transaction_Type === 'Top-up' || t.Transaction_Type === 'Refund'
                              ? 'text-emerald-700'
                              : 'text-rose-600'
                          }`}>
                            {t.Transaction_Type === 'Top-up' || t.Transaction_Type === 'Refund' ? '+' : '-'}₹{parseFloat(t.Amount).toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            Bal: ₹{parseFloat(t.Closing_Balance).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-xs text-slate-400 bg-slate-50 rounded-2xl">
                      No transaction history found.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Drawer Bottom Actions */}
            <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-3 font-sans">
              <button
                type="button"
                onClick={() => {
                  const vis = selectedVisitor360;
                  setSelectedVisitor360(null);
                  handleOpenEditVisitor(vis);
                }}
                className="py-2.5 rounded-2xl bg-sky-50 hover:bg-sky-100 text-[#0072ce] font-bold text-xs border border-sky-200 transition-colors"
              >
                Edit & Set Wallet Amount
              </button>

              <button
                type="button"
                onClick={() => {
                  setDispatchBandId(String(selectedVisitor360.Band_ID));
                  setSelectedVisitor360(null);
                  window.scrollTo({ top: 120, behavior: 'smooth' });
                }}
                className="py-2.5 rounded-2xl bg-[#0072ce] hover:bg-[#0284c7] text-white font-bold text-xs shadow-md shadow-sky-500/25 transition-colors"
              >
                Send to Ride Turnstile
              </button>
            </div>

          </div>
        </div>
      )}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-lg bg-slate-900 border border-purple-500/40 rounded-3xl shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white font-mono">
                {editingRow ? `Edit ${selectedTable} Record` : `Add Record to ${selectedTable}`}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveRecord} className="space-y-4 text-xs font-mono">
              {tableData?.columns?.map((col) => {
                if (col.key === 'PRI' && !editingRow) return null; // auto increment
                return (
                  <div key={col.name}>
                    <label className="block text-slate-300 mb-1 flex items-center justify-between">
                      <span>{col.name} {col.nullable ? '' : '*'}</span>
                      <span className="text-[10px] text-slate-500">{col.type}</span>
                    </label>

                    {col.columnType.startsWith('enum(') ? (
                      <select
                        value={formData[col.name] || ''}
                        onChange={(e) => setFormData({ ...formData, [col.name]: e.target.value })}
                        className="w-full glass-input rounded-xl px-4 py-2 text-white bg-slate-950"
                        required={!col.nullable}
                      >
                        <option value="">Select option...</option>
                        {col.columnType
                          .replace(/^enum\(/i, '')
                          .replace(/\)$/, '')
                          .split(',')
                          .map(v => v.replace(/'/g, '').trim())
                          .map(opt => (
                            <option key={opt} value={opt} className="bg-slate-900">{opt}</option>
                          ))}
                      </select>
                    ) : col.type === 'datetime' || col.type === 'timestamp' || col.type === 'date' ? (
                      <div className="space-y-1.5">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="YYYY-MM-DD HH:MM:SS (e.g. 2026-10-20 or 20-10-2026)"
                            value={formData[col.name] !== undefined ? formData[col.name] : ''}
                            onChange={(e) => setFormData({ ...formData, [col.name]: e.target.value })}
                            className="w-full glass-input rounded-xl px-4 py-2 text-white bg-slate-950 font-mono text-xs placeholder:text-slate-600 border border-slate-700/60 focus:border-sky-400"
                            required={!col.nullable && col.key !== 'PRI' && !col.default}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const now = new Date();
                              const pad = (n) => String(n).padStart(2, '0');
                              const str = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
                              setFormData({ ...formData, [col.name]: str });
                            }}
                            className="whitespace-nowrap px-3 py-1.5 rounded-xl bg-sky-600/30 hover:bg-sky-500/40 text-sky-300 border border-sky-500/40 text-[11px] font-sans font-semibold transition-all shadow-sm flex items-center gap-1"
                            title="Auto-fill current date & time"
                          >
                            <span>⚡</span>
                            <span>Now</span>
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-400 font-sans flex items-center justify-between px-1">
                          <span>Standard: <code className="text-sky-300">YYYY-MM-DD</code> or <code className="text-sky-300">DD-MM-YYYY</code></span>
                          <span className="text-emerald-400 font-medium">Leave empty for auto CURRENT_TIMESTAMP</span>
                        </div>
                      </div>
                    ) : (
                      <input
                        type={col.type === 'int' || col.type === 'decimal' ? 'number' : col.type === 'time' ? 'time' : 'text'}
                        step={col.type === 'decimal' ? '0.01' : '1'}
                        value={formData[col.name] !== undefined ? formData[col.name] : ''}
                        onChange={(e) => setFormData({ ...formData, [col.name]: e.target.value })}
                        className="w-full glass-input rounded-xl px-4 py-2 text-white"
                        required={!col.nullable && col.key !== 'PRI'}
                      />
                    )}
                  </div>
                );
              })}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs font-mono shadow-md"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
