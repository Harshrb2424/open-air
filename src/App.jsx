import React, { useState, useEffect, useMemo } from 'react';
import ReactPlayer from 'react-player';
import { Menu, Tv, Search, Play, RotateCcw, Monitor, AlertCircle, VolumeX } from 'lucide-react';
import { parseMarkdownTable } from './utils/markdownParser';

function App() {
  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [playerError, setPlayerError] = useState(false);
  
  // State for Autoplay/Mute handling
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  // 1. Load Country List (Manifest)
  useEffect(() => {
    fetch('/channels/manifest.json')
      .then(res => res.json())
      .then(data => {
        setCountries(data);
        if(data.length > 0) setSelectedCountry(data[0]);
      })
      .catch(err => console.error("Manifest Error:", err));
  }, []);

  // 2. Load Channels when Country Changes
  useEffect(() => {
    if (!selectedCountry) return;

    setIsLoading(true);
    setChannels([]);
    setSearchQuery(''); 

    fetch(`/channels/${selectedCountry.file}`)
      .then(res => res.text())
      .then(text => {
        const parsed = parseMarkdownTable(text);
        setChannels(parsed);
        setIsLoading(false);

        // Auto-select first channel if available
        if (parsed.length > 0) {
          handleChannelSelect(parsed[0]);
        } else {
          setActiveChannel(null);
        }
      })
      .catch(err => {
        console.error("Markdown Error:", err);
        setIsLoading(false);
      });
  }, [selectedCountry]);

  const handleChannelSelect = (channel) => {
    // Reset error state immediately
    console.log("Selected:", channel.name);
    setPlayerError(false);
    setActiveChannel(channel);
    setIsPlaying(true);
  };

  const handleUnmute = () => {
    setIsMuted(false);
  };

  // Filter Channels based on Search
  const filteredChannels = useMemo(() => {
    if (!searchQuery) return channels;
    return channels.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [channels, searchQuery]);

  // Group Channels by Category
  const groupedChannels = useMemo(() => {
    const groups = {};
    filteredChannels.forEach(ch => {
      if (!groups[ch.category]) groups[ch.category] = [];
      groups[ch.category].push(ch);
    });
    return groups;
  }, [filteredChannels]);

  return (
    <div className="flex h-screen bg-[#0f0f0f] text-gray-100 font-sans overflow-hidden selection:bg-red-900 selection:text-white">
      
      {/* SIDEBAR */}
      <aside className={`${isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full'} transition-all duration-300 bg-[#121212] border-r border-white/10 flex flex-col absolute md:relative z-20 h-full`}>
        <div className="p-5 flex items-center gap-3 border-b border-white/5 bg-[#181818]">
          <div className="bg-red-600 p-1.5 rounded-lg shadow-[0_0_15px_rgba(220,38,38,0.5)]">
            <Tv size={20} className="text-white" />
          </div>
          <h1 className="font-bold text-lg tracking-wide bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">OPEN AIR</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3 mt-4">Countries</div>
          {countries.map(country => (
            <button
              key={country.id}
              onClick={() => { setSelectedCountry(country); if(window.innerWidth < 768) setIsSidebarOpen(false); }}
              className={`w-full text-left px-4 py-3 rounded-lg mb-1 transition-all flex items-center gap-3
                ${selectedCountry?.id === country.id 
                  ? 'bg-red-600/10 text-red-500 border border-red-600/20' 
                  : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}
            >
              <img 
                src={`https://flagcdn.com/24x18/${country.id === 'india' ? 'in' : country.id === 'australia' ? 'au' : 'un'}.png`}
                className="w-5 h-3.5 rounded-sm object-cover opacity-80"
                alt=""
                onError={(e) => e.target.style.display = 'none'}
              />
              <span className="font-medium text-sm">{country.name}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col relative w-full">
        
        {/* Top Navigation */}
        <header className="h-16 bg-[#121212] border-b border-white/10 flex items-center px-4 justify-between shrink-0 z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <Menu size={20} />
            </button>
            <div className="flex flex-col">
               <span className="text-xs text-gray-500 font-mono">LIVE FEED</span>
               <span className="text-sm font-bold text-white flex items-center gap-2">
                 {activeChannel ? activeChannel.name : 'No Channel Selected'}
                 {activeChannel && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
               </span>
            </div>
          </div>
          
          <div className="relative hidden md:block w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input 
              type="text" 
              placeholder="Search channels..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1e1e1e] border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all placeholder:text-gray-600"
            />
          </div>
        </header>

        {/* Video Player Section */}
        <div className="w-full bg-black aspect-video max-h-[55vh] relative group shadow-2xl z-0">
          {activeChannel ? (
            <>
              {playerError ? (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0a] text-gray-400 gap-4">
                    <AlertCircle size={48} className="text-red-500 mb-2" />
                    <p>Stream unavailable or offline.</p>
                    <button 
                      onClick={() => setPlayerError(false)} 
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-md text-sm flex items-center gap-2 transition-colors"
                    >
                      <RotateCcw size={16} /> Retry Connection
                    </button>
                 </div>
              ) : (
                <div className="w-full h-full relative">
                    <ReactPlayer
                      key={activeChannel.url}
                      url={activeChannel.url}
                      playing={isPlaying}
                      muted={isMuted} // Muted by default to satisfy browser autoplay policies
                      controls={true}
                      width="100%"
                      height="100%"
                      pip={false} 
                      stopOnUnmount={true}
                      // ERROR HANDLING
                      onError={(e) => {
                        // 1. Ignore "AbortError" (User switched channel while loading)
                        if (e?.name === 'AbortError' || e?.message?.includes('interrupted')) {
                            return; 
                        }
                        console.error("Player Error:", e);
                        
                        // 2. Warn if it's likely a CORS issue
                        if (!activeChannel.isYoutube) {
                            console.warn("BLANK SCREEN FIX: Ensure you installed 'hls.js' and have the 'Allow CORS' extension ON.");
                        }
                        setPlayerError(true);
                      }}
                      // CONFIGURATION
                      config={{
                        file: { 
                          forceHLS: !activeChannel.isYoutube, // Force HLS for .m3u8
                          hlsOptions: {
                            forceHLS: true,
                            enableWorker: true,
                            lowLatencyMode: true,
                            xhrSetup: function(xhr, url) {
                              xhr.withCredentials = false; // Helps bypass some strict CORS checks
                            }
                          }
                        },
                        youtube: { playerVars: { showinfo: 1, autoplay: 1, playsinline: 1 } }
                      }}
                    />
                    
                    {/* Unmute Overlay */}
                    {isMuted && !playerError && (
                        <button 
                            onClick={handleUnmute}
                            className="absolute top-4 right-4 bg-black/60 hover:bg-red-600 text-white p-2 rounded-full backdrop-blur-sm transition-all flex items-center gap-2 pr-4 group z-20"
                        >
                            <VolumeX size={20} />
                            <span className="text-xs font-bold">CLICK TO UNMUTE</span>
                        </button>
                    )}
                </div>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050505]">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 animate-pulse">
                <Monitor size={40} className="text-white/20" />
              </div>
              <p className="text-gray-500 font-light">Select a channel to start watching</p>
            </div>
          )}
        </div>

        {/* Channel Grid */}
        <div className="flex-1 overflow-y-auto bg-[#0f0f0f] p-4 md:p-6 custom-scrollbar">
          {isLoading ? (
             <div className="flex flex-col items-center justify-center h-40 gap-3 text-gray-500">
                <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm">Fetching frequencies...</span>
             </div>
          ) : (
            <>
             {/* Mobile Search */}
             <div className="md:hidden mb-6 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input 
                  type="text" 
                  placeholder="Search..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg py-3 pl-10 text-sm"
                />
             </div>

              {Object.keys(groupedChannels).length === 0 && (
                <div className="text-center text-gray-500 py-10">No channels found.</div>
              )}

              {Object.entries(groupedChannels).map(([category, chans]) => (
                <div key={category} className="mb-8">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-1 h-4 bg-red-600 rounded-full"></span>
                    {category}
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                    {chans.map((channel, idx) => (
                      <div 
                        key={`${channel.id}-${idx}`}
                        onClick={() => handleChannelSelect(channel)}
                        className={`
                          group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all duration-200
                          ${activeChannel?.url === channel.url 
                            ? 'bg-red-600/10 border-red-600/50 ring-1 ring-red-600/50' 
                            : 'bg-[#181818] border-white/5 hover:border-white/20 hover:bg-[#202020] hover:-translate-y-0.5 shadow-sm'}
                        `}
                      >
                        <div className="w-12 h-10 shrink-0 bg-white rounded-md flex items-center justify-center p-1 overflow-hidden">
                          {channel.logo ? (
                            <img src={channel.logo} alt={channel.name} className="max-w-full max-h-full object-contain" />
                          ) : (
                            <span className="text-black font-bold text-xs">{channel.id}</span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className={`text-sm font-medium truncate ${activeChannel?.url === channel.url ? 'text-red-400' : 'text-gray-200'}`}>
                            {channel.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5">
                             {channel.isYoutube && <span className="text-[10px] bg-red-600 text-white px-1.5 rounded-sm">YT</span>}
                             <span className="text-[10px] text-gray-500 truncate">#{channel.id}</span>
                          </div>
                        </div>
                        
                        <div className="absolute right-3 opacity-0 group-hover:opacity-100 transition-opacity text-white/80">
                           <Play size={18} fill="currentColor" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;