import { useState, useEffect, useRef } from 'react';
import { Filter, MapPin, Bookmark, Save, Trash2, Heart, Check, LayoutGrid, LayoutList, X, Bell, Info, ArrowUp, Send } from 'lucide-react';
import OfferDetails from './OfferDetails';
import { translations } from './translations';
import './index.css';

// Use hardcoded backend URL only in development, otherwise use relative paths
const API_BASE_URL = window.location.port === '5173'
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : '';

const formatPrice = (price) => {
    if (!price) return null;
    return String(parseInt(price, 10)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
};

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

const OfferCard = ({ offer, onSelect, t, showToast, onToggleFavorite, viewMode = 'grid' }) => {
    const [isSeen, setIsSeen] = useState(offer.is_seen);
    const cardRef = useRef(null);

    useEffect(() => {
        if (isSeen) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    fetch(`${API_BASE_URL}/api/offers/${offer.id}/mark_seen/`, { method: 'POST' })
                        .catch(err => console.error("Failed to mark seen", err));
                    observer.disconnect();
                }
            },
            { threshold: 0.3 }
        );

        if (cardRef.current) observer.observe(cardRef.current);
        return () => observer.disconnect();
    }, [isSeen, offer.id]);

    const handleToggleFavorite = (e) => {
        e.stopPropagation();
        onToggleFavorite(offer.id, offer.is_favorite);
    };

    if (viewMode === 'list') {
        return <ListCard offer={offer} onSelect={onSelect} t={t} showToast={showToast} isSeen={isSeen} isFavorite={offer.is_favorite} handleToggleFavorite={handleToggleFavorite} cardRef={cardRef} />;
    }

    return (
        <div ref={cardRef} onClick={() => onSelect(offer)} className="block group relative cursor-pointer">
            <button
                onClick={handleToggleFavorite}
                className="absolute top-3 right-3 z-20 p-2 bg-slate-900/60 hover:bg-slate-800/90 backdrop-blur rounded-full transition-all border border-slate-700 shadow-lg group/btn hover:scale-110"
                title={offer.is_favorite ? t('removeFavorite') : t('addFavorite')}
            >
                <Heart className={`w-5 h-5 transition-colors ${offer.is_favorite ? 'fill-rose-500 text-rose-500' : 'text-slate-400 group-hover/btn:text-rose-400'}`} />
            </button>
            {!isSeen && (
                <div className="absolute top-0 left-0 z-10 -ml-2 -mt-2" title={t('newOffer')}>
                    <span className="relative flex h-5 w-5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-5 w-5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] border-2 border-slate-900"></span>
                    </span>
                </div>
            )}
            <div className={`glass-panel h-full overflow-hidden hover:border-blue-500/50 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-[0_10px_40px_-15px_rgba(59,130,246,0.3)] ${!isSeen ? 'border-emerald-500/30' : ''}`}>
                <div className="h-64 sm:h-72 relative bg-slate-800/80 flex items-center justify-center overflow-hidden">
                    {offer.img && offer.img !== 'NULL' ? (
                        <>
                            {/* Blurred background fill */}
                            <img src={offer.img} aria-hidden="true" className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-40 pointer-events-none" />
                            {/* Main image */}
                            <img src={offer.img} alt={offer.title} className="relative w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 drop-shadow-2xl" />
                        </>
                    ) : (
                        <span className="text-slate-500">{t('noImage')}</span>
                    )}
                </div>

                <div className="p-5">
                    <div className="mb-4">
                        <h2 className="text-lg font-bold text-white mb-1 line-clamp-2 group-hover:text-blue-400 transition-colors leading-tight">{offer.title || t('unknownTitle')}</h2>
                        <div className="flex flex-col gap-1">
                            <div className="text-2xl font-black text-emerald-400 whitespace-nowrap">
                                {offer.price ? formatPrice(offer.price) : t('askPrice')}
                                {offer.price && <span className="text-base text-emerald-500/80 ml-1">PLN</span>}
                            </div>
                            <p className="text-xs text-slate-400 flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {offer.location || t('unknownLocation')}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                        <div className="flex flex-col">
                            <span className="text-slate-500">{t('year')}</span>
                            <span className="font-semibold text-slate-200">{offer.year || '-'}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-slate-500">{t('mileage_label')}</span>
                            <span className="font-semibold text-slate-200">{offer.mileage ? `${offer.mileage}` : '-'}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-slate-500">{t('engine')}</span>
                            <span className="font-semibold text-slate-200">{offer.capacity || '-'}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-slate-500">{t('fuel')}</span>
                            <span className="font-semibold text-slate-200">{offer.fuel || '-'}</span>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-700/50 flex flex-col gap-1 text-[10px] text-slate-500">
                        <div className="flex justify-between">
                            <span>{t('published')}: {offer.date}</span>
                            <span>{t('id')}: {offer.offer_id}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-800/30 pt-1">
                            <span>{t('scraped')}: {offer.created_at ? offer.created_at.slice(0, 10).replace(/-/g, '.') + ' ' + offer.created_at.slice(11, 16) : '-'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Factored out image with blur for reuse
const BlurImage = ({ img, title, className }) => img && img !== 'NULL' ? (
    <>
        <img src={img} aria-hidden="true" className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-40 pointer-events-none" />
        <img src={img} alt={title} className={className} />
    </>
) : null;

const ListCard = ({ offer, onSelect, t, showToast, isSeen, isFavorite, handleToggleFavorite, cardRef }) => (
    <div ref={cardRef} onClick={() => onSelect(offer)} className="group relative cursor-pointer">
        <button
            onClick={handleToggleFavorite}
            className="absolute top-3 right-3 z-20 p-2 bg-slate-900/60 hover:bg-slate-800/90 backdrop-blur rounded-full transition-all border border-slate-700 shadow-lg group/btn hover:scale-110"
        >
            <Heart className={`w-4 h-4 transition-colors ${isFavorite ? 'fill-rose-500 text-rose-500' : 'text-slate-400 group-hover/btn:text-rose-400'}`} />
        </button>
        {!isSeen && (
            <div className="absolute top-0 left-0 z-10 -ml-2 -mt-2">
                <span className="relative flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-slate-900"></span>
                </span>
            </div>
        )}
        <div className={`glass-panel overflow-hidden flex max-h-36 sm:max-h-52 hover:border-blue-500/50 transition-all duration-200 hover:shadow-[0_4px_20px_-5px_rgba(59,130,246,0.3)] ${!isSeen ? 'border-emerald-500/30' : ''}`}>
            <div className="w-32 sm:w-64 shrink-0 self-stretch relative bg-slate-900/50 flex items-center justify-center overflow-hidden">
                <BlurImage img={offer.img} title={offer.title} className="relative w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 drop-shadow-2xl z-10" />
                {(!offer.img || offer.img === 'NULL') && <span className="text-slate-500 text-[10px] sm:text-xs text-center px-2">{t('noImage')}</span>}
            </div>
            <div className="flex-1 px-3 sm:px-6 py-2 sm:py-5 flex flex-col justify-between min-w-0">
                <div>
                    <h2 className="text-sm font-bold text-white line-clamp-1 group-hover:text-blue-400 transition-colors">{offer.title || 'Unknown Title'}</h2>
                    {/* Price on mobile only */}
                    <div className="sm:hidden text-emerald-400 font-black text-xs mt-0.5">
                        {offer.price ? formatPrice(offer.price) : t('askPrice')}
                        {offer.price && <span className="text-[10px] text-emerald-500/80 ml-0.5">PLN</span>}
                    </div>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 min-w-0">
                        <MapPin className="w-3 h-3 shrink-0" /> <span className="truncate">{offer.location || 'Unknown Location'}</span>
                    </p>
                </div>
                <div className="flex flex-wrap gap-x-2 sm:gap-x-4 gap-y-0.5 text-[10px] sm:text-xs mt-1 sm:mt-2">
                    {offer.year && <span className="text-slate-400"><span className="hidden sm:inline">{t('year')}: </span><span className="font-semibold text-slate-200">{offer.year}</span></span>}
                    {offer.mileage && <span className="text-slate-400"><span className="hidden sm:inline">{t('mileage_label')}: </span><span className="font-semibold text-slate-200">{offer.mileage}</span></span>}
                    {offer.fuel && <span className="text-slate-400"><span className="hidden sm:inline">{t('fuel')}: </span><span className="font-semibold text-slate-200">{offer.fuel}</span></span>}
                </div>
                <div className="mt-auto pt-2 flex flex-col gap-0.5 text-[10px] text-slate-500">
                    <span>{t('published')}: {offer.date}</span>
                    <span>{t('scraped')}: {offer.created_at ? offer.created_at.slice(0, 10).replace(/-/g, '.') + ' ' + offer.created_at.slice(11, 16) : '-'}</span>
                </div>
            </div>
            <div className="hidden sm:flex shrink-0 items-center pr-10 sm:pr-14 pl-2 sm:pl-4 border-l border-slate-700/50">
                <div className="text-right">
                    <div className="text-sm sm:text-lg font-black text-emerald-400 whitespace-nowrap">
                        {offer.price ? formatPrice(offer.price) : t('askPrice')}
                        {offer.price && <span className="text-[10px] sm:text-xs text-emerald-500/80 ml-0.5 sm:ml-1">PLN</span>}
                    </div>
                </div>
            </div>
        </div>
    </div>
);

const Toast = ({ message, type = 'success', onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="fixed bottom-6 right-6 z-[300] animate-in slide-in-from-right-10 duration-300">
            <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl border-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl ${type === 'success'
                ? 'bg-slate-900 border-emerald-500/40 text-emerald-400'
                : 'bg-slate-900 border-blue-500/40 text-blue-400'
                }`}>
                <div className={`p-1.5 rounded-full ${type === 'success' ? 'bg-emerald-500/10' : 'bg-blue-500/10'}`}>
                    {type === 'success' ? <Check className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                </div>
                <span className="text-sm font-black tracking-wide">{message}</span>
                <button onClick={onClose} className="ml-4 p-1 hover:bg-white/10 rounded-lg transition-colors text-slate-500 hover:text-white">
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

const SaveSearchModal = ({ onSave, onClose, t }) => {
    const [name, setName] = useState('');
    const [telegramNotifications, setTelegramNotifications] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                <h3 className="text-xl font-bold text-white mb-4">{t('saveSearch')}</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">{t('searchName')}</label>
                        <input
                            ref={inputRef}
                            autoFocus
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. My Dream Audi"
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all shadow-inner"
                            onKeyDown={(e) => e.key === 'Enter' && name.trim() && onSave(name, telegramNotifications)}
                        />
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={telegramNotifications}
                                onChange={(e) => setTelegramNotifications(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                            <Send className="w-4 h-4 text-blue-400" />
                            <span>{t('telegramNotifications') || 'Telegram Notifications'}</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 mt-8">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition-all border border-slate-700"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSave(name, telegramNotifications)}
                        disabled={!name.trim()}
                        className="flex-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20"
                    >
                        {t('saveSearch')}
                    </button>
                </div>
            </div>
        </div>
    );
};

const LogsModal = ({ logs, onClose, t }) => {
    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl h-[70vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <h3 className="text-xl font-bold text-white flex items-center gap-3">
                        <Info className="text-blue-400 w-5 h-5" /> Scraper Logs
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar font-mono text-[10px] space-y-1 bg-slate-950/50">
                    {logs.map((log, i) => (
                        <div key={log.id || i} className="flex gap-3 py-1 border-b border-slate-900/50 last:border-0 group">
                            <span className="text-slate-600 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                            <span className="text-slate-300 break-words group-hover:text-white transition-colors">{log.message}</span>
                        </div>
                    ))}
                    {logs.length === 0 && <div className="text-center py-12 text-slate-600 italic">No logs yet...</div>}
                </div>
                <div className="p-4 border-t border-slate-800 flex justify-end">
                    <button onClick={onClose} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all border border-slate-700">Close</button>
                </div>
            </div>
        </div>
    );
};

function App() {
    const [lang, setLang] = useState('pl');
    const t = (key) => translations[lang][key] || key;

    const [selectedOffer, setSelectedOffer] = useState(null);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showSavedDrawer, setShowSavedDrawer] = useState(false);
    const [showFilters, setShowFilters] = useState(window.innerWidth >= 768);
    const [showLogsModal, setShowLogsModal] = useState(false);
    const [scraperLogs, setScraperLogs] = useState([]);
    const [toasts, setToasts] = useState([]);

    const showToast = (message, type = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };
    const [data, setData] = useState({ results: [], count: 0, next: null, previous: null });
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

    const [search, setSearch] = useState("");
    const [ordering, setOrdering] = useState("-created_at");
    const [brandFilter, setBrandFilter] = useState("");
    const [fuelFilter, setFuelFilter] = useState([]);
    const [onlyNew, setOnlyNew] = useState(false);
    const [onlyFavorites, setOnlyFavorites] = useState(false);
    const [onlyWithPrice, setOnlyWithPrice] = useState(false);
    const [showArchived, setShowArchived] = useState(false);
    const [excludeBullshit, setExcludeBullshit] = useState(false);
    const [pageSize, setPageSize] = useState(18);
    const [isInfinite, setIsInfinite] = useState(false);
    const [allResults, setAllResults] = useState([]);
    const [showBackToTop, setShowBackToTop] = useState(false);
    const loaderRef = useRef(null);

    // Range Filters
    const [yearMin, setYearMin] = useState("");
    const [yearMax, setYearMax] = useState("");
    const [priceMin, setPriceMin] = useState("");
    const [priceMax, setPriceMax] = useState("");
    const [mileageMin, setMileageMin] = useState("");
    const [mileageMax, setMileageMax] = useState("");
    const [publishedAfter, setPublishedAfter] = useState("");
    const [publishedBefore, setPublishedBefore] = useState("");

    const [savedSearches, setSavedSearches] = useState([]);
    const [scraperStatus, setScraperStatus] = useState(null);
    const [isTriggering, setIsTriggering] = useState(false);
    const [triggerAnchorRun, setTriggerAnchorRun] = useState(null);

    const [pageAnchors, setPageAnchors] = useState({ 1: null });
    const debouncedSearch = useDebounce(search, 500);
    const debouncedYearMin = useDebounce(yearMin, 500);
    const debouncedYearMax = useDebounce(yearMax, 500);
    const debouncedPriceMin = useDebounce(priceMin, 500);
    const debouncedPriceMax = useDebounce(priceMax, 500);
    const debouncedMileageMin = useDebounce(mileageMin, 500);
    const debouncedMileageMax = useDebounce(mileageMax, 500);

    const renderFilters = () => (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
            <div className="flex flex-wrap gap-3 sm:col-span-full pb-4 border-b border-slate-700/50 mb-2">
                <button
                    onClick={() => setOnlyNew(!onlyNew)}
                    className={`px-3 py-2 rounded-xl border text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${onlyNew
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)]'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                        }`}
                >
                    <div className={`w-1.5 h-1.5 rounded-full ${onlyNew ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}></div>
                    {t('onlyNew')}
                </button>

                <button
                    onClick={() => setOnlyWithPrice(!onlyWithPrice)}
                    className={`px-3 py-2 rounded-xl border text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${onlyWithPrice
                        ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-[0_0_20px_-5px_rgba(245,158,11,0.3)]'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                        }`}
                >
                    <div className={`w-1.5 h-1.5 rounded-full ${onlyWithPrice ? 'bg-amber-400' : 'bg-slate-600'}`}></div>
                    {t('hideWithoutPrice')}
                </button>

                <button
                    onClick={() => setExcludeBullshit(!excludeBullshit)}
                    className={`px-3 py-2 rounded-xl border text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${excludeBullshit
                        ? 'bg-orange-500/10 border-orange-500 text-orange-400 shadow-[0_0_20px_-5px_rgba(249,115,22,0.3)]'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                        }`}
                >
                    <div className={`w-1.5 h-1.5 rounded-full ${excludeBullshit ? 'bg-orange-400' : 'bg-slate-600'}`}></div>
                    {t('hideBullshit')}
                </button>

                <button
                    onClick={() => setShowArchived(!showArchived)}
                    className={`px-3 py-2 rounded-xl border text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${showArchived
                        ? 'bg-violet-500/10 border-violet-500 text-violet-400 shadow-[0_0_20px_-5px_rgba(139,92,246,0.3)]'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                        }`}
                >
                    <div className={`w-1.5 h-1.5 rounded-full ${showArchived ? 'bg-violet-400' : 'bg-slate-600'}`}></div>
                    {t('showArchived')}
                </button>
            </div>

            <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">{t('search')}</label>
                <input
                    type="text"
                    placeholder={t('keywords')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                />
            </div>

            <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">{t('sortBy')}</label>
                <select
                    value={ordering}
                    onChange={(e) => setOrdering(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                >
                    <option value="-created_at">{t('newestAdded')}</option>
                    <option value="created_at">{t('oldestAdded')}</option>
                    <option value="-date">{t('publishedNewest')}</option>
                    <option value="date">{t('publishedOldest')}</option>
                    <option value="-year_num">{t('newestProduction')}</option>
                    <option value="year_num">{t('oldestProduction')}</option>
                    <option value="price_num">{t('priceLowHigh')}</option>
                    <option value="-price_num">{t('priceHighLow')}</option>
                    <option value="mileage_num">{t('mileageLowHigh')}</option>
                </select>
            </div>

            <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">{t('brand')}</label>
                <input
                    type="text"
                    placeholder="e.g. Audi, BMW"
                    value={brandFilter}
                    onChange={(e) => setBrandFilter(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                />
            </div>

            <div className="sm:col-span-2 lg:col-span-1 lg:col-start-4 lg:row-span-2 self-start">
                <label className="block text-xs font-medium text-slate-400 mb-2">{t('fuelType')}</label>
                <div className="flex flex-wrap gap-2">
                    {[
                        { id: 'Benzyna', label: 'Benzyna' },
                        { id: 'Olej Napędowy', label: lang === 'pl' ? 'Diesel' : 'Diesel' },
                        { id: 'Autogaz', label: lang === 'pl' ? 'LPG' : 'LPG' },
                        { id: 'Hybryda', label: 'Hybryda' },
                        { id: 'Elektryczny', label: lang === 'pl' ? 'Elektryczny' : 'Electric' },
                        { id: 'Alternatywne', label: 'Alternatywne' }
                    ].map(f => {
                        const isActive = fuelFilter.includes(f.id);
                        return (
                            <button
                                key={f.id}
                                onClick={() => {
                                    setPage(1);
                                    setFuelFilter(prev => 
                                        prev.includes(f.id) 
                                        ? prev.filter(x => x !== f.id) 
                                        : [...prev, f.id]
                                    );
                                }}
                                className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-tight transition-all ${
                                    isActive
                                    ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.3)]'
                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                                }`}
                            >
                                {f.label}
                            </button>
                        );
                    })}
                    {fuelFilter.length > 0 && (
                        <button 
                            onClick={() => { setPage(1); setFuelFilter([]); }}
                            className="px-2 py-1.5 text-[10px] font-bold text-rose-400 hover:text-rose-300 underline underline-offset-4"
                        >
                            {lang === 'pl' ? 'Wyczyść' : 'Clear'}
                        </button>
                    )}
                </div>
            </div>

            <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">{t('price')}</label>
                <div className="flex gap-2">
                    <input
                        type="number"
                        placeholder={lang === 'pl' ? 'Od' : 'From'}
                        value={priceMin}
                        onChange={(e) => setPage(1) || setPriceMin(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                    />
                    <input
                        type="number"
                        placeholder={lang === 'pl' ? 'Do' : 'To'}
                        value={priceMax}
                        onChange={(e) => setPage(1) || setPriceMax(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">{t('mileage')}</label>
                <div className="flex gap-2">
                    <input
                        type="number"
                        placeholder={lang === 'pl' ? 'Od' : 'From'}
                        value={mileageMin}
                        onChange={(e) => setPage(1) || setMileageMin(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                    />
                    <input
                        type="number"
                        placeholder={lang === 'pl' ? 'Do' : 'To'}
                        value={mileageMax}
                        onChange={(e) => setPage(1) || setMileageMax(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">{t('productionYear')}</label>
                <div className="flex gap-2">
                    <input
                        type="number"
                        placeholder={lang === 'pl' ? 'Od' : 'From'}
                        value={yearMin}
                        onChange={(e) => setPage(1) || setYearMin(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                    />
                    <input
                        type="number"
                        placeholder={lang === 'pl' ? 'Do' : 'To'}
                        value={yearMax}
                        onChange={(e) => setPage(1) || setYearMax(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                    />
                </div>
            </div>

            {/* Published Date Range + Quick Presets — full width */}
            <div className="sm:col-span-full pt-2 border-t border-slate-700/50 mt-2">
                <div className="flex flex-row flex-wrap gap-3 items-end">
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-400 mb-1">{t('publishedFrom')}</label>
                        <input
                            type="date"
                            value={publishedAfter.replace(/\./g, '-')}
                            onChange={(e) => setPublishedAfter(e.target.value.replace(/-/g, '.'))}
                            className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all [color-scheme:dark]"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-400 mb-1">{t('publishedTo')}</label>
                        <input
                            type="date"
                            value={publishedBefore.replace(/\./g, '-')}
                            onChange={(e) => setPublishedBefore(e.target.value.replace(/-/g, '.'))}
                            className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all [color-scheme:dark]"
                        />
                    </div>
                    <div className="flex gap-1.5 flex-wrap shrink-0 pb-0.5">
                        <span className="text-xs text-slate-500 w-full sm:w-auto self-center whitespace-nowrap">{t('within')}:</span>
                        {DATE_PRESETS.map(({ label, days }) => {
                            const val = getPublishedAfterDate(days);
                            const isActive = publishedAfter === val && !publishedBefore;
                            return (
                                <button
                                    key={label}
                                    onClick={() => {
                                        if (isActive) {
                                            setPublishedAfter('');
                                        } else {
                                            setPublishedAfter(val);
                                            setPublishedBefore('');
                                        }
                                    }}
                                    className={`px-2.5 py-1.5 rounded-md text-xs font-semibold border transition-all ${isActive
                                        ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                                        : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-blue-500 hover:text-white'
                                        }`}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Bottom Buttons — 50/50 full width */}
            <div className="sm:col-span-full grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                <button
                    onClick={clearFilters}
                    className="py-2.5 bg-slate-700 hover:bg-slate-600 text-sm font-medium rounded-lg transition-colors cursor-pointer border border-slate-600"
                >
                    {t('clearFilters')}
                </button>
                <button
                    onClick={saveAsDefault}
                    className="py-2.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 text-sm font-bold rounded-lg transition-colors cursor-pointer flex justify-center items-center gap-2"
                >
                    <Save className="w-4 h-4" /> {t('saveAsDefault')}
                </button>
                <button
                    onClick={() => setShowSaveModal(true)}
                    className="py-2.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 text-sm font-bold rounded-lg transition-colors cursor-pointer flex justify-center items-center gap-2"
                >
                    <Bookmark className="w-4 h-4" /> {t('saveSearch')}
                </button>
            </div>
        </div>
    );

    const fetchOffers = async (append = false) => {
        setLoading(true);
        try {
            let fetchPage = page;
            let url = `${API_BASE_URL}/api/offers/?ordering=${ordering}&page_size=${pageSize}`;

            // Keyset pagination logic for stability (especially with 'Only New' filter)
            if (ordering === '-created_at') {
                if (append && allResults.length > 0) {
                    // Infinite scroll append
                    const lastItem = allResults[allResults.length - 1];
                    if (lastItem.created_at) {
                        url += `&created_before=${encodeURIComponent(lastItem.created_at)}`;
                        fetchPage = 1;
                    }
                } else if (!append && page > 1 && pageAnchors[page]) {
                    // Manual page change forward/backward
                    url += `&created_before=${encodeURIComponent(pageAnchors[page])}`;
                    fetchPage = 1;
                }
            }

            url += `&page=${fetchPage}`;
            if (debouncedSearch) url += `&search=${encodeURIComponent(debouncedSearch)}`;
            if (brandFilter) url += `&brand=${encodeURIComponent(brandFilter)}`;
            if (fuelFilter.length > 0) url += `&fuel=${encodeURIComponent(fuelFilter.join(','))}`;
            if (debouncedYearMin) url += `&year_min=${encodeURIComponent(debouncedYearMin)}`;
            if (debouncedYearMax) url += `&year_max=${encodeURIComponent(debouncedYearMax)}`;

            if (excludeBullshit) {
                const effectiveMin = Math.max(parseInt(debouncedPriceMin) || 0, 500);
                url += `&price_min=${effectiveMin}`;
            } else if (debouncedPriceMin) {
                url += `&price_min=${encodeURIComponent(debouncedPriceMin)}`;
            }
            if (debouncedPriceMax) url += `&price_max=${encodeURIComponent(debouncedPriceMax)}`;
            if (debouncedMileageMin) url += `&mileage_min=${encodeURIComponent(debouncedMileageMin)}`;
            if (debouncedMileageMax) url += `&mileage_max=${encodeURIComponent(debouncedMileageMax)}`;
            if (onlyNew) url += `&is_seen=false`;
            if (onlyFavorites) url += `&is_favorite=true`;
            if (onlyWithPrice) url += `&has_price=true`;
            if (showArchived) url += `&is_archived=true`;
            if (publishedAfter) url += `&published_after=${encodeURIComponent(publishedAfter)}`;
            if (publishedBefore) url += `&published_before=${encodeURIComponent(publishedBefore)}`;

            const response = await fetch(url);
            const result = await response.json();
            const results = result.results || [];

            if (append) {
                setAllResults(prev => {
                    const current = prev || [];
                    const newIds = new Set(results.map(r => r.id));
                    return [...current.filter(p => !newIds.has(p.id)), ...results];
                });
                setData(result);
            } else {
                setAllResults(results);
                setData(result);
            }
        } catch (err) {
            console.error("Failed to fetch offers:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchSavedSearches = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/saved_searches/`);
            const result = await response.json();
            setSavedSearches(result.results || result);
        } catch (err) {
            console.error("Failed to fetch saved searches:", err);
        }
    };

    const fetchScraperLogs = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/scraper_logs/`);
            const data = await response.json();
            setScraperLogs(data.results || data);
        } catch (err) {
            console.error("Failed to fetch scraper logs:", err);
        }
    };

    const fetchScraperStatus = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/scraper_status/1/`);
            const data = await response.json();

            setScraperStatus(data);
        } catch (err) {
            console.error("Failed to fetch scraper status:", err);
        }
    };

    useEffect(() => {
        if (isTriggering && scraperStatus && (scraperStatus.is_running || scraperStatus.next_run !== triggerAnchorRun)) {
            setIsTriggering(false);
            setTriggerAnchorRun(null);
        }
    }, [scraperStatus, isTriggering, triggerAnchorRun]);

    useEffect(() => {
        const savedDefault = localStorage.getItem('default_filters');
        if (savedDefault) {
            applySavedSearch(savedDefault);
        }
        fetchSavedSearches();
        fetchScraperStatus();
        fetchScraperLogs();
        // Poll for updates every 30 seconds
        const intervalId = setInterval(() => {
            fetchSavedSearches();
            fetchScraperStatus();
            fetchScraperLogs();
        }, 30000);
        return () => clearInterval(intervalId);
    }, []);

    const handleForceScrape = async () => {
        if (!scraperStatus) return;
        try {
            setIsTriggering(true);
            setTriggerAnchorRun(scraperStatus.next_run);

            await fetch(`${API_BASE_URL}/api/scraper_status/${scraperStatus.id}/trigger/`, {
                method: 'POST'
            });

            // Poll more frequently for a few seconds to catch the state change
            const pollQuickly = setInterval(fetchScraperStatus, 2000);

            // Safety timeout: stop "faking" active status after 30s no matter what
            setTimeout(() => {
                clearInterval(pollQuickly);
                setIsTriggering(false);
            }, 30000);

            showToast(t('scrapeTriggered') || 'Scraper started!');
        } catch (err) {
            console.error("Failed to trigger scrape:", err);
            setIsTriggering(false);
            showToast('Failed to start scraper', 'error');
        }
    };

    const handleTestTelegram = async () => {
        if (!scraperStatus || !scraperStatus.telegram_configured) {
            showToast(t('telegramNotConfigured') || 'Telegram bot is not configured in .env', 'error');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/scraper_status/${scraperStatus.id}/test_telegram/`, {
                method: 'POST'
            });
            const data = await response.json();
            if (response.ok) {
                showToast(t('testMessageSent') || 'Test message sent successfully!', 'success');
            } else {
                showToast(data.message || 'Failed to send test message', 'error');
            }
        } catch (err) {
            console.error("Failed to test telegram:", err);
            showToast('Failed to connect to backend', 'error');
        }
    };

    useEffect(() => {
        if (page === 1) {
            fetchOffers(false);
        } else if (isInfinite) {
            fetchOffers(true);
        } else {
            fetchOffers(false);
        }
    }, [page, ordering, debouncedSearch, brandFilter, fuelFilter, debouncedYearMin, debouncedYearMax, debouncedPriceMin, debouncedPriceMax, debouncedMileageMin, debouncedMileageMax, onlyNew, onlyFavorites, onlyWithPrice, showArchived, excludeBullshit, publishedAfter, publishedBefore, pageSize, isInfinite]);

    useEffect(() => {
        setPage(1);
        setAllResults([]);
    }, [ordering, debouncedSearch, brandFilter, fuelFilter, debouncedYearMin, debouncedYearMax, debouncedPriceMin, debouncedPriceMax, debouncedMileageMin, debouncedMileageMax, onlyNew, onlyFavorites, onlyWithPrice, showArchived, excludeBullshit, publishedAfter, publishedBefore, pageSize, isInfinite]);

    // Infinite Scroll Observer
    useEffect(() => {
        if (!isInfinite || !data.next || loading) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setPage(prev => prev + 1);
                }
            },
            { threshold: 0.1, rootMargin: '200px' }
        );

        if (loaderRef.current) observer.observe(loaderRef.current);
        return () => observer.disconnect();
    }, [isInfinite, data.next, loading]);

    useEffect(() => {
        const handleScroll = () => {
            setShowBackToTop(window.scrollY > 500);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const clearFilters = () => {
        setSearch('');
        setOrdering('-created_at');
        setBrandFilter('');
        setFuelFilter([]);
        setYearMin('');
        setYearMax('');
        setPriceMin('');
        setPriceMax('');
        setMileageMin('');
        setMileageMax('');
        setOnlyNew(false);
        setOnlyFavorites(false);
        setOnlyWithPrice(false);
        setPage(1);
        setPageAnchors({ 1: null });
        setShowArchived(false);
        setExcludeBullshit(false);
        setPublishedAfter('');
        setPublishedBefore('');
    };

    const getPublishedAfterDate = (days) => {
        const d = new Date();
        d.setDate(d.getDate() - days);
        return d.toISOString().slice(0, 10).replace(/-/g, '.');
    };

    const DATE_PRESETS = [
        { label: '1D', days: 1 },
        { label: '1W', days: 7 },
        { label: '2W', days: 14 },
        { label: '3W', days: 21 },
        { label: '1M', days: 30 },
        { label: '2M', days: 60 },
        { label: '3M', days: 90 },
    ];

    const saveCurrentSearch = async (name, telegramNotifications = false) => {
        if (telegramNotifications && (!scraperStatus || !scraperStatus.telegram_configured)) {
            showToast(t('telegramNotConfigured') || 'Telegram bot is not configured in .env', 'error');
            return;
        }
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (ordering) params.append('ordering', ordering);
        if (brandFilter) params.append('brand', brandFilter);
        if (fuelFilter.length > 0) params.append('fuel', fuelFilter.join(','));
        if (yearMin) params.append('year_min', yearMin);
        if (yearMax) params.append('year_max', yearMax);

        if (excludeBullshit) {
            const effectiveMin = Math.max(parseInt(priceMin) || 0, 500);
            params.append('price_min', effectiveMin.toString());
        } else if (priceMin) {
            params.append('price_min', priceMin);
        }
        if (priceMax) params.append('price_max', priceMax);
        if (mileageMin) params.append('mileage_min', mileageMin);
        if (mileageMax) params.append('mileage_max', mileageMax);
        if (onlyNew) params.append('is_seen', 'false');
        if (onlyFavorites) params.append('is_favorite', 'true');
        if (onlyWithPrice) params.append('has_price', 'true');
        if (showArchived) params.append('is_archived', 'true');
        if (publishedAfter) params.append('published_after', publishedAfter);
        if (publishedBefore) params.append('published_before', publishedBefore);

        try {
            await fetch(`${API_BASE_URL}/api/saved_searches/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    query_string: params.toString(),
                    telegram_notifications: telegramNotifications
                })
            });
            fetchSavedSearches();
            setShowSaveModal(false);
            showToast(t('searchSaved') || 'Search saved successfully!');
        } catch (err) {
            console.error("Failed to save search:", err);
            showToast('Failed to save search', 'error');
        }
    };

    const toggleTelegram = async (id, currentStatus) => {
        // Only check if we are toggling it ON
        if (!currentStatus && (!scraperStatus || !scraperStatus.telegram_configured)) {
            showToast(t('telegramNotConfigured') || 'Telegram bot is not configured in .env', 'error');
            return;
        }

        try {
            await fetch(`${API_BASE_URL}/api/saved_searches/${id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telegram_notifications: !currentStatus })
            });
            fetchSavedSearches();
            showToast(t('savedSearchesRefreshed'), 'info');
        } catch (err) {
            console.error("Failed to toggle telegram:", err);
            showToast('Failed to update telegram status', 'error');
        }
    };

    const toggleFavorite = (offerId, currentIsFavorite) => {
        const nextFav = !currentIsFavorite;
        fetch(`${API_BASE_URL}/api/offers/${offerId}/toggle_favorite/`, { method: 'POST' })
            .then(() => {
                showToast(nextFav ? t('addedToFavorites') : t('removedFromFavorites'));
                // Update local data
                const updateItem = (o) => o.id === offerId ? { ...o, is_favorite: nextFav } : o;
                setData(prev => ({
                    ...prev,
                    results: prev.results?.map(updateItem) || []
                }));
                setAllResults(prev => prev?.map(updateItem) || []);
                if (selectedOffer && selectedOffer.id === offerId) {
                    setSelectedOffer(prev => prev ? { ...prev, is_favorite: nextFav } : null);
                }
            })
            .catch(err => {
                console.error("Failed to toggle favorite", err);
                showToast('Failed to update favorite', 'error');
            });
    };

    const saveAsDefault = () => {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (ordering) params.append('ordering', ordering);
        if (brandFilter) params.append('brand', brandFilter);
        if (fuelFilter.length > 0) params.append('fuel', fuelFilter.join(','));
        if (yearMin) params.append('year_min', yearMin);
        if (yearMax) params.append('year_max', yearMax);

        if (excludeBullshit) {
            const effectiveMin = Math.max(parseInt(priceMin) || 0, 500);
            params.append('price_min', effectiveMin.toString());
        } else if (priceMin) {
            params.append('price_min', priceMin);
        }
        if (priceMax) params.append('price_max', priceMax);
        if (mileageMin) params.append('mileage_min', mileageMin);
        if (mileageMax) params.append('mileage_max', mileageMax);
        if (onlyNew) params.append('is_seen', 'false');
        if (onlyFavorites) params.append('is_favorite', 'true');
        if (onlyWithPrice) params.append('has_price', 'true');
        if (showArchived) params.append('is_archived', 'true');
        if (publishedAfter) params.append('published_after', publishedAfter);
        if (publishedBefore) params.append('published_before', publishedBefore);

        localStorage.setItem('default_filters', params.toString());
        showToast(t('defaultFiltersSaved'), 'info');
    };

    const applySavedSearch = (qs) => {
        const params = new URLSearchParams(qs);
        setSearch(params.get('search') || "");
        setBrandFilter(params.get('brand') || "");
        const fuel = params.get('fuel');
        setFuelFilter(fuel ? fuel.split(',') : []);
        setYearMin(params.get('year_min') || "");
        setYearMax(params.get('year_max') || "");
        setPriceMin(params.get('price_min') || "");
        setPriceMax(params.get('price_max') || "");
        setMileageMin(params.get('mileage_min') || "");
        setMileageMax(params.get('mileage_max') || "");
        setOnlyNew(params.get('is_seen') === 'false');
        setOnlyFavorites(params.get('is_favorite') === 'true');
        setOnlyWithPrice(params.get('has_price') === 'true');
        setShowArchived(params.get('is_archived') === 'true');
        setExcludeBullshit(params.get('price_min') === '500');
        setPublishedAfter(params.get('published_after') || "");
        setPublishedBefore(params.get('published_before') || "");
        setPage(1);
        setShowSavedDrawer(false);
    };

    const deleteSavedSearch = async (id) => {
        if (!confirm("Delete this saved search?")) return;
        try {
            await fetch(`${API_BASE_URL}/api/saved_searches/${id}/`, { method: 'DELETE' });
            fetchSavedSearches();
        } catch (err) {
            console.error("Failed to delete search", err);
        }
    };

    const handleSelectOffer = (offer) => {
        setSelectedOffer(offer);
    };

    const handleBack = () => {
        setSelectedOffer(null);
    };

    const handlePageChange = (newPage) => {
        if (newPage > page && allResults && allResults.length > 0) {
            // Moving forward: store the last item's timestamp as the anchor for the new page
            const lastItem = allResults[allResults.length - 1];
            if (lastItem.created_at) {
                setPageAnchors(prev => ({ ...prev, [newPage]: lastItem.created_at }));
            }
        }
        setPage(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <>
            {selectedOffer && (
                <OfferDetails
                    offer={selectedOffer}
                    onBack={handleBack}
                    t={t}
                    onToggleFavorite={toggleFavorite}
                />
            )}
            <div className="min-h-screen p-4 md:p-6 custom-scrollbar">
                <header className="mb-4 md:mb-8 flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-700 pb-6 gap-6">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between md:justify-start gap-4 w-full md:w-auto">
                            <h1 className="text-2xl sm:text-4xl font-extrabold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                                {t('title')}
                            </h1>
                            <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700 scale-90">
                                <button
                                    onClick={() => setLang('pl')}
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${lang === 'pl' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                                >
                                    PL
                                </button>
                                <button
                                    onClick={() => setLang('en')}
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${lang === 'en' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                                >
                                    EN
                                </button>
                            </div>
                        </div>
                        <p className="text-slate-400 text-sm flex flex-wrap items-center gap-y-2">
                            {t('subtitle')}
                            {scraperStatus && (
                                <span className="flex flex-wrap items-center gap-1.5 md:ml-3 md:pl-3 md:border-l border-slate-700">
                                    <span className={`w-1.5 h-1.5 rounded-full ${(scraperStatus.is_running || isTriggering) ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-slate-500'}`}></span>
                                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                                        {(scraperStatus.is_running || isTriggering) ? (
                                            <span className="text-emerald-400">{t('scrapingNow')}</span>
                                        ) : (
                                            <span>
                                                {t('nextRun')}: {new Date(scraperStatus.next_run).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                <button
                                                    onClick={handleForceScrape}
                                                    className="ml-2 text-[10px] text-blue-400 hover:text-blue-300 underline font-medium cursor-pointer"
                                                >
                                                    {t('runNow')}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        fetchScraperLogs();
                                                        setShowLogsModal(true);
                                                    }}
                                                    className="ml-2 text-[10px] text-slate-400 hover:text-slate-300 underline font-medium cursor-pointer"
                                                >
                                                    {t('logs') || 'Logs'}
                                                </button>
                                            </span>
                                        )}
                                    </span>
                                </span>
                            )}
                        </p>
                    </div>
                    <div className="text-slate-300 text-sm flex flex-wrap items-center gap-3 w-full md:w-auto">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border transition-all w-full md:w-auto ${showFilters
                                ? 'bg-blue-600/20 border-blue-500/50 text-blue-400 shadow-[0_0_15px_-3px_rgba(37,99,235,0.4)]'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                                }`}
                        >
                            <Filter className={`w-4 h-4 transition-transform duration-300 ${showFilters ? 'rotate-180 scale-110' : ''}`} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{t('filters')}</span>
                        </button>

                        <button
                            onClick={() => setOnlyFavorites(!onlyFavorites)}
                            className={`relative flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border transition-all group overflow-hidden w-full md:w-auto ${onlyFavorites
                                ? 'bg-rose-500/10 border-rose-500/50 text-rose-400 shadow-[0_0_20px_-5px_rgba(244,63,94,0.3)]'
                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:border-slate-600'
                                }`}
                        >
                            <div className={`absolute inset-0 bg-rose-500/10 transition-transform duration-300 ${onlyFavorites ? 'translate-y-0' : 'translate-y-full'}`}></div>
                            <Heart className={`w-4 h-4 relative z-10 transition-all duration-300 ${onlyFavorites ? 'fill-rose-500 text-rose-500 scale-110' : 'text-slate-400 group-hover:text-rose-400'}`} />
                            <span className="text-[10px] font-black uppercase tracking-widest relative z-10">{t('favorites')}</span>
                        </button>

                        <button
                            onClick={() => setShowSavedDrawer(true)}
                            className="relative flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-all group w-full md:w-auto"
                        >
                            <Bookmark className={`w-4 h-4 transition-colors ${savedSearches.some(ss => ss.new_count > 0) ? 'text-emerald-400' : 'text-slate-400 group-hover:text-emerald-400'}`} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{t('savedSearches')}</span>
                            {savedSearches.reduce((acc, ss) => acc + (ss.new_count || 0), 0) > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 text-[8px] font-bold text-white flex items-center justify-center">
                                        {savedSearches.reduce((acc, ss) => acc + (ss.new_count || 0), 0)}
                                    </span>
                                </span>
                            )}
                        </button>
                    </div>
                </header>

                <div className="flex flex-col gap-4 md:gap-6">
                    <div className="w-full">
                        {/* Desktop Filters Panel (Inline) */}
                        {!onlyFavorites && showFilters && (
                            <div className="hidden md:block glass-panel p-5 w-full mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                        <Filter className="w-5 h-5" /> {t('filters')}
                                    </h3>
                                </div>
                                {renderFilters()}
                            </div>
                        )}

                        {/* Mobile Filters Drawer */}
                        <div className={`fixed inset-y-0 left-0 z-[130] w-full sm:w-80 bg-slate-900 border-r border-slate-800 shadow-[20px_0_50px_rgba(0,0,0,0.5)] transform transition-transform duration-300 ease-in-out md:hidden ${showFilters && !onlyFavorites ? 'translate-x-0' : '-translate-x-full'}`}>
                            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/90 backdrop-blur-sm sticky top-0 z-10">
                                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                    <Filter className="text-blue-400 w-5 h-5" /> {t('filters')}
                                </h3>
                                <button onClick={() => setShowFilters(false)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto h-[calc(100%-80px)] custom-scrollbar">
                                {renderFilters()}
                            </div>
                        </div>

                        {/* Mobile Drawer Backdrop */}
                        {showFilters && !onlyFavorites && (
                            <div className="fixed inset-0 z-[125] bg-slate-950/60 backdrop-blur-md md:hidden animate-in fade-in duration-300" onClick={() => setShowFilters(false)}></div>
                        )}
                    </div>

                    <div className="w-full">
                        {/* Controls Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-slate-900/50 p-4 rounded-2xl border border-slate-800 shadow-xl">
                            <div className="flex items-center gap-6">
                                <span className="text-slate-400 text-sm">
                                    {t('showing')} <span className="font-bold text-white">{data.count || 0}</span> {t('offers')}
                                </span>

                                <div className="h-4 w-px bg-slate-800 hidden sm:block"></div>

                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">{t('pageSize')}</span>
                                    <select
                                        value={pageSize}
                                        onChange={(e) => setPageSize(Number(e.target.value))}
                                        className="bg-slate-800 border border-slate-700 text-white text-[10px] font-bold rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 transition-all cursor-pointer hover:bg-slate-700"
                                    >
                                        {[12, 18, 24, 36, 48].map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setIsInfinite(!isInfinite)}
                                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${isInfinite ? 'bg-purple-600/20 border-purple-500 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.2)]' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'}`}
                                >
                                    <LayoutGrid className={`w-3.5 h-3.5 ${isInfinite ? 'animate-pulse' : ''}`} />
                                    {t('infiniteScroll')}
                                </button>

                                <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 p-1">
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                                    >
                                        <LayoutGrid className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                                    >
                                        <LayoutList className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {(loading && (!allResults || allResults.length === 0)) ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {(!allResults || allResults.length === 0) ? (
                                    <div className="glass-panel p-10 text-center text-slate-400">
                                        {t('noOffersFound')}
                                    </div>
                                ) : (
                                    viewMode === 'grid' ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {allResults.map(offer => (
                                                <OfferCard key={offer.id} offer={offer} onSelect={handleSelectOffer} t={t} showToast={showToast} onToggleFavorite={toggleFavorite} viewMode="grid" />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-3">
                                            {allResults.map(offer => (
                                                <OfferCard key={offer.id} offer={offer} onSelect={handleSelectOffer} t={t} showToast={showToast} onToggleFavorite={toggleFavorite} viewMode="list" />
                                            ))}
                                        </div>
                                    )
                                )}

                                {isInfinite && data.next && (
                                    <div ref={loaderRef} className="py-12 flex justify-center">
                                        <div className="flex items-center gap-3 text-purple-400">
                                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] ml-2">{t('loadingMore')}</span>
                                        </div>
                                    </div>
                                )}

                                {!isInfinite && data.count > pageSize && (
                                    <div className="flex justify-between items-center py-4">
                                        <button
                                            disabled={!data.previous}
                                            onClick={() => handlePageChange(page - 1)}
                                            className="px-4 py-2 bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 rounded text-sm font-medium transition-colors cursor-pointer"
                                        >
                                            {t('previousPage')}
                                        </button>
                                        <span className="text-sm text-slate-400">{lang === 'pl' ? 'Strona' : 'Page'} {page}</span>
                                        <button
                                            disabled={!data.next}
                                            onClick={() => handlePageChange(page + 1)}
                                            className="px-4 py-2 bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 rounded text-sm font-medium transition-colors cursor-pointer"
                                        >
                                            {t('nextPage')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showSaveModal && (
                <SaveSearchModal
                    onSave={saveCurrentSearch}
                    onClose={() => setShowSaveModal(false)}
                    t={t}
                />
            )}
            {showLogsModal && (
                <LogsModal
                    logs={scraperLogs}
                    onClose={() => setShowLogsModal(false)}
                    t={t}
                />
            )}
            {toasts.map(toast => (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    type={toast.type}
                    onClose={() => removeToast(toast.id)}
                />
            ))}

            {showBackToTop && !selectedOffer && (
                <button
                    onClick={scrollToTop}
                    className="fixed bottom-8 right-8 p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300"
                    title="Back to top"
                >
                    <ArrowUp className="w-6 h-6" />
                </button>
            )}

            {/* Saved Searches Side Drawer */}
            <div className={`fixed inset-y-0 right-0 z-[120] w-full sm:w-96 bg-slate-900 border-l border-slate-800 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] transform transition-transform duration-300 ease-in-out ${showSavedDrawer ? 'translate-x-0' : 'translate-x-full'}`}>
                {/* Drawer Header */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/90 backdrop-blur-sm sticky top-0 z-10">
                    <h3 className="text-xl font-bold text-white flex items-center gap-3">
                        <Bookmark className="text-emerald-400 w-5 h-5" /> {t('savedSearches')}
                    </h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                fetchSavedSearches();
                                showToast(t('savedSearchesRefreshed'), 'info');
                            }}
                            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-emerald-400 transition-colors"
                            title={t('refreshCounts')}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </button>
                        <button onClick={() => setShowSavedDrawer(false)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Drawer Content */}
                <div className="p-6 overflow-y-auto h-[calc(100%-80px)] custom-scrollbar">
                    <div className="space-y-3">
                        {savedSearches.length === 0 ? (
                            <div className="text-center py-12">
                                <Bookmark className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                                <p className="text-sm text-slate-500 italic">{t('noSavedSearches')}</p>
                            </div>
                        ) : (
                            savedSearches.map(ss => (
                                <div key={ss.id} className="group/item bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 hover:border-blue-500/30 transition-all">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex-1 cursor-pointer" onClick={() => applySavedSearch(ss.query_string)}>
                                            <h4 className="text-white font-bold group-hover/item:text-blue-400 transition-colors">{ss.name}</h4>
                                            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-tighter">
                                                {ss.query_string.split('&').join(' • ')}
                                            </p>
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => toggleTelegram(ss.id, ss.telegram_notifications)}
                                                className={`p-2 rounded-lg border transition-all ${ss.telegram_notifications ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-slate-700/30 border-slate-700 text-slate-500 hover:text-slate-300'}`}
                                                title="Telegram Notifications"
                                            >
                                                <Send className={`w-4 h-4 ${ss.telegram_notifications ? 'fill-blue-400/20' : ''}`} />
                                            </button>
                                            <button
                                                onClick={() => deleteSavedSearch(ss.id)}
                                                className="p-2 bg-slate-700/30 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-lg border border-slate-700 transition-all"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    {ss.new_count > 0 && (
                                        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full w-fit">
                                            <span className="flex h-2 w-2 relative">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                            </span>
                                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                                                {ss.new_count} {t('newResults')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {scraperStatus?.telegram_configured && (
                        <div className="mt-8 pt-6 border-t border-slate-800">
                            <button
                                onClick={handleTestTelegram}
                                className="w-full py-4 px-4 bg-slate-800/50 hover:bg-emerald-500/10 text-emerald-400 border border-slate-700 hover:border-emerald-500/30 rounded-xl transition-all flex items-center justify-center gap-3 font-bold text-sm group"
                            >
                                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                                    <Send className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                </div>
                                {t('testTelegram')}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Drawer Backdrop */}
            {showSavedDrawer && (
                <div className="fixed inset-0 z-[115] bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowSavedDrawer(false)}></div>
            )}
        </>
    );
}

export default App;
