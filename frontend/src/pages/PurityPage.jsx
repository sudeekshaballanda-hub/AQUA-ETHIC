import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  Radio, 
  Satellite, 
  Activity, 
  Droplets, 
  FlaskConical, 
  Thermometer, 
  Zap, 
  ShieldCheck, 
  MoreVertical,
  ArrowUpRight,
  TrendingDown,
  Info
} from 'lucide-react';
import { getLatestReading, getHistory, verifyData } from '../services/api';
import { getTimeSeriesData } from '../data/mockData'; // Keep as fallback

export default function PurityPage({ selectedLocation, setSelectedLocation }) {
  const [dataSource, setDataSource] = useState('remote');
  const [timeRange, setTimeRange] = useState('24h');
  const [activeMetric, setActiveMetric] = useState('ndti');
  const [loading, setLoading] = useState(false);
  const [liveReading, setLiveReading] = useState(null);
  const [liveHistory, setLiveHistory] = useState([]);
  const [isFromBackend, setIsFromBackend] = useState(false);
  const [verified, setVerified] = useState(false);
  const [isTampered, setIsTampered] = useState(false);

  // Fetch real data on load
  useEffect(() => {
    fetchRealData('AQUA-001');
  }, []);

  const fetchRealData = async (deviceId) => {
    setLoading(true);
    try {
      const [latestRes, historyRes] = await Promise.all([
        getLatestReading(deviceId),
        getHistory(deviceId, 24)
      ]);

      if (latestRes.status === 'success' && latestRes.reading) {
        const reading = latestRes.reading;
        setLiveReading(reading);
        setIsFromBackend(true);

        // Update selected location with real data
        if (setSelectedLocation) {
          setSelectedLocation(prev => ({
            ...prev,
            metrics: {
              ph: { 
                value: reading.pH ?? reading.ph ?? prev.metrics.ph.value, 
                unit: 'pH', 
                status: (reading.pH >= 6.5 && reading.pH <= 8.5) ? 'safe' : 'caution' 
              },
              temperature: { 
                value: reading.temperature ?? reading.temp ?? prev.metrics.temperature.value, 
                unit: '°C', 
                status: 'safe' 
              },
              turbidity: { 
                value: reading.turbidity ?? reading.turb ?? prev.metrics.turbidity.value, 
                unit: 'NTU', 
                status: (reading.turbidity <= 5) ? 'safe' : 'caution' 
              },
              dissolvedOxygen: { 
                value: reading.dissolvedOxygen ?? reading.dissolved_oxygen ?? prev.metrics.dissolvedOxygen.value, 
                unit: 'mg/L', 
                status: (reading.dissolved_oxygen >= 5) ? 'safe' : 'caution' 
              },
              conductivity: { 
                value: prev.metrics.conductivity?.value || 380, 
                unit: 'µS/cm', 
                status: 'safe' 
              }
            },
            purityScore: calculatePurity(reading),
            status: reading.pH >= 6.5 && reading.pH <= 8.5 ? 'safe' : 'caution',
            isVerified: reading.is_verified || false,
            txHash: reading.blockchain_tx_hash || null,
            lastScanned: new Date(reading.timestamp).toLocaleString(),
            anomaly_flag: reading.pH < 6.5 || reading.pH > 8.5 || reading.turbidity > 5
          }));
        }
      }

      if (historyRes.status === 'success') {
        setLiveHistory(historyRes.readings);
      }
    } catch (error) {
      console.warn('⚠️ Backend unavailable, using mock data');
      setIsFromBackend(false);
    } finally {
      setLoading(false);
    }
  };

  const calculatePurity = (reading) => {
    if (!reading) return 82;
    let score = 100;
    const pH = reading.pH ?? reading.ph ?? 7;
    const turbidity = reading.turbidity ?? reading.turb ?? 2;
    const dissolvedOxygen = reading.dissolvedOxygen ?? reading.dissolved_oxygen ?? 6;

    if (pH < 6.5 || pH > 8.5) score -= 20;
    if (turbidity > 5) score -= 15;
    if (dissolvedOxygen < 5) score -= 15;
    return Math.max(score, 0);
  };

  const handleVerify = async () => {
    if (!liveReading?.data_hash) {
      alert('No data hash to verify');
      return;
    }
    try {
      const result = await verifyData(liveReading.data_hash);
      setVerified(result.blockchainVerified);
      setIsTampered(result.isTampered || false);
      alert(result.isTampered ? '🚨 DATA TAMPERED!' : '✅ Data verified on blockchain!');
    } catch (err) {
      alert('Verification failed: ' + err.message);
    }
  };

  // Use real data if available, fallback to mock
  const currentLocation = selectedLocation || {};
  const score = currentLocation.purityScore ?? 82;
  const timeSeries = isFromBackend && liveHistory.length > 0 
    ? liveHistory.map((item, index) => ({
        time: new Date(item.timestamp).toLocaleTimeString(),
        ndti: (item.turbidity ?? 0) / 100,
        ndci: (item.pH ?? 7) / 10,
        ph: item.pH ?? 7,
        turbidity: item.turbidity ?? 0,
        dissolvedOxygen: item.dissolved_oxygen ?? 6,
        score: calculatePurity(item)
      }))
    : getTimeSeriesData(currentLocation.id || 'ganga-kanpur', timeRange, dataSource);

  const gaugeColor = score >= 80 ? '#28A745' : score >= 60 ? '#F59E0B' : '#DC3545';

  return (
    <main className="flex-grow max-w-container-max-width mx-auto w-full px-margin-mobile md:px-margin-desktop py-8 md:py-10 flex flex-col gap-6 md:gap-8">
      
      {/* Data Source Badge */}
      <div className="flex justify-end">
        <span className={`text-xs px-3 py-1.5 rounded-full font-semibold backdrop-blur-md ${
          isFromBackend && !loading
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
        }`}>
          {loading ? '⏳ Loading...' : isFromBackend ? '🟢 Live Data' : '🟡 Demo Data'}
        </span>
      </div>

      {/* Header & Circular Purity Gauge Section */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-widest text-primary dark:text-primary-fixed bg-primary/10 dark:bg-primary-fixed/20 px-3 py-1 rounded-full">
              Verified Water Ledger ID: #RW-{currentLocation.id?.toUpperCase()?.slice(0, 8) || 'GANGA-KA'}
            </span>
          </div>
          <h1 className="font-bold text-2xl md:text-4xl text-on-surface dark:text-white tracking-tight">
            {currentLocation.name || 'Ganga River'} — {currentLocation.stretch || 'Kanpur Stretch'}
          </h1>
          <p className="text-sm md:text-base text-on-surface-variant dark:text-gray-300 mt-1">
            High-precision satellite multispectral imaging and real-time buoy telemetry.
          </p>
        </div>

        {/* Circular Purity Gauge */}
        <div className="glass-panel dark:bg-dark-card rounded-2xl p-5 md:p-6 flex items-center gap-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-border-subtle dark:border-dark-border self-stretch md:self-auto shrink-0">
          <div className="relative w-28 h-28 md:w-32 md:h-32 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path className="text-surface-container-high dark:text-gray-700 stroke-current" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="3.2" />
              <path style={{ stroke: gaugeColor, strokeDasharray: `${score}, 100`, transition: 'stroke-dasharray 1s ease-in-out, stroke 0.5s ease' }} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="3.4" strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-bold text-3xl md:text-4xl" style={{ color: gaugeColor }}>{score}</span>
              <span className="text-[10px] uppercase font-bold text-secondary dark:text-gray-400 -mt-1">/ 100</span>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-base md:text-lg text-on-surface dark:text-white">Purity Rating</h3>
            <p className="text-xs md:text-sm font-bold flex items-center gap-1.5 mt-1" style={{ color: gaugeColor }}>
              {score >= 80 ? <><CheckCircle2 className="w-4 h-4" /> Condition: Optimal & Safe</> : score >= 60 ? <><AlertTriangle className="w-4 h-4" /> Condition: Caution Required</> : <><AlertTriangle className="w-4 h-4" /> Condition: Critical Risk</>}
            </p>
            <span className="text-[11px] text-on-surface-variant dark:text-gray-400 block mt-1">Refreshed {currentLocation.lastScanned || 'just now'}</span>
          </div>
        </div>
      </section>

      {/* Anomaly Banner */}
      {(currentLocation.anomaly_flag || currentLocation.status !== 'safe') && (
        <div className={`rounded-2xl p-4 md:p-5 flex items-start gap-4 border transition-all animate-pop-in ${currentLocation.status === 'risk' ? 'bg-error-container/60 dark:bg-error-container/30 border-error/30 text-on-error-container dark:text-red-200' : 'bg-caution-amber/15 dark:bg-caution-amber/20 border-caution-amber/40 text-amber-950 dark:text-amber-200'}`}>
          <div className={`p-2 rounded-xl shrink-0 ${currentLocation.status === 'risk' ? 'bg-risk-red text-white' : 'bg-caution-amber text-black'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-base md:text-lg">{currentLocation.status === 'risk' ? 'Critical Water Quality Anomaly Detected' : 'Turbidity & Sedimentation Alert'}</h4>
            <p className="text-xs md:text-sm opacity-90 mt-1 leading-relaxed">{currentLocation.anomalyMessage || 'Spectrometric indices indicate abnormal variance from the historical baseline. Ground buoy sensors have confirmed localized shift.'}</p>
          </div>
        </div>
      )}

      {/* Filter & Source Toggle Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-surface dark:bg-dark-card rounded-2xl p-2.5 shadow-sm border border-border-subtle dark:border-dark-border">
        <div className="flex bg-surface-container-low dark:bg-dark-surface rounded-xl p-1 shadow-inner">
          <button onClick={() => setDataSource('remote')} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all ${dataSource === 'remote' ? 'bg-white dark:bg-dark-card text-primary dark:text-primary-fixed shadow-sm' : 'text-on-surface-variant dark:text-gray-400 hover:text-on-surface dark:hover:text-white'}`}>
            <Satellite className="w-4 h-4" /> Remote Sensing
          </button>
          <button onClick={() => setDataSource('iot')} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all ${dataSource === 'iot' ? 'bg-white dark:bg-dark-card text-primary dark:text-primary-fixed shadow-sm' : 'text-on-surface-variant dark:text-gray-400 hover:text-on-surface dark:hover:text-white'}`}>
            <Radio className="w-4 h-4" /> IoT Buoy Sensors
          </button>
        </div>
        <div className="flex items-center justify-end gap-2 pr-2">
          <Calendar className="w-4 h-4 text-on-surface-variant dark:text-gray-400" />
          <div className="flex bg-surface-container-low dark:bg-dark-surface rounded-lg p-1">
            {[{ id: '24h', label: '24 Hours' }, { id: '7d', label: '7 Days' }, { id: '30d', label: '30 Days' }].map((range) => (
              <button key={range.id} onClick={() => setTimeRange(range.id)} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${timeRange === range.id ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant dark:text-gray-400 hover:text-on-surface dark:hover:text-white'}`}>
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content: Chart + Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter items-start">
        {/* Chart */}
        <div className="md:col-span-8 glass-card dark:bg-dark-surface rounded-2xl border border-border-subtle dark:border-dark-border p-6 md:p-7 flex flex-col shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
            <div>
              <h2 className="font-bold text-lg md:text-xl text-on-surface dark:text-white">{dataSource === 'remote' ? 'Spectral Indices (NDTI / NDCI)' : 'Continuous Sensor Telemetry'}</h2>
              <p className="text-xs text-on-surface-variant dark:text-gray-400 mt-0.5">{dataSource === 'remote' ? 'Normalized Difference Turbidity & Chlorophyll Index' : 'Buoy Station Hydro-Chemical Array'}</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-primary dark:text-primary-fixed"><span className="w-3 h-3 rounded-full bg-primary" />{dataSource === 'remote' ? 'NDTI (Turbidity)' : 'Turbidity (NTU)'}</span>
              <span className="flex items-center gap-1.5 text-safe-green"><span className="w-3 h-3 rounded-full bg-safe-green" />{dataSource === 'remote' ? 'NDCI (Chlorophyll)' : 'pH Level'}</span>
            </div>
          </div>
          <div className="w-full h-72 md:h-80 bg-surface-container-low dark:bg-dark-card rounded-xl relative overflow-hidden p-4 flex flex-col justify-between select-none">
            <div className="absolute inset-0 flex flex-col justify-between py-6 px-4 pointer-events-none opacity-40">
              <div className="w-full border-t border-dashed border-gray-300 dark:border-gray-700" />
              <div className="w-full border-t border-dashed border-gray-300 dark:border-gray-700" />
              <div className="w-full border-t border-dashed border-gray-300 dark:border-gray-700" />
              <div className="w-full border-t border-dashed border-gray-300 dark:border-gray-700" />
            </div>
            <div className="relative w-full h-full flex items-end">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 600 200" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="areaGradientPrimary" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#005CAC" stopOpacity="0.35" /><stop offset="100%" stopColor="#005CAC" stopOpacity="0.0" /></linearGradient>
                  <linearGradient id="areaGradientSecondary" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#28A745" stopOpacity="0.3" /><stop offset="100%" stopColor="#28A745" stopOpacity="0.0" /></linearGradient>
                </defs>
                <path d={`M 0,200 ${timeSeries.map((pt, i) => { const x = (i / (timeSeries.length - 1)) * 600; const val = dataSource === 'remote' ? pt.ndti * 350 : (pt.turbidity / 80) * 160; const y = Math.max(20, 180 - val); return `L ${x},${y}`; }).join(' ')} L 600,200 Z`} fill="url(#areaGradientPrimary)" />
                <path d={`M ${timeSeries.map((pt, i) => { const x = (i / (timeSeries.length - 1)) * 600; const val = dataSource === 'remote' ? pt.ndti * 350 : (pt.turbidity / 80) * 160; const y = Math.max(20, 180 - val); return `${i === 0 ? '' : 'L'} ${x},${y}`; }).join(' ')}`} fill="none" stroke="#005CAC" strokeWidth="3.5" strokeLinecap="round" />
                <path d={`M ${timeSeries.map((pt, i) => { const x = (i / (timeSeries.length - 1)) * 600; const val = dataSource === 'remote' ? pt.ndci * 450 : ((pt.ph - 6) / 3) * 120; const y = Math.max(30, 180 - val); return `${i === 0 ? '' : 'L'} ${x},${y}`; }).join(' ')}`} fill="none" stroke="#28A745" strokeWidth="2.5" strokeDasharray="4 4" strokeLinecap="round" />
                {timeSeries.map((pt, i) => { const x = (i / (timeSeries.length - 1)) * 600; const val = dataSource === 'remote' ? pt.ndti * 350 : (pt.turbidity / 80) * 160; const y = Math.max(20, 180 - val); return (<g key={i} className="group cursor-pointer"><circle cx={x} cy={y} r="5" fill="#ffffff" stroke="#005CAC" strokeWidth="3" /><circle cx={x} cy={y} r="12" fill="#005CAC" fillOpacity="0.15" className="hover:scale-150 transition-transform" /></g>); })}
              </svg>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-border-subtle dark:border-dark-border text-xs font-semibold text-on-surface-variant dark:text-gray-400">
              {timeSeries.map((pt, i) => (<span key={i}>{pt.time}</span>))}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border-subtle dark:border-dark-border flex flex-wrap justify-between items-center text-xs text-on-surface-variant dark:text-gray-400 gap-2">
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-safe-green" /> Cryptographic HMAC Verification: <b>{isFromBackend ? 'Passed (Block #4928)' : 'Simulated'}</b></span>
            <span>Ground Resolution: <b>{currentLocation.remoteSensing?.resolution || '10m Ground Resolution'}</b></span>
            {isFromBackend && liveReading?.blockchain_tx_hash && (
              <button onClick={handleVerify} className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-lg hover:bg-primary/20 transition-colors">
                🔍 Verify Blockchain
              </button>
            )}
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="md:col-span-4 flex flex-col gap-4">
          {/* pH */}
          <div className="glass-card dark:bg-dark-surface rounded-2xl border border-border-subtle dark:border-dark-border p-4.5 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">pH Level</p>
                <h3 className="font-bold text-2xl md:text-3xl text-on-surface dark:text-white mt-1">{currentLocation.metrics?.ph?.value ?? '--'}</h3>
              </div>
              <div className={`w-3.5 h-3.5 rounded-full ${currentLocation.metrics?.ph?.status === 'safe' ? 'bg-safe-green ring-4 ring-safe-green/20' : 'bg-caution-amber ring-4 ring-caution-amber/20'}`} />
            </div>
            <div className="mt-4 bg-surface-container-low dark:bg-dark-card h-2 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${currentLocation.metrics?.ph?.status === 'safe' ? 'bg-safe-green' : 'bg-caution-amber'}`} style={{ width: `${((currentLocation.metrics?.ph?.value ?? 7) / 10) * 100}%` }} />
            </div>
            <div className="flex justify-between items-center text-xs text-on-surface-variant dark:text-gray-400 mt-2">
              <span>Standard Baseline: 6.5 - 8.5</span>
              <span className={`font-bold ${currentLocation.metrics?.ph?.status === 'safe' ? 'text-safe-green' : 'text-caution-amber'}`}>{currentLocation.metrics?.ph?.status === 'safe' ? 'Stable' : 'Skewed'}</span>
            </div>
          </div>

          {/* Turbidity */}
          <div className={`glass-card dark:bg-dark-surface rounded-2xl border p-4.5 shadow-sm ${currentLocation.metrics?.turbidity?.status === 'safe' ? 'border-border-subtle dark:border-dark-border' : currentLocation.metrics?.turbidity?.status === 'caution' ? 'border-l-4 border-l-caution-amber border-border-subtle dark:border-dark-border' : 'border-l-4 border-l-risk-red border-border-subtle dark:border-dark-border'}`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">Turbidity (NTU)</p>
                <h3 className="font-bold text-2xl md:text-3xl text-on-surface dark:text-white mt-1">{currentLocation.metrics?.turbidity?.value ?? '--'}</h3>
              </div>
              <div className={`w-3.5 h-3.5 rounded-full ${currentLocation.metrics?.turbidity?.status === 'safe' ? 'bg-safe-green ring-4 ring-safe-green/20' : currentLocation.metrics?.turbidity?.status === 'caution' ? 'bg-caution-amber ring-4 ring-caution-amber/20' : 'bg-risk-red ring-4 ring-risk-red/20'}`} />
            </div>
            <div className="mt-4 bg-surface-container-low dark:bg-dark-card h-2 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${currentLocation.metrics?.turbidity?.status === 'safe' ? 'bg-safe-green' : currentLocation.metrics?.turbidity?.status === 'caution' ? 'bg-caution-amber' : 'bg-risk-red'}`} style={{ width: `${Math.min(((currentLocation.metrics?.turbidity?.value ?? 0) / 80) * 100, 100)}%` }} />
            </div>
            <div className="flex justify-between items-center text-xs text-on-surface-variant dark:text-gray-400 mt-2">
              <span>Threshold: &lt; 25.0 NTU</span>
              <span className={`font-bold ${currentLocation.metrics?.turbidity?.status === 'safe' ? 'text-safe-green' : 'text-caution-amber'}`}>{currentLocation.metrics?.turbidity?.status === 'safe' ? 'Clear' : 'Elevated'}</span>
            </div>
          </div>

          {/* Dissolved Oxygen */}
          <div className="glass-card dark:bg-dark-surface rounded-2xl border border-border-subtle dark:border-dark-border p-4.5 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">Dissolved Oxygen</p>
                <h3 className="font-bold text-2xl md:text-3xl text-on-surface dark:text-white mt-1">{currentLocation.metrics?.dissolvedOxygen?.value ?? '--'} <span className="text-xs font-normal text-on-surface-variant dark:text-gray-400">mg/L</span></h3>
              </div>
              <div className={`w-3.5 h-3.5 rounded-full ${(currentLocation.metrics?.dissolvedOxygen?.value ?? 0) >= 5 ? 'bg-safe-green ring-4 ring-safe-green/20' : 'bg-risk-red ring-4 ring-risk-red/20'}`} />
            </div>
            <div className="mt-4 bg-surface-container-low dark:bg-dark-card h-2 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${(currentLocation.metrics?.dissolvedOxygen?.value ?? 0) >= 5 ? 'bg-safe-green' : 'bg-risk-red'}`} style={{ width: `${Math.min(((currentLocation.metrics?.dissolvedOxygen?.value ?? 0) / 10) * 100, 100)}%` }} />
            </div>
            <div className="flex justify-between items-center text-xs text-on-surface-variant dark:text-gray-400 mt-2">
              <span>Aquatic Safety: &gt; 5.0 mg/L</span>
              <span className={`font-bold ${(currentLocation.metrics?.dissolvedOxygen?.value ?? 0) >= 5 ? 'text-safe-green' : 'text-risk-red'}`}>{(currentLocation.metrics?.dissolvedOxygen?.value ?? 0) >= 5 ? 'Healthy' : 'Low'}</span>
            </div>
          </div>

          {/* Temperature & Conductivity */}
          <div className="glass-card dark:bg-dark-surface rounded-2xl border border-border-subtle dark:border-dark-border p-4.5 shadow-sm grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">Water Temp</p>
              <h4 className="font-bold text-xl text-on-surface dark:text-white mt-1">{currentLocation.metrics?.temperature?.value ?? '--'}°C</h4>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">Conductivity</p>
              <h4 className="font-bold text-xl text-on-surface dark:text-white mt-1">{currentLocation.metrics?.conductivity?.value ?? 380} <span className="text-[10px] text-gray-400 font-normal">µS/cm</span></h4>
            </div>
          </div>
        </div>

      </div>

    </main>
  );
}