import { useState, useEffect, useRef } from 'react';
import { Filter, MapPin, Bookmark, Save, Trash2, Heart, Check, LayoutGrid, LayoutList } from 'lucide-react';
import OfferDetails from './OfferDetails';
import './index.css';

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

const OfferCard = ({ offer, onSelect, viewMode = 'grid' }) => {
    const [isSeen, setIsSeen] = useState(offer.is_seen);
    const [isFavorite, setIsFavorite] = useState(offer.is_favorite);
    const cardRef = useRef(null);

    useEffect(() => {
        if (isSeen) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    fetch(`http://localhost:8000/api/offers/${offer.id}/mark_seen/`, { method: 'POST' })
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
        setIsFavorite(!isFavorite);
        fetch(`http://localhost:8000/api/offers/${offer.id}/toggle_favorite/`, { method: 'POST' })
            .catch(err => {
                console.error("Failed to toggle favorite", err);
                setIsFavorite(isFavorite);
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
                title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
                <Heart className={`w-5 h-5 transition-colors ${isFavorite ? 'fill-rose-500 text-rose-500' : 'text-slate-400 group-hover/btn:text-rose-400'}`} />
            </button>
            {!isSeen && (
                <div className="absolute top-0 left-0 z-10 -ml-2 -mt-2" title="New Offer">
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
                        <span className="text-slate-500">No Image</span>
                    )}
                </div>

                <div className="p-5">
                    <div className="flex justify-between items-start mb-4 gap-3">
                        <div className="flex-1">
                            <h2 className="text-lg font-bold text-white mb-1 line-clamp-2 group-hover:text-blue-400 transition-colors leading-tight">{offer.title || 'Unknown Title'}</h2>
                            <p className="text-sm text-slate-400 flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {offer.location || 'Unknown Location'}
                            </p>
                        </div>
                        <div className="text-right shrink-0">
                            <div className="text-2xl font-black text-emerald-400 whitespace-nowrap">
                                {offer.price ? formatPrice(offer.price) : 'Ask Price'}
                                {offer.price && <span className="text-base text-emerald-500/80 ml-1">PLN</span>}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                        <div className="flex flex-col">
                            <span className="text-slate-500">Year</span>
                            <span className="font-semibold text-slate-200">{offer.year || '-'}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-slate-500">Mileage</span>
                            <span className="font-semibold text-slate-200">{offer.mileage ? `${offer.mileage} km` : '-'}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-slate-500">Engine</span>
                            <span className="font-semibold text-slate-200">{offer.capacity || '-'}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-slate-500">Fuel</span>
                            <span className="font-semibold text-slate-200">{offer.fuel || '-'}</span>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-700/50 flex justify-between text-xs text-slate-500">
                        <span>Scraped: {new Date(offer.created_at).toLocaleDateString()}</span>
                        <span>ID: {offer.offer_id}</span>
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

const ListCard = ({ offer, onSelect, isSeen, isFavorite, handleToggleFavorite, cardRef }) => (
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

function App() {
    const [selectedOffer, setSelectedOffer] = useState(null);
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

    // Range Filters
    const [yearMin, setYearMin] = useState("");
    const [yearMax, setYearMax] = useState("");
    const [priceMin, setPriceMin] = useState("");
    const [priceMax, setPriceMax] = useState("");
    const [mileageMin, setMileageMin] = useState("");
    const [mileageMax, setMileageMax] = useState("");

    const [savedSearches, setSavedSearches] = useState([]);

    const debouncedSearch = useDebounce(search, 500);
    const debouncedYearMin = useDebounce(yearMin, 500);
    const debouncedYearMax = useDebounce(yearMax, 500);
    const debouncedPriceMin = useDebounce(priceMin, 500);
    const debouncedPriceMax = useDebounce(priceMax, 500);
    const debouncedMileageMin = useDebounce(mileageMin, 500);
    const debouncedMileageMax = useDebounce(mileageMax, 500);

    const fetchOffers = async () => {
        setLoading(true);
        try {
            let url = `http://localhost:8000/api/offers/?page=${page}&ordering=${ordering}`;
            if (debouncedSearch) url += `&search=${encodeURIComponent(debouncedSearch)}`;
            if (brandFilter) url += `&brand=${encodeURIComponent(brandFilter)}`;
            if (fuelFilter) url += `&fuel=${encodeURIComponent(fuelFilter)}`;
            if (debouncedYearMin) url += `&year_min=${encodeURIComponent(debouncedYearMin)}`;
            if (debouncedYearMax) url += `&year_max=${encodeURIComponent(debouncedYearMax)}`;
            if (debouncedPriceMin) url += `&price_min=${encodeURIComponent(debouncedPriceMin)}`;
            if (debouncedPriceMax) url += `&price_max=${encodeURIComponent(debouncedPriceMax)}`;
            if (debouncedMileageMin) url += `&mileage_min=${encodeURIComponent(debouncedMileageMin)}`;
            if (debouncedMileageMax) url += `&mileage_max=${encodeURIComponent(debouncedMileageMax)}`;
            if (onlyNew) url += `&is_seen=false`;
            if (onlyFavorites) url += `&is_favorite=true`;
            if (onlyWithPrice) url += `&has_price=true`;

            const response = await fetch(url);
            const result = await response.json();
            setData(result);
        } catch (err) {
            console.error("Failed to fetch offers:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchSavedSearches = async () => {
        try {
            const response = await fetch('http://localhost:8000/api/saved_searches/');
            const result = await response.json();
            setSavedSearches(result.results || result);
        } catch (err) {
            console.error("Failed to fetch saved searches:", err);
        }
    };

    useEffect(() => {
        fetchSavedSearches();
        // Set up polling for new counts on saved searches every 30 seconds
        const intervalId = setInterval(fetchSavedSearches, 30000);
        return () => clearInterval(intervalId);
    }, []);

    useEffect(() => {
        fetchOffers();
    }, [page, ordering, debouncedSearch, brandFilter, fuelFilter, debouncedYearMin, debouncedYearMax, debouncedPriceMin, debouncedPriceMax, debouncedMileageMin, debouncedMileageMax, onlyNew, onlyFavorites, onlyWithPrice]);

    useEffect(() => {
        setPage(1);
    }, [ordering, debouncedSearch, brandFilter, fuelFilter, debouncedYearMin, debouncedYearMax, debouncedPriceMin, debouncedPriceMax, debouncedMileageMin, debouncedMileageMax, onlyNew, onlyFavorites, onlyWithPrice]);

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
    };

    const saveCurrentSearch = async () => {
        const name = prompt("Enter a name for this search (e.g. 'Cheap Audis'):");
        if (!name) return;

        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (brandFilter) params.append('brand', brandFilter);
        if (fuelFilter) params.append('fuel', fuelFilter);
        if (yearMin) params.append('year_min', yearMin);
        if (yearMax) params.append('year_max', yearMax);
        if (priceMin) params.append('price_min', priceMin);
        if (priceMax) params.append('price_max', priceMax);
        if (mileageMin) params.append('mileage_min', mileageMin);
        if (mileageMax) params.append('mileage_max', mileageMax);
        if (onlyNew) params.append('is_seen', 'false');
        if (onlyFavorites) params.append('is_favorite', 'true');
        if (onlyWithPrice) params.append('has_price', 'true');

        try {
            await fetch('http://localhost:8000/api/saved_searches/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name,
                    query_string: params.toString()
                })
            });
            fetchSavedSearches();
        } catch (err) {
            console.error("Failed to save search", err);
        }
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
        setPage(1);
    };

    const deleteSavedSearch = async (id, e) => {
        e.stopPropagation(); // prevent applying the search when clicking delete
        if (!confirm("Delete this saved search?")) return;
        try {
            await fetch(`http://localhost:8000/api/saved_searches/${id}/`, { method: 'DELETE' });
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
                <OfferDetails offer={selectedOffer} onBack={handleBack} />
            )}
            <div className="min-h-screen p-6 custom-scrollbar">
                <header className="mb-8 flex justify-between items-end border-b border-slate-700 pb-4">
                    <div>
                        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                            Brzozowiak Intelligence
                        </h1>
                        <p className="text-slate-400 mt-2 text-sm">Real-time automotive market scraper</p>
                    </div>
                    <div className="text-slate-300 text-sm flex items-center gap-3">
                        <span>Showing <span className="font-bold text-white">{data.count || 0}</span> offers</span>
                        {/* View Mode Switcher */}
                        <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 p-0.5">
                            <button
                                onClick={() => setViewMode('grid')}
                                title="Grid view"
                                className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                title="List view"
                                className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                <LayoutList className="w-4 h-4" />
                            </button>
                        </div>
                        <button
                            onClick={fetchSavedSearches}
                            className="bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded text-xs text-slate-300 transition-colors border border-slate-700"
                        >
                            Refresh Counts
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-1 space-y-6">
                        {/* Filters Panel */}
                        <div className="glass-panel p-5">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <Filter className="w-5 h-5" /> Filters
                                </h3>
                            </div>

                            <div className="space-y-4">
                                <div className="flex flex-wrap gap-x-4 gap-y-2">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${onlyNew ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-800 border-slate-600 group-hover:border-emerald-500'}`}>
                                            {onlyNew && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Only New</span>
                                        <input type="checkbox" className="hidden" checked={onlyNew} onChange={(e) => setOnlyNew(e.target.checked)} />
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${onlyFavorites ? 'bg-rose-500 border-rose-500' : 'bg-slate-800 border-slate-600 group-hover:border-rose-500'}`}>
                                            {onlyFavorites && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Favorites</span>
                                        <input type="checkbox" className="hidden" checked={onlyFavorites} onChange={(e) => setOnlyFavorites(e.target.checked)} />
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${onlyWithPrice ? 'bg-amber-500 border-amber-500' : 'bg-slate-800 border-slate-600 group-hover:border-amber-500'}`}>
                                            {onlyWithPrice && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Has Price</span>
                                        <input type="checkbox" className="hidden" checked={onlyWithPrice} onChange={(e) => setOnlyWithPrice(e.target.checked)} />
                                    </label>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Search</label>
                                    <input
                                        type="text"
                                        placeholder="Keywords..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Sort By</label>
                                    <select
                                        value={ordering}
                                        onChange={(e) => setOrdering(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                                    >
                                        <option value="-created_at">Newest Added</option>
                                        <option value="created_at">Oldest Added</option>
                                        <option value="-year_num">Newest Production Year</option>
                                        <option value="year_num">Oldest Production Year</option>
                                        <option value="price_num">Price: Low to High</option>
                                        <option value="-price_num">Price: High to Low</option>
                                        <option value="mileage_num">Mileage: Low to High</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Brand</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Audi, BMW"
                                        value={brandFilter}
                                        onChange={(e) => setBrandFilter(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Production Year</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            placeholder="From"
                                            value={yearMin}
                                            onChange={(e) => setYearMin(e.target.value)}
                                            className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                                        />
                                        <input
                                            type="number"
                                            placeholder="To"
                                            value={yearMax}
                                            onChange={(e) => setYearMax(e.target.value)}
                                            className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Price (PLN)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            placeholder="From"
                                            value={priceMin}
                                            onChange={(e) => setPriceMin(e.target.value)}
                                            className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                                        />
                                        <input
                                            type="number"
                                            placeholder="To"
                                            value={priceMax}
                                            onChange={(e) => setPriceMax(e.target.value)}
                                            className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Mileage (km)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            placeholder="From"
                                            value={mileageMin}
                                            onChange={(e) => setMileageMin(e.target.value)}
                                            className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                                        />
                                        <input
                                            type="number"
                                            placeholder="To"
                                            value={mileageMax}
                                            onChange={(e) => setMileageMax(e.target.value)}
                                            className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Fuel Type</label>
                                    <select
                                        value={fuelFilter}
                                        onChange={(e) => setFuelFilter(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                                    >
                                        <option value="">All Types</option>
                                        <option value="Benzyna">Benzyna</option>
                                        <option value="Diesel">Diesel</option>
                                        <option value="Hybryda">Hybryda</option>
                                        <option value="Elektryczny">Elektryczny</option>
                                        <option value="LPG">LPG</option>
                                    </select>
                                </div>

                                <button
                                    onClick={clearFilters}
                                    className="w-full mt-4 py-2 bg-slate-700 hover:bg-slate-600 text-sm font-medium rounded transition-colors cursor-pointer"
                                >
                                    Clear Filters
                                </button>
                                <button
                                    onClick={saveCurrentSearch}
                                    className="w-full mt-2 py-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 text-sm font-bold rounded transition-colors cursor-pointer flex justify-center items-center gap-2"
                                >
                                    <Save className="w-4 h-4" /> Save
                                </button>
                            </div>
                        </div>

                        {/* Saved Searches Panel */}
                        <div className="glass-panel p-5 border-l-4 border-l-emerald-500">
                            <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
                                <Bookmark className="w-5 h-5 text-emerald-400" /> Saved Searches
                            </h3>

                            <div className="space-y-2">
                                {savedSearches.length === 0 ? (
                                    <p className="text-xs text-slate-500 italic">No saved searches yet. Configure your filters and click the save icon above!</p>
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
                                                    {ss.query_string ? ss.query_string.replace(/&/g, ', ').replace(/_/g, ' ') : 'All offers'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {ss.new_count > 0 && (
                                                    <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                                                        {ss.new_count} NEW
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

                    <div className="lg:col-span-3">
                        {loading && (!data.results || data.results.length === 0) ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {!data.results || data.results.length === 0 ? (
                                    <div className="glass-panel p-10 text-center text-slate-400">
                                        No offers found matching your criteria.
                                    </div>
                                ) : (
                                    viewMode === 'grid' ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {data.results.map(offer => (
                                                <OfferCard key={offer.id} offer={offer} onSelect={handleSelectOffer} viewMode="grid" />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-3">
                                            {data.results.map(offer => (
                                                <OfferCard key={offer.id} offer={offer} onSelect={handleSelectOffer} viewMode="list" />
                                            ))}
                                        </div>
                                    )
                                )}

                                <div className="flex justify-between items-center py-4">
                                    <button
                                        disabled={!data.previous}
                                        onClick={() => handlePageChange(page - 1)}
                                        className="px-4 py-2 bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 rounded text-sm font-medium transition-colors cursor-pointer"
                                    >
                                        Previous Page
                                    </button>
                                    <span className="text-sm text-slate-400">Page {page}</span>
                                    <button
                                        disabled={!data.next}
                                        onClick={() => handlePageChange(page + 1)}
                                        className="px-4 py-2 bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 rounded text-sm font-medium transition-colors cursor-pointer"
                                    >
                                        Next Page
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

export default App;
