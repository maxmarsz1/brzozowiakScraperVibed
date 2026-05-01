import { useState, useEffect, useRef } from 'react';
import { Filter, MapPin, Bookmark, Save, Trash2, Heart, Check, LayoutGrid, LayoutList, X, Bell, Info, ArrowUp } from 'lucide-react';
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

const OfferCard = ({ offer, onSelect, t, showToast, viewMode = 'grid' }) => {
    const [isSeen, setIsSeen] = useState(offer.is_seen);
    const [isFavorite, setIsFavorite] = useState(offer.is_favorite);
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
        const nextFav = !isFavorite;
        setIsFavorite(nextFav);
        fetch(`${API_BASE_URL}/api/offers/${offer.id}/toggle_favorite/`, { method: 'POST' })
            .then(() => {
                showToast(nextFav ? t('addedToFavorites') : t('removedFromFavorites'));
            })
            .catch(err => {
                console.error("Failed to toggle favorite", err);
                setIsFavorite(!nextFav);
                showToast('Failed to update favorite', 'error');
            });
    };

    if (viewMode === 'list') {
        return <ListCard offer={offer} onSelect={onSelect} isSeen={isSeen} isFavorite={isFavorite} handleToggleFavorite={handleToggleFavorite} cardRef={cardRef} />;
    }

    return (
        <div ref={cardRef} onClick={() => onSelect(offer)} className="block group relative cursor-pointer">
            <button
                onClick={handleToggleFavorite}
                className="absolute top-3 right-3 z-20 p-2 bg-slate-900/60 hover:bg-slate-800/90 backdrop-blur rounded-full transition-all border border-slate-700 shadow-lg group/btn hover:scale-110"
                title={isFavorite ? t('removeFavorite') : t('addFavorite')}
            >
                <Heart className={`w-5 h-5 transition-colors ${isFavorite ? 'fill-rose-500 text-rose-500' : 'text-slate-400 group-hover/btn:text-rose-400'}`} />
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
                    <div className="flex justify-between items-start mb-4 gap-3">
                        <div className="flex-1">
                            <h2 className="text-lg font-bold text-white mb-1 line-clamp-2 group-hover:text-blue-400 transition-colors leading-tight">{offer.title || t('unknownTitle')}</h2>
                            <p className="text-sm text-slate-400 flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {offer.location || t('unknownLocation')}
                            </p>
                        </div>
                        <div className="text-right shrink-0">
                            <div className="text-2xl font-black text-emerald-400 whitespace-nowrap">
                                {offer.price ? formatPrice(offer.price) : t('askPrice')}
                                {offer.price && <span className="text-base text-emerald-500/80 ml-1">PLN</span>}
                            </div>
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

                    <div className="mt-4 pt-4 border-t border-slate-700/50 flex justify-between text-xs text-slate-500">
                        <span>{t('published')}: {offer.date}</span>
                        <span>{t('id')}: {offer.offer_id}</span>
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
            className="absolute top-1/2 -translate-y-1/2 right-4 z-20 p-2 bg-slate-900/60 hover:bg-slate-800/90 backdrop-blur rounded-full transition-all border border-slate-700 shadow-lg group/btn hover:scale-110"
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
        <div className={`glass-panel overflow-hidden flex hover:border-blue-500/50 transition-all duration-200 hover:shadow-[0_4px_20px_-5px_rgba(59,130,246,0.3)] ${!isSeen ? 'border-emerald-500/30' : ''}`}>
            <div className="w-64 shrink-0 h-48 relative bg-slate-800 flex items-center justify-center overflow-hidden">
                <BlurImage img={offer.img} title={offer.title} className="relative w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 drop-shadow-xl" />
                {(!offer.img || offer.img === 'NULL') && <span className="text-slate-500 text-xs">No Image</span>}
            </div>
            <div className="flex-1 px-6 py-5 flex flex-col justify-between min-w-0">
                <div>
                    <h2 className="text-sm font-bold text-white line-clamp-1 group-hover:text-blue-400 transition-colors">{offer.title || 'Unknown Title'}</h2>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {offer.location || 'Unknown Location'}
                    </p>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs mt-2">
                    {offer.year && <span className="text-slate-400">Year: <span className="font-semibold text-slate-200">{offer.year}</span></span>}
                    {offer.mileage && <span className="text-slate-400">Mileage: <span className="font-semibold text-slate-200">{offer.mileage} km</span></span>}
                    {offer.fuel && <span className="text-slate-400">Fuel: <span className="font-semibold text-slate-200">{offer.fuel}</span></span>}
                    {offer.capacity && <span className="text-slate-400">Engine: <span className="font-semibold text-slate-200">{offer.capacity}</span></span>}
                </div>
            </div>
            <div className="shrink-0 flex items-center pr-14 pl-4 border-l border-slate-700/50">
                <div className="text-right">
                    <div className="text-lg font-black text-emerald-400 whitespace-nowrap">
                        {offer.price ? formatPrice(offer.price) : 'Ask'}
                        {offer.price && <span className="text-xs text-emerald-500/80 ml-1">PLN</span>}
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
        <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-right-10 duration-300">
            <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl border-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl ${
                type === 'success' 
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
    const inputRef = useRef(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (name.trim()) {
            onSave(name.trim());
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Bookmark className="w-5 h-5 text-emerald-400" /> {t('saveSearch')}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-2">{t('searchName') || 'Search Name'}</label>
                        <input
                            ref={inputRef}
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Audi A4 Diesel"
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-all shadow-inner"
                        />
                    </div>
                    
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors border border-slate-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim()}
                            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/20"
                        >
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

function App() {
    const [lang, setLang] = useState('pl');
    const t = (key) => translations[lang][key] || key;

    const [selectedOffer, setSelectedOffer] = useState(null);
    const [showSaveModal, setShowSaveModal] = useState(false);
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
    const [fuelFilter, setFuelFilter] = useState("");
    const [onlyNew, setOnlyNew] = useState(false);
    const [onlyFavorites, setOnlyFavorites] = useState(false);
    const [onlyWithPrice, setOnlyWithPrice] = useState(false);
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

    const debouncedSearch = useDebounce(search, 500);
    const debouncedYearMin = useDebounce(yearMin, 500);
    const debouncedYearMax = useDebounce(yearMax, 500);
    const debouncedPriceMin = useDebounce(priceMin, 500);
    const debouncedPriceMax = useDebounce(priceMax, 500);
    const debouncedMileageMin = useDebounce(mileageMin, 500);
    const debouncedMileageMax = useDebounce(mileageMax, 500);

    const fetchOffers = async (append = false) => {
        setLoading(true);
        try {
            let url = `${API_BASE_URL}/api/offers/?page=${page}&ordering=${ordering}&page_size=${pageSize}`;
            if (debouncedSearch) url += `&search=${encodeURIComponent(debouncedSearch)}`;
            if (brandFilter) url += `&brand=${encodeURIComponent(brandFilter)}`;
            if (fuelFilter) url += `&fuel=${encodeURIComponent(fuelFilter)}`;
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
            if (publishedAfter) url += `&published_after=${encodeURIComponent(publishedAfter)}`;
            if (publishedBefore) url += `&published_before=${encodeURIComponent(publishedBefore)}`;

            const response = await fetch(url);
            const result = await response.json();
            
            if (append) {
                setAllResults(prev => {
                    const newIds = new Set(result.results.map(r => r.id));
                    return [...prev.filter(p => !newIds.has(p.id)), ...result.results];
                });
                setData(result);
            } else {
                setAllResults(result.results);
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
        const savedDefault = localStorage.getItem('default_filters');
        if (savedDefault) {
            applySavedSearch(savedDefault);
        }
        fetchSavedSearches();
        fetchScraperStatus();
        // Poll for updates every 30 seconds
        const intervalId = setInterval(() => {
            fetchSavedSearches();
            fetchScraperStatus();
        }, 30000);
        return () => clearInterval(intervalId);
    }, []);

    const handleForceScrape = async () => {
        if (!scraperStatus) return;
        try {
            await fetch(`${API_BASE_URL}/api/scraper_status/${scraperStatus.id}/trigger/`, {
                method: 'POST'
            });
            fetchScraperStatus();
            showToast(t('scrapeTriggered') || 'Scraper started!');
        } catch (err) {
            console.error("Failed to trigger scrape:", err);
            showToast('Failed to start scraper', 'error');
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
    }, [page, ordering, debouncedSearch, brandFilter, fuelFilter, debouncedYearMin, debouncedYearMax, debouncedPriceMin, debouncedPriceMax, debouncedMileageMin, debouncedMileageMax, onlyNew, onlyFavorites, onlyWithPrice, excludeBullshit, publishedAfter, publishedBefore, pageSize, isInfinite]);

    useEffect(() => {
        setPage(1);
        setAllResults([]);
    }, [ordering, debouncedSearch, brandFilter, fuelFilter, debouncedYearMin, debouncedYearMax, debouncedPriceMin, debouncedPriceMax, debouncedMileageMin, debouncedMileageMax, onlyNew, onlyFavorites, onlyWithPrice, excludeBullshit, publishedAfter, publishedBefore, pageSize, isInfinite]);

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
        setFuelFilter('');
        setYearMin('');
        setYearMax('');
        setPriceMin('');
        setPriceMax('');
        setMileageMin('');
        setMileageMax('');
        setOnlyNew(false);
        setOnlyFavorites(false);
        setOnlyWithPrice(false);
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

    const saveCurrentSearch = async (name) => {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (ordering) params.append('ordering', ordering);
        if (brandFilter) params.append('brand', brandFilter);
        if (fuelFilter) params.append('fuel', fuelFilter);
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
        if (publishedAfter) params.append('published_after', publishedAfter);
        if (publishedBefore) params.append('published_before', publishedBefore);

        try {
            await fetch(`${API_BASE_URL}/api/saved_searches/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, query_string: params.toString() })
            });
            fetchSavedSearches();
            setShowSaveModal(false);
            showToast(t('searchSaved') || 'Search saved successfully!');
        } catch (err) {
            console.error("Failed to save search:", err);
            showToast('Failed to save search', 'error');
        }
    };

    const saveAsDefault = () => {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (ordering) params.append('ordering', ordering);
        if (brandFilter) params.append('brand', brandFilter);
        if (fuelFilter) params.append('fuel', fuelFilter);
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
        if (publishedAfter) params.append('published_after', publishedAfter);
        if (publishedBefore) params.append('published_before', publishedBefore);

        localStorage.setItem('default_filters', params.toString());
        showToast(t('defaultFiltersSaved'), 'info');
    };

    const applySavedSearch = (qs) => {
        const params = new URLSearchParams(qs);
        setSearch(params.get('search') || "");
        setBrandFilter(params.get('brand') || "");
        setFuelFilter(params.get('fuel') || "");
        setYearMin(params.get('year_min') || "");
        setYearMax(params.get('year_max') || "");
        setPriceMin(params.get('price_min') || "");
        setPriceMax(params.get('price_max') || "");
        setMileageMin(params.get('mileage_min') || "");
        setMileageMax(params.get('mileage_max') || "");
        setOnlyNew(params.get('is_seen') === 'false');
        setOnlyFavorites(params.get('is_favorite') === 'true');
        setOnlyWithPrice(params.get('has_price') === 'true');
        setExcludeBullshit(params.get('price_min') === '500');
        setPublishedAfter(params.get('published_after') || "");
        setPublishedBefore(params.get('published_before') || "");
        setPage(1);
    };

    const deleteSavedSearch = async (id, e) => {
        e.stopPropagation(); // prevent applying the search when clicking delete
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
        setPage(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <>
            {selectedOffer && (
                <OfferDetails offer={selectedOffer} onBack={handleBack} t={t} />
            )}
            <div className="min-h-screen p-6 custom-scrollbar">
                <header className="mb-8 flex justify-between items-end border-b border-slate-700 pb-4">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-4">
                            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
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
                        <p className="text-slate-400 text-sm flex items-center">
                            {t('subtitle')}
                            {scraperStatus && (
                                <span className="flex items-center gap-1.5 ml-3 pl-3 border-l border-slate-700">
                                    <span className={`w-1.5 h-1.5 rounded-full ${scraperStatus.is_running ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-slate-500'}`}></span>
                                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                                        {scraperStatus.is_running ? (
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
                                            </span>
                                        )}
                                    </span>
                                </span>
                            )}
                        </p>
                    </div>
                    <div className="text-slate-300 text-sm flex items-center gap-4">
                        <button
                            onClick={fetchSavedSearches}
                            className="bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded text-xs text-slate-300 transition-colors border border-slate-700"
                        >
                            {t('refreshCounts')}
                        </button>
                    </div>
                </header>

                <div className="flex flex-col gap-6">
                    <div className="flex flex-col xl:flex-row gap-6 items-start">
                        {/* Filters Panel */}
                        <div className="glass-panel p-5 flex-1 w-full">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <Filter className="w-5 h-5" /> {t('filters')}
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
                                <div className="flex flex-wrap gap-x-6 gap-y-3 sm:col-span-full pb-2 border-b border-slate-700/50 mb-2">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${onlyNew ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-800 border-slate-600 group-hover:border-emerald-500'}`}>
                                            {onlyNew && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{t('onlyNew')}</span>
                                        <input type="checkbox" className="hidden" checked={onlyNew} onChange={(e) => setOnlyNew(e.target.checked)} />
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${onlyFavorites ? 'bg-rose-500 border-rose-500' : 'bg-slate-800 border-slate-600 group-hover:border-rose-500'}`}>
                                            {onlyFavorites && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{t('favorites')}</span>
                                        <input type="checkbox" className="hidden" checked={onlyFavorites} onChange={(e) => setOnlyFavorites(e.target.checked)} />
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${onlyWithPrice ? 'bg-amber-500 border-amber-500' : 'bg-slate-800 border-slate-600 group-hover:border-amber-500'}`}>
                                            {onlyWithPrice && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{t('hasPrice')}</span>
                                        <input type="checkbox" className="hidden" checked={onlyWithPrice} onChange={(e) => setOnlyWithPrice(e.target.checked)} />
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${excludeBullshit ? 'bg-orange-500 border-orange-500' : 'bg-slate-800 border-slate-600 group-hover:border-orange-500'}`}>
                                            {excludeBullshit && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{t('hideBullshit')}</span>
                                        <input type="checkbox" className="hidden" checked={excludeBullshit} onChange={(e) => setExcludeBullshit(e.target.checked)} />
                                    </label>
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

                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">{t('fuelType')}</label>
                                    <select
                                        value={fuelFilter}
                                        onChange={(e) => setFuelFilter(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                                    >
                                        <option value="">{t('allTypes')}</option>
                                        <option value="Benzyna">Benzyna</option>
                                        <option value="Diesel">Diesel</option>
                                        <option value="Hybryda">Hybryda</option>
                                        <option value="Elektryczny">Elektryczny</option>
                                        <option value="LPG">LPG</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">{t('price')}</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            placeholder={lang === 'pl' ? 'Od' : 'From'}
                                            value={priceMin}
                                            onChange={(e) => setPriceMin(e.target.value)}
                                            className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                                        />
                                        <input
                                            type="number"
                                            placeholder={lang === 'pl' ? 'Do' : 'To'}
                                            value={priceMax}
                                            onChange={(e) => setPriceMax(e.target.value)}
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
                                            onChange={(e) => setMileageMin(e.target.value)}
                                            className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                                        />
                                        <input
                                            type="number"
                                            placeholder={lang === 'pl' ? 'Do' : 'To'}
                                            value={mileageMax}
                                            onChange={(e) => setMileageMax(e.target.value)}
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
                                            onChange={(e) => setYearMin(e.target.value)}
                                            className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                                        />
                                        <input
                                            type="number"
                                            placeholder={lang === 'pl' ? 'Do' : 'To'}
                                            value={yearMax}
                                            onChange={(e) => setYearMax(e.target.value)}
                                            className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Published Date Range + Quick Presets — full width */}
                                <div className="sm:col-span-full pt-2 border-t border-slate-700/50 mt-2">
                                    <div className="flex flex-col sm:flex-row gap-3 items-end">
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
                                                        className={`px-2.5 py-1.5 rounded-md text-xs font-semibold border transition-all ${
                                                            isActive
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
                        </div>

                        {/* Saved Searches Panel */}
                        <div className="glass-panel p-5 border-l-4 border-l-emerald-500 w-full xl:w-96 shrink-0">
                            <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
                                <Bookmark className="w-5 h-5 text-emerald-400" /> {t('savedSearches')}
                            </h3>

                            <div className="space-y-2">
                                {savedSearches.length === 0 ? (
                                    <p className="text-xs text-slate-500 italic">{t('noSavedSearches')}</p>
                                ) : (
                                    savedSearches.map(ss => (
                                        <div
                                            key={ss.id}
                                            onClick={() => applySavedSearch(ss.query_string)}
                                            className="flex items-center justify-between p-3 rounded bg-slate-800/50 hover:bg-slate-700 cursor-pointer transition-colors group border border-transparent hover:border-slate-600"
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-slate-200 group-hover:text-blue-400 transition-colors">
                                                    {ss.name}
                                                </span>
                                                <span className="text-[10px] text-slate-500 truncate max-w-[150px]">
                                                    {ss.query_string ? ss.query_string.replace(/&/g, ', ').replace(/_/g, ' ') : t('allOffers')}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {ss.new_count > 0 && (
                                                    <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                                                        {ss.new_count}
                                                    </span>
                                                )}
                                                <button
                                                    onClick={(e) => deleteSavedSearch(ss.id, e)}
                                                    className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                                    title="Delete search"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
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

                        {loading && allResults.length === 0 ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {allResults.length === 0 ? (
                                    <div className="glass-panel p-10 text-center text-slate-400">
                                        {t('noOffersFound')}
                                    </div>
                                ) : (
                                    viewMode === 'grid' ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {allResults.map(offer => (
                                                <OfferCard key={offer.id} offer={offer} onSelect={handleSelectOffer} t={t} showToast={showToast} viewMode="grid" />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-3">
                                            {allResults.map(offer => (
                                                <OfferCard key={offer.id} offer={offer} onSelect={handleSelectOffer} t={t} showToast={showToast} viewMode="list" />
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
            {toasts.map(toast => (
                <Toast 
                    key={toast.id} 
                    message={toast.message} 
                    type={toast.type} 
                    onClose={() => removeToast(toast.id)} 
                />
            ))}
            
            {showBackToTop && (
                <button
                    onClick={scrollToTop}
                    className="fixed bottom-8 right-8 p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300"
                    title="Back to top"
                >
                    <ArrowUp className="w-6 h-6" />
                </button>
            )}
        </>
    );
}

export default App;
