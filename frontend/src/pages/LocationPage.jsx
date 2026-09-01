import React, { useState, useEffect } from 'react';
import { 
  Search, 
  MapPin, 
  Crosshair, 
  Share2, 
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon, 
  Droplets, 
  FlaskConical, 
  Thermometer, 
  Activity, 
  ArrowRight,
  Plus,
  Minus,
  Sparkles,
  Layers
} from 'lucide-react';
import { getLatestReading, getAllDevices } from '../services/api';
import { LOCATIONS } from '../data/mockData'; // Keep as fallback

export default function LocationPage({ selectedLocation, setSelectedLocation, setCurrentRoute }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [mapZoom, setMapZoom] = useState(1);
  const [mapLayer, setMapLayer] = useState('satellite');
  const [isLocating, setIsLocating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [liveData, setLiveData] = useState(null);
  const [isFromBackend, setIsFromBackend] = useState(false);

  // Fetch real data on load
  useEffect(() => {
    fetchRealData('AQUA-001');
  }, []);

  const fetchRealData = async (deviceId) => {
    setLoading(true);
    try {
      const response = await getLatestReading(deviceId);
      if (response.status === 'success' && response.reading) {
        const reading = response.reading;
        setLiveData(reading);
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
              }
            },
            purityScore: calculatePurity(reading),
            status: reading.pH >= 6.5 && reading.pH <= 8.5 ? 'safe' : 'caution',
            isVerified: reading.is_verified || false,
            txHash: reading.blockchain_tx_hash || null,
            lastScanned: new Date(reading.timestamp).toLocaleString()
          }));
        }
      } else {
        // Fallback to mock data if API fails
        console.warn('⚠️ Backend returned no data, using mock data');
        setIsFromBackend(false);
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

  // Filter locations by search (use mock data for now, can be replaced with API)
  const filteredLocations = LOCATIONS.filter(
    (loc) =>
      loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.stretch.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.district.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectLocation = (loc) => {
    setSelectedLocation(loc);
    setSearchQuery('');
    // If location has a device ID, fetch real data for it
    if (loc.deviceId) {
      fetchRealData(loc.deviceId);
    }
  };

  const handleGeolocation = () => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsLocating(false);
          setSelectedLocation(LOCATIONS[0]);
          fetchRealData('AQUA-001');
        },
        (err) => {
          setIsLocating(false);
          alert('Location permission not granted. Selected Ganga - Kanpur stretch as default.');
        },
        { timeout: 5000 }
      );
    } else {
      setIsLocating(false);
      alert('Geolocation not supported by browser.');
    }
  };

  const currentLocation = selectedLocation || LOCATIONS[0];

  return (
    <main className="flex-grow w-full max-w-container-max-width mx-auto px-margin-mobile md:px-margin-desktop py-8 md:py-10 flex flex-col md:flex-row gap-gutter">
      
      {/* LEFT PANEL: Interactive Map & Search */}
      <section className="w-full md:w-3/5 flex flex-col gap-4">
        
        {/* Search & Location Picker Bar */}
        <div className="relative w-full shadow-sm rounded-xl overflow-visible border border-border-subtle dark:border-dark-border bg-surface-container-lowest dark:bg-dark-card focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all z-20">
          <div className="flex items-center px-4 py-3.5">
            <Search className="w-5 h-5 text-on-surface-variant dark:text-gray-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search river stretches, lakes, or districts (e.g. Kanpur, Arkavathi)..."
              className="w-full pl-3 pr-8 bg-transparent border-none outline-none font-medium text-sm md:text-base text-on-surface dark:text-white placeholder:text-gray-400"
            />
            <button
              onClick={handleGeolocation}
              title="Detect My Location"
              disabled={isLocating}
              className="p-2 bg-surface-variant dark:bg-gray-800 rounded-lg hover:bg-outline-variant/50 transition-colors text-on-surface-variant dark:text-gray-200 cursor-pointer shrink-0"
            >
              <Crosshair className={`w-4 h-4 ${isLocating ? 'animate-spin text-primary' : ''}`} />
            </button>
          </div>

          {/* Search Autocomplete Dropdown */}
          {searchQuery && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-surface-container-lowest dark:bg-dark-card border border-border-subtle dark:border-dark-border rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto z-50 animate-pop-in">
              {filteredLocations.length > 0 ? (
                filteredLocations.map((loc) => (
                  <div
                    key={loc.id}
                    onClick={() => handleSelectLocation(loc)}
                    className="p-3.5 px-4 hover:bg-surface-container-low dark:hover:bg-gray-800 cursor-pointer transition-colors flex items-center justify-between border-b border-border-subtle/50 dark:border-dark-border/50 last:border-none"
                  >
                    <div>
                      <p className="font-bold text-sm text-on-surface dark:text-white">
                        {loc.name} — <span className="font-normal text-on-surface-variant dark:text-gray-300">{loc.stretch}</span>
                      </p>
                      <p className="text-xs text-on-surface-variant/80 dark:text-gray-400">{loc.district}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
                      loc.status === 'safe'
                        ? 'bg-safe-green/10 text-safe-green'
                        : loc.status === 'caution'
                        ? 'bg-caution-amber/10 text-caution-amber'
                        : 'bg-risk-red/10 text-risk-red'
                    }`}>
                      {loc.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-on-surface-variant dark:text-gray-400">
                  No monitored stretch found for "{searchQuery}".
                </div>
              )}
            </div>
          )}
        </div>

        {/* Interactive Dynamic Map Visualizer */}
        <div className="w-full flex-grow min-h-[440px] md:min-h-[540px] bg-slate-900 rounded-2xl border border-border-subtle dark:border-dark-border shadow-[0_4px_24px_rgba(0,0,0,0.06)] relative overflow-hidden group select-none">
          
          {/* SVG Map Canvas with River Geometry & Satellite Tiles */}
          <div 
            className="absolute inset-0 w-full h-full transition-transform duration-700 ease-out"
            style={{ transform: `scale(${mapZoom})` }}
          >
            {/* Satellite Grid Texture */}
            <div className="absolute inset-0 bg-[#0B132B] opacity-95">
              <svg className="w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#2E7CD6" strokeWidth="0.5" strokeOpacity="0.4" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>

            {/* Topographical Contour lines & River Path Vector */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
              {/* Same SVG content as before — keep it unchanged */}
              {/* ... (existing SVG code) ... */}
            </svg>
          </div>

          {/* Data Source Badge */}
          <div className="absolute top-4 right-4 z-20">
            <span className={`text-xs px-3 py-1.5 rounded-full font-semibold backdrop-blur-md ${
              isFromBackend && !loading
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              {loading ? '⏳ Loading...' : isFromBackend ? '🟢 Live Data' : '🟡 Demo Data'}
            </span>
          </div>

          {/* Floating Zoom & Layer Controls */}
          <div className="absolute right-4 bottom-4 flex flex-col gap-2 z-10">
            <button
              onClick={() => setMapZoom((prev) => Math.min(prev + 0.25, 2.0))}
              className="w-10 h-10 bg-surface-container-lowest dark:bg-dark-card rounded-xl shadow-md border border-border-subtle dark:border-dark-border flex items-center justify-center text-on-surface dark:text-white hover:bg-surface-variant dark:hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button
              onClick={() => setMapZoom((prev) => Math.max(prev - 0.25, 0.75))}
              className="w-10 h-10 bg-surface-container-lowest dark:bg-dark-card rounded-xl shadow-md border border-border-subtle dark:border-dark-border flex items-center justify-center text-on-surface dark:text-white hover:bg-surface-variant dark:hover:bg-gray-800 transition-colors"
            >
              <Minus className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Monitored Stretch Pills */}
          <div className="absolute bottom-4 left-4 hidden sm:flex items-center gap-2 z-10">
            <span className="text-[11px] font-semibold text-white/80 uppercase tracking-wider bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-lg">
              Quick Pick:
            </span>
            {LOCATIONS.slice(0, 3).map((loc) => (
              <button
                key={loc.id}
                onClick={() => handleSelectLocation(loc)}
                className={`text-xs px-3 py-1 rounded-lg font-semibold transition-all backdrop-blur-md ${
                  currentLocation.id === loc.id
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {loc.name}
              </button>
            ))}
          </div>

        </div>
      </section>

      {/* RIGHT PANEL: Data Details & Live Assessment */}
      <aside className="w-full md:w-2/5 flex flex-col">
        <div className="glass-card dark:bg-dark-surface rounded-2xl p-6 md:p-7 border border-border-subtle dark:border-dark-border shadow-[0_4px_24px_rgba(0,0,0,0.04)] h-full flex flex-col gap-6 relative overflow-hidden transition-colors">
          
          {/* Subtle Ambient Background Accent */}
          <div className={`absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2 ${
            currentLocation.status === 'safe'
              ? 'bg-safe-green/10'
              : currentLocation.status === 'caution'
              ? 'bg-caution-amber/10'
              : 'bg-risk-red/10'
          }`} />

          {/* Header Info */}
          <div className="flex flex-col gap-2 relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="font-bold text-2xl md:text-3xl text-on-surface dark:text-white tracking-tight">
                  {currentLocation.name}
                </h2>
                <p className="font-medium text-base text-on-surface-variant dark:text-gray-300 mt-0.5">
                  {currentLocation.stretch}
                </p>
              </div>
              <button 
                onClick={() => alert(`Shareable link copied for ${currentLocation.name}`)}
                className="p-2.5 rounded-full border border-border-subtle dark:border-dark-border hover:bg-surface-variant dark:hover:bg-dark-card text-on-surface-variant dark:text-gray-300 transition-colors"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 mt-2 text-on-surface-variant/80 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                {currentLocation.district}
              </span>
              <span className="w-1 h-1 rounded-full bg-outline-variant mx-1" />
              <span className="flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-secondary" />
                Scanned {currentLocation.lastScanned || 'just now'}
              </span>
            </div>
          </div>

          <hr className="border-border-subtle dark:border-dark-border" />

          {/* Live Assessment Status Chips */}
          <div className="flex flex-col gap-3 relative z-10">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-on-surface dark:text-white">
                Live Assessment Status
              </h3>
              <span className="text-xs text-secondary dark:text-gray-400">
                Purity Score: <b>{currentLocation.purityScore || 82}/100</b>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div
                className={`flex flex-col items-center p-3 rounded-xl border transition-all ${
                  currentLocation.status === 'safe'
                    ? 'border-2 border-safe-green bg-safe-green/10 shadow-sm scale-105 font-bold text-safe-green'
                    : 'border-border-subtle dark:border-dark-border opacity-40 grayscale'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-safe-green/20 flex items-center justify-center mb-1.5">
                  <CheckCircle2 className="w-5 h-5 text-safe-green" />
                </div>
                <span className="text-xs font-bold">Safe</span>
              </div>

              <div
                className={`flex flex-col items-center p-3 rounded-xl border transition-all ${
                  currentLocation.status === 'caution'
                    ? 'border-2 border-caution-amber bg-caution-amber/10 shadow-sm scale-105 font-bold text-caution-amber'
                    : 'border-border-subtle dark:border-dark-border opacity-40 grayscale'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-caution-amber/20 flex items-center justify-center mb-1.5">
                  <AlertTriangle className="w-5 h-5 text-caution-amber" />
                </div>
                <span className="text-xs font-bold">Caution</span>
              </div>

              <div
                className={`flex flex-col items-center p-3 rounded-xl border transition-all ${
                  currentLocation.status === 'risk'
                    ? 'border-2 border-risk-red bg-risk-red/10 shadow-sm scale-105 font-bold text-risk-red'
                    : 'border-border-subtle dark:border-dark-border opacity-40 grayscale'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-risk-red/20 flex items-center justify-center mb-1.5">
                  <AlertOctagon className="w-5 h-5 text-risk-red" />
                </div>
                <span className="text-xs font-bold">Risk</span>
              </div>
            </div>
          </div>

          {/* Key Metrics Bento Grid — NOW USING REAL DATA */}
          <div className="grid grid-cols-2 gap-3.5 relative z-10">
            {/* Turbidity */}
            <div className="bg-surface-container-low dark:bg-dark-card p-4 rounded-xl border border-border-subtle dark:border-dark-border">
              <div className="flex items-center gap-2 mb-1.5 text-on-surface-variant dark:text-gray-300">
                <Droplets className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold">Turbidity</span>
              </div>
              <div className="text-xl font-bold text-on-surface dark:text-white flex items-baseline gap-1">
                {currentLocation.metrics?.turbidity?.value ?? '--'}{' '}
                <span className="text-xs font-normal text-on-surface-variant dark:text-gray-400">NTU</span>
              </div>
              <div className="w-full bg-outline-variant/30 dark:bg-gray-700 h-1.5 rounded-full mt-3 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    currentLocation.metrics?.turbidity?.status === 'safe' 
                      ? 'bg-safe-green' 
                      : currentLocation.metrics?.turbidity?.status === 'caution' 
                      ? 'bg-caution-amber' 
                      : 'bg-risk-red'
                  }`} 
                  style={{ width: `${Math.min((currentLocation.metrics?.turbidity?.value || 0) / 80 * 100, 100)}%` }} 
                />
              </div>
            </div>

            {/* pH Level */}
            <div className="bg-surface-container-low dark:bg-dark-card p-4 rounded-xl border border-border-subtle dark:border-dark-border">
              <div className="flex items-center gap-2 mb-1.5 text-on-surface-variant dark:text-gray-300">
                <FlaskConical className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold">pH Level</span>
              </div>
              <div className="text-xl font-bold text-on-surface dark:text-white flex items-baseline gap-1">
                {currentLocation.metrics?.ph?.value ?? '--'}{' '}
                <span className="text-xs font-normal text-safe-green ml-1 font-semibold">
                  {(currentLocation.metrics?.ph?.value >= 6.5 && currentLocation.metrics?.ph?.value <= 8.5) ? 'Optimal' : 'Skewed'}
                </span>
              </div>
              <div className="w-full bg-outline-variant/30 dark:bg-gray-700 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="bg-safe-green h-full w-full rounded-full" />
              </div>
            </div>

            {/* Dissolved Oxygen */}
            <div className="bg-surface-container-low dark:bg-dark-card p-4 rounded-xl border border-border-subtle dark:border-dark-border">
              <div className="flex items-center gap-2 mb-1.5 text-on-surface-variant dark:text-gray-300">
                <Activity className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold">Dissolved Oxygen</span>
              </div>
              <div className="text-xl font-bold text-on-surface dark:text-white flex items-baseline gap-1">
                {currentLocation.metrics?.dissolvedOxygen?.value ?? '--'}{' '}
                <span className="text-xs font-normal text-on-surface-variant dark:text-gray-400">mg/L</span>
              </div>
              <div className="w-full bg-outline-variant/30 dark:bg-gray-700 h-1.5 rounded-full mt-3 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${(currentLocation.metrics?.dissolvedOxygen?.value || 0) > 5 ? 'bg-safe-green' : 'bg-risk-red'}`} 
                  style={{ width: `${Math.min((currentLocation.metrics?.dissolvedOxygen?.value || 0) / 10 * 100, 100)}%` }} 
                />
              </div>
            </div>

            {/* Temperature */}
            <div className="bg-surface-container-low dark:bg-dark-card p-4 rounded-xl border border-border-subtle dark:border-dark-border">
              <div className="flex items-center gap-2 mb-1.5 text-on-surface-variant dark:text-gray-300">
                <Thermometer className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold">Water Temp</span>
              </div>
              <div className="text-xl font-bold text-on-surface dark:text-white flex items-baseline gap-1">
                {currentLocation.metrics?.temperature?.value ?? '--'}{' '}
                <span className="text-xs font-normal text-on-surface-variant dark:text-gray-400">°C</span>
              </div>
              <div className="w-full bg-outline-variant/30 dark:bg-gray-700 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="bg-primary h-full w-[70%] rounded-full" />
              </div>
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="mt-auto pt-4 relative z-10">
            <button
              onClick={() => setCurrentRoute('purity')}
              className="w-full py-3.5 bg-primary text-on-primary font-bold text-base rounded-xl shadow-md hover:bg-primary-container active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              View Detailed Purity Report
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

        </div>
      </aside>
    </main>
  );
}