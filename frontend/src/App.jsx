import { useState, useEffect, useRef, useCallback } from 'react';
import { Filter, MapPin, Bookmark, Save, Trash2, Heart, Check, LayoutGrid, LayoutList, X, Bell, Info, ArrowUp, Send, Calendar, Archive, ShieldCheck } from 'lucide-react';
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

const OfferCard = ({ offer, onSelect, t, showToast, onToggleFavorite, viewMode = 'grid', onOfferVisible }) => {
    const [isSeen, setIsSeen] = useState(offer.is_seen);
    const cardRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    if (!isSeen) {
                        fetch(`${API_BASE_URL}/api/offers/${offer.id}/mark_seen/`, { method: 'POST' })
                            .catch(err => console.error("Failed to mark seen", err));
                    }
                    if (onOfferVisible) {
                        onOfferVisible(offer.id);
                    }
                    observer.disconnect();
                }
            },
            { threshold: 0.2 }
        );

        if (cardRef.current) observer.observe(cardRef.current);
        return () => observer.disconnect();
    }, [isSeen, offer.id, onOfferVisible]);

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
                className="absolute top-3 right-3 z-20 p-2.5 bg-black/40 hover:bg-black/60 backdrop-blur-xl rounded-full transition-all duration-200 border border-white/10 hover:border-white/20 shadow-lg group/btn hover:scale-105 active:scale-95"
                title={offer.is_favorite ? t('removeFavorite') : t('addFavorite')}
            >
                <Heart className={`w-4 h-4 transition-colors ${offer.is_favorite ? 'fill-rose-500 text-rose-500' : 'text-white/60 group-hover/btn:text-rose-400'}`} />
            </button>
            {offer.is_archived ? (
                <div className="absolute top-3 left-3 z-20" title={t('showArchived')}>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/25 backdrop-blur-md border border-rose-500/40 text-[10px] font-semibold text-rose-300 tracking-wider shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                        {t('sold') || 'SPRZEDANE'}
                    </span>
                </div>
            ) : !isSeen ? (
                <div className="absolute top-3 left-3 z-20" title={t('newOffer')}>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/15 text-[10px] font-semibold text-white tracking-wider shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                        {t('newOffer') || 'NEW'}
                    </span>
                </div>
            ) : null}
            <div className={`glass-card h-full overflow-hidden flex flex-col transition-all duration-300 ${offer.is_archived ? 'opacity-60 hover:opacity-100' : ''}`}>
                <div className="h-60 sm:h-64 relative bg-black/30 flex items-center justify-center overflow-hidden border-b border-white/[0.06]">
                    {offer.img && offer.img !== 'NULL' ? (
                        <>
                            {/* Blurred background fill */}
                            <img src={offer.img} aria-hidden="true" className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-30 pointer-events-none" />
                            {/* Main image */}
                            <img src={offer.img} alt={offer.title} className="relative w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 drop-shadow-xl" />
                        </>
                    ) : (
                        <span className="text-zinc-500 text-xs font-medium">{t('noImage')}</span>
                    )}
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                        <h2 className="text-base font-semibold text-white/95 mb-2 line-clamp-2 group-hover:text-white transition-colors leading-snug tracking-tight">{offer.title || t('unknownTitle')}</h2>
                        <div className="flex flex-col gap-0.5 mb-4">
                            <div className="text-xl sm:text-2xl font-bold text-white tracking-tight whitespace-nowrap">
                                {offer.price ? formatPrice(offer.price) : t('askPrice')}
                                {offer.price && <span className="text-xs font-normal text-zinc-400 ml-1.5">PLN</span>}
                            </div>
                            <p className="text-xs text-zinc-400 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-zinc-500" /> {offer.location || t('unknownLocation')}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs bg-white/[0.02] p-3 rounded-xl border border-white/[0.04]">
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-medium text-zinc-500 tracking-wider">{t('year')}</span>
                                <span className="font-medium text-zinc-200">{offer.year || '-'}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-medium text-zinc-500 tracking-wider">{t('mileage_label')}</span>
                                <span className="font-medium text-zinc-200">{offer.mileage ? `${offer.mileage}` : '-'}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-medium text-zinc-500 tracking-wider">{t('engine')}</span>
                                <span className="font-medium text-zinc-200">{offer.capacity || '-'}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-medium text-zinc-500 tracking-wider">{t('fuel')}</span>
                                <span className="font-medium text-zinc-200">{offer.fuel || '-'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/[0.06] flex flex-col gap-1 text-[10px] text-zinc-500">
                        <div className="flex justify-between">
                            <span>{t('published')}: {offer.date}</span>
                            <span>{t('id')}: {offer.offer_id}</span>
                        </div>
                        <div className="flex justify-between border-t border-white/[0.03] pt-1">
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
        <img src={img} aria-hidden="true" className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-30 pointer-events-none" />
        <img src={img} alt={title} className={className} />
    </>
) : null;

const ListCard = ({ offer, onSelect, t, showToast, isSeen, isFavorite, handleToggleFavorite, cardRef }) => (
    <div ref={cardRef} onClick={() => onSelect(offer)} className="group relative cursor-pointer">
        <button
            onClick={handleToggleFavorite}
            className="absolute top-3 right-3 z-20 p-2.5 bg-black/40 hover:bg-black/60 backdrop-blur-xl rounded-full transition-all duration-200 border border-white/10 hover:border-white/20 shadow-md group/btn hover:scale-105 active:scale-95"
        >
            <Heart className={`w-3.5 h-3.5 transition-colors ${isFavorite ? 'fill-rose-500 text-rose-500' : 'text-white/60 group-hover/btn:text-rose-400'}`} />
        </button>
        {offer.is_archived ? (
            <div className="absolute top-2.5 left-2.5 z-20" title={t('showArchived')}>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/25 backdrop-blur-md border border-rose-500/40 text-[9px] font-semibold text-rose-300 tracking-wider shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                    {t('sold') || 'SPRZEDANE'}
                </span>
            </div>
        ) : !isSeen ? (
            <div className="absolute top-2.5 left-2.5 z-20">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-md border border-white/15 text-[9px] font-semibold text-white tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                    {t('newOffer') || 'NEW'}
                </span>
            </div>
        ) : null}
        <div className={`glass-card overflow-hidden flex max-h-36 sm:max-h-48 transition-all duration-300 ${offer.is_archived ? 'opacity-60 hover:opacity-100' : ''}`}>
            <div className="w-32 sm:w-56 shrink-0 self-stretch relative bg-black/30 flex items-center justify-center overflow-hidden border-r border-white/[0.06]">
                <BlurImage img={offer.img} title={offer.title} className="relative w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 drop-shadow-xl z-10" />
                {(!offer.img || offer.img === 'NULL') && <span className="text-zinc-500 text-[10px] sm:text-xs text-center px-2">{t('noImage')}</span>}
            </div>
            <div className="flex-1 px-4 sm:px-6 py-3 sm:py-5 flex flex-col justify-between min-w-0">
                <div>
                    <h2 className="text-sm sm:text-base font-semibold text-white/95 line-clamp-1 group-hover:text-white transition-colors tracking-tight">{offer.title || 'Unknown Title'}</h2>
                    {/* Price on mobile only */}
                    <div className="sm:hidden text-white font-bold text-xs mt-0.5 tracking-tight">
                        {offer.price ? formatPrice(offer.price) : t('askPrice')}
                        {offer.price && <span className="text-[10px] font-normal text-zinc-400 ml-1">PLN</span>}
                    </div>
                    <p className="text-[10px] sm:text-xs text-zinc-400 flex items-center gap-1 mt-0.5 min-w-0">
                        <MapPin className="w-3 h-3 shrink-0 text-zinc-500" /> <span className="truncate">{offer.location || 'Unknown Location'}</span>
                    </p>
                </div>
                <div className="flex flex-wrap gap-x-3 sm:gap-x-5 gap-y-0.5 text-[10px] sm:text-xs mt-1 sm:mt-2">
                    {offer.year && <span className="text-zinc-400"><span className="hidden sm:inline">{t('year')}: </span><span className="font-medium text-zinc-200">{offer.year}</span></span>}
                    {offer.mileage && <span className="text-zinc-400"><span className="hidden sm:inline">{t('mileage_label')}: </span><span className="font-medium text-zinc-200">{offer.mileage}</span></span>}
                    {offer.fuel && <span className="text-zinc-400"><span className="hidden sm:inline">{t('fuel')}: </span><span className="font-medium text-zinc-200">{offer.fuel}</span></span>}
                </div>
                <div className="mt-auto pt-2 flex flex-col gap-0.5 text-[10px] text-zinc-500 border-t border-white/[0.04]">
                    <span>{t('published')}: {offer.date}</span>
                    <span>{t('scraped')}: {offer.created_at ? offer.created_at.slice(0, 10).replace(/-/g, '.') + ' ' + offer.created_at.slice(11, 16) : '-'}</span>
                </div>
            </div>
            <div className="hidden sm:flex shrink-0 items-center pr-10 sm:pr-14 pl-3 sm:pl-5 border-l border-white/[0.06]">
                <div className="text-right">
                    <div className="text-lg sm:text-xl font-bold text-white tracking-tight whitespace-nowrap">
                        {offer.price ? formatPrice(offer.price) : t('askPrice')}
                        {offer.price && <span className="text-xs font-normal text-zinc-400 ml-1">PLN</span>}
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
        <div className="fixed bottom-6 right-6 z-[300] animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="flex items-center gap-3 px-5 py-3 rounded-full border border-white/15 bg-zinc-900/85 backdrop-blur-2xl shadow-2xl shadow-black/80 text-white">
                <div className={`w-2 h-2 rounded-full ${type === 'success' ? 'bg-[#30d158]' : 'bg-[#0071e3]'}`} />
                <span className="text-xs font-medium tracking-tight text-white/90">{message}</span>
                <button onClick={onClose} className="ml-2 p-1 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white cursor-pointer">
                    <X className="w-3.5 h-3.5" />
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-200" onClick={onClose}>
            <div 
                onClick={(e) => e.stopPropagation()} 
                className="glass-panel bg-zinc-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200"
            >
                <h3 className="text-xl font-semibold text-white mb-4 tracking-tight">{t('saveSearch')}</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wide">{t('searchName')}</label>
                        <input
                            ref={inputRef}
                            autoFocus
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. My Dream Audi"
                            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 focus:bg-white/[0.07] focus:ring-1 focus:ring-white/20 transition-all"
                            onKeyDown={(e) => e.key === 'Enter' && name.trim() && onSave(name, telegramNotifications)}
                        />
                    </div>

                    <div className="flex items-center gap-3 p-3.5 bg-white/[0.03] rounded-2xl border border-white/[0.06]">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={telegramNotifications}
                                onChange={(e) => setTelegramNotifications(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0071e3]"></div>
                        </label>
                        <div className="flex items-center gap-2 text-xs font-medium text-zinc-300">
                            <Send className="w-4 h-4 text-zinc-400" />
                            <span>{t('telegramNotifications') || 'Telegram Notifications'}</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 mt-8">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white rounded-xl font-medium text-sm transition-all border border-white/10 cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSave(name, telegramNotifications)}
                        disabled={!name.trim()}
                        className="flex-2 px-8 py-3 bg-[#0a84ff] hover:bg-[#0071e3] text-white disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-medium text-sm transition-all shadow-[0_4px_16px_rgba(10,132,255,0.25)] border border-blue-400/30 active:scale-[0.98] cursor-pointer"
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
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300" onClick={onClose}>
            <div 
                onClick={(e) => e.stopPropagation()} 
                className="glass-panel bg-zinc-900/85 backdrop-blur-2xl border border-white/10 rounded-3xl w-full max-w-2xl h-[70vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden"
            >
                <div className="p-5 border-b border-white/[0.08] flex justify-between items-center bg-zinc-900/40">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-3 tracking-tight">
                        <Info className="text-zinc-400 w-5 h-5" /> Scraper Logs
                    </h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar font-mono text-[11px] space-y-1.5 bg-black/30">
                    {logs.map((log, i) => (
                        <div key={log.id || i} className="flex gap-3 py-1 border-b border-white/[0.04] last:border-0 group">
                            <span className="text-zinc-500 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                            <span className="text-zinc-300 break-words group-hover:text-white transition-colors">{log.message}</span>
                        </div>
                    ))}
                    {logs.length === 0 && <div className="text-center py-12 text-zinc-500 italic">No logs yet...</div>}
                </div>
                <div className="p-4 border-t border-white/[0.08] flex justify-end bg-zinc-900/40">
                    <button onClick={onClose} className="px-5 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-medium transition-all border border-white/10 cursor-pointer">Close</button>
                </div>
            </div>
        </div>
    );
};

const MaintenanceModal = ({ status, onClose, t }) => {
    if (!status) return null;

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return date.toLocaleString([], {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <h3 className="text-xl font-bold text-white flex items-center gap-3">
                        <Info className="text-emerald-400 w-5 h-5" /> Scraper & Maintenance Info
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                {/* Content */}
                <div className="p-6 space-y-6 bg-slate-950/50 text-slate-300">
                    {/* Run Schedule */}
                    <div className="space-y-3">
                        <h4 className="text-xs uppercase tracking-wider font-bold text-slate-500">Run Schedule</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl flex items-start gap-3">
                                <Calendar className="text-blue-400 w-5 h-5 shrink-0 mt-0.5" />
                                <div>
                                    <div className="text-[10px] text-slate-500 uppercase font-black">Next Scraping Run</div>
                                    <div className="text-sm font-bold text-white mt-1">
                                        {formatDate(status.next_run)}
                                    </div>
                                </div>
                            </div>
                            <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl flex items-start gap-3">
                                <Calendar className="text-emerald-400 w-5 h-5 shrink-0 mt-0.5" />
                                <div>
                                    <div className="text-[10px] text-slate-500 uppercase font-black">Next Maintenance Run</div>
                                    <div className="text-sm font-bold text-white mt-1">
                                        {formatDate(status.next_maintenance_run)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Archived Statistics */}
                    <div className="space-y-3">
                        <h4 className="text-xs uppercase tracking-wider font-bold text-slate-500">Archived Offers Stats</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl text-center">
                                <div className="text-[10px] text-slate-500 uppercase font-black">Archived Today (Regular Scans)</div>
                                <div className="text-2xl font-black text-blue-400 mt-1">{status.archived_today_scan}</div>
                            </div>
                            <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl text-center">
                                <div className="text-[10px] text-slate-500 uppercase font-black">Archived Today (Maintenance)</div>
                                <div className="text-2xl font-black text-emerald-400 mt-1">{status.archived_today_maintenance}</div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl text-center">
                                <div className="text-[9px] text-slate-500 uppercase font-black">Archived Yesterday</div>
                                <div className="text-lg font-bold text-slate-300 mt-1">{status.archived_yesterday}</div>
                            </div>
                            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl text-center">
                                <div className="text-[9px] text-slate-500 uppercase font-black">Total Archived</div>
                                <div className="text-lg font-bold text-purple-400 mt-1">{status.archived_total}</div>
                            </div>
                        </div>
                    </div>

                    {/* Previous Runs Info */}
                    <div className="space-y-3">
                        <h4 className="text-xs uppercase tracking-wider font-bold text-slate-500">Recent Executions</h4>
                        <div className="bg-slate-900/80 border border-slate-800 rounded-xl divide-y divide-slate-800 overflow-hidden">
                            <div className="p-3.5 flex justify-between items-center text-sm">
                                <div className="flex items-center gap-2">
                                    <Archive className="text-blue-400 w-4 h-4" />
                                    <span>Last Scrape Archiving</span>
                                </div>
                                <span className="font-bold text-slate-200">{status.last_scan_archived_count || 0} offers</span>
                            </div>
                            <div className="p-3.5 flex justify-between items-center text-sm">
                                <div className="flex items-center gap-2">
                                    <Archive className="text-emerald-400 w-4 h-4" />
                                    <span>Last Maintenance Archiving</span>
                                </div>
                                <span className="font-bold text-slate-200">{status.last_maintenance_archived_count || 0} offers</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Footer */}
                <div className="p-4 border-t border-slate-800 flex justify-end bg-slate-900/30">
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
    const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
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
    const [withinPeriod, setWithinPeriod] = useState(null);

    const [savedSearches, setSavedSearches] = useState([]);
    const [scraperStatus, setScraperStatus] = useState(null);
    const [isTriggering, setIsTriggering] = useState(false);
    const [triggerAnchorRun, setTriggerAnchorRun] = useState(null);

    const [liveCheckEnabled, setLiveCheckEnabled] = useState(() => {
        const saved = localStorage.getItem('liveCheckEnabled');
        return saved !== null ? saved === 'true' : true;
    });
    const pendingQueueRef = useRef([]);
    const recentCheckMapRef = useRef(new Map());
    const checkTimerRef = useRef(null);

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
            <div className="flex flex-wrap gap-2 sm:col-span-full pb-4 border-b border-white/[0.06] mb-1">
                {[
                    { active: onlyNew, toggle: () => setOnlyNew(!onlyNew), label: t('onlyNew') },
                    { active: onlyWithPrice, toggle: () => setOnlyWithPrice(!onlyWithPrice), label: t('hideWithoutPrice') },
                    { active: excludeBullshit, toggle: () => setExcludeBullshit(!excludeBullshit), label: t('hideBullshit') },
                    { active: showArchived, toggle: () => setShowArchived(!showArchived), label: t('showArchived') },
                ].map((item, idx) => (
                    <button
                        key={idx}
                        onClick={item.toggle}
                        className={`px-3.5 py-1.5 rounded-full border text-xs font-medium tracking-tight transition-all duration-200 flex items-center gap-2 cursor-pointer ${item.active
                            ? 'bg-white/20 text-white border-white/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25)] font-semibold'
                            : 'bg-white/[0.04] border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.08] hover:border-white/20'
                            }`}
                    >
                        <span className={`w-1.5 h-1.5 rounded-full ${item.active ? 'bg-blue-400' : 'bg-zinc-600'}`} />
                        {item.label}
                    </button>
                ))}
            </div>

            <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 tracking-wide uppercase">{t('search')}</label>
                <input
                    type="text"
                    placeholder={t('keywords')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 focus:bg-white/[0.07] focus:ring-1 focus:ring-white/20 transition-all"
                />
            </div>

            <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 tracking-wide uppercase">{t('sortBy')}</label>
                <select
                    value={ordering}
                    onChange={(e) => setOrdering(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-white/30 transition-all cursor-pointer"
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
                <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 tracking-wide uppercase">{t('brand')}</label>
                <input
                    type="text"
                    placeholder="e.g. Audi, BMW"
                    value={brandFilter}
                    onChange={(e) => setBrandFilter(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 focus:bg-white/[0.07] focus:ring-1 focus:ring-white/20 transition-all"
                />
            </div>

            <div className="sm:col-span-2 lg:col-span-1 lg:col-start-4 lg:row-span-2 self-start">
                <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 tracking-wide uppercase">{t('fuelType')}</label>
                <div className="flex flex-wrap gap-1.5">
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
                                className={`px-3 py-1 rounded-full border text-xs font-medium tracking-tight transition-all cursor-pointer ${
                                    isActive
                                    ? 'bg-white/20 text-white border-white/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25)] font-semibold'
                                    : 'bg-white/[0.04] border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.08]'
                                }`}
                            >
                                {f.label}
                            </button>
                        );
                    })}
                    {fuelFilter.length > 0 && (
                        <button 
                            onClick={() => { setPage(1); setFuelFilter([]); }}
                            className="px-2 py-1 text-xs font-medium text-zinc-400 hover:text-white underline cursor-pointer"
                        >
                            {lang === 'pl' ? 'Wyczyść' : 'Clear'}
                        </button>
                    )}
                </div>
            </div>

            <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 tracking-wide uppercase">{t('price')}</label>
                <div className="flex gap-2">
                    <input
                        type="number"
                        placeholder={lang === 'pl' ? 'Od' : 'From'}
                        value={priceMin}
                        onChange={(e) => setPage(1) || setPriceMin(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 focus:bg-white/[0.07] focus:ring-1 focus:ring-white/20 transition-all"
                    />
                    <input
                        type="number"
                        placeholder={lang === 'pl' ? 'Do' : 'To'}
                        value={priceMax}
                        onChange={(e) => setPage(1) || setPriceMax(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 focus:bg-white/[0.07] focus:ring-1 focus:ring-white/20 transition-all"
                    />
                </div>
            </div>

            <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 tracking-wide uppercase">{t('mileage')}</label>
                <div className="flex gap-2">
                    <input
                        type="number"
                        placeholder={lang === 'pl' ? 'Od' : 'From'}
                        value={mileageMin}
                        onChange={(e) => setPage(1) || setMileageMin(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 focus:bg-white/[0.07] focus:ring-1 focus:ring-white/20 transition-all"
                    />
                    <input
                        type="number"
                        placeholder={lang === 'pl' ? 'Do' : 'To'}
                        value={mileageMax}
                        onChange={(e) => setPage(1) || setMileageMax(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 focus:bg-white/[0.07] focus:ring-1 focus:ring-white/20 transition-all"
                    />
                </div>
            </div>

            <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 tracking-wide uppercase">{t('productionYear')}</label>
                <div className="flex gap-2">
                    <input
                        type="number"
                        placeholder={lang === 'pl' ? 'Od' : 'From'}
                        value={yearMin}
                        onChange={(e) => setPage(1) || setYearMin(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 focus:bg-white/[0.07] focus:ring-1 focus:ring-white/20 transition-all"
                    />
                    <input
                        type="number"
                        placeholder={lang === 'pl' ? 'Do' : 'To'}
                        value={yearMax}
                        onChange={(e) => setPage(1) || setYearMax(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 focus:bg-white/[0.07] focus:ring-1 focus:ring-white/20 transition-all"
                    />
                </div>
            </div>

            {/* Published Date Range + Quick Presets — full width */}
            <div className="sm:col-span-full pt-3 border-t border-white/[0.06] mt-1">
                <div className="flex flex-row flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[140px]">
                        <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 tracking-wide uppercase">{t('publishedFrom')}</label>
                        <input
                            type="date"
                            value={getResolvedDate(publishedAfter).replace(/\./g, '-')}
                            onChange={(e) => {
                                setWithinPeriod(null);
                                setPublishedAfter(e.target.value.replace(/-/g, '.'));
                            }}
                            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-white/30 focus:bg-white/[0.07] focus:ring-1 focus:ring-white/20 transition-all [color-scheme:dark]"
                        />
                    </div>
                    <div className="flex-1 min-w-[140px]">
                        <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 tracking-wide uppercase">{t('publishedTo')}</label>
                        <input
                            type="date"
                            value={getResolvedDate(publishedBefore).replace(/\./g, '-')}
                            onChange={(e) => {
                                setWithinPeriod(null);
                                setPublishedBefore(e.target.value.replace(/-/g, '.'));
                            }}
                            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-white/30 focus:bg-white/[0.07] focus:ring-1 focus:ring-white/20 transition-all [color-scheme:dark]"
                        />
                    </div>
                    <div className="flex gap-1.5 flex-wrap shrink-0 pb-0.5 items-center">
                        <span className="text-xs text-zinc-400 self-center whitespace-nowrap mr-1">{t('within')}:</span>
                        {DATE_PRESETS.map(({ label, days, code }) => {
                            const val = getPublishedAfterDate(days);
                            const isActive = withinPeriod === label || publishedAfter === code || (!withinPeriod && publishedAfter === val && !publishedBefore);
                            return (
                                <button
                                    key={label}
                                    onClick={() => {
                                        if (isActive) {
                                            setWithinPeriod(null);
                                            setPublishedAfter('');
                                        } else {
                                            setWithinPeriod(label);
                                            setPublishedAfter(val);
                                            setPublishedBefore('');
                                        }
                                    }}
                                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${isActive
                                        ? 'bg-white/20 text-white border-white/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25)] font-semibold'
                                        : 'bg-white/[0.04] border-white/10 text-zinc-400 hover:text-white hover:border-white/20'
                                        }`}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Bottom Buttons — full width */}
            <div className="sm:col-span-full grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                <button
                    onClick={clearFilters}
                    className="py-2.5 px-4 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white text-xs font-medium rounded-xl border border-white/10 transition-all cursor-pointer"
                >
                    {t('clearFilters')}
                </button>
                <button
                    onClick={saveAsDefault}
                    className="py-2.5 px-4 bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 hover:text-white text-xs font-medium rounded-xl border border-white/10 transition-all cursor-pointer flex justify-center items-center gap-2"
                >
                    <Save className="w-4 h-4 text-zinc-400" /> {t('saveAsDefault')}
                </button>
                <button
                    onClick={() => setShowSaveModal(true)}
                    className="py-2.5 px-4 bg-[#0a84ff] hover:bg-[#0071e3] text-white text-xs font-medium rounded-xl border border-blue-400/30 transition-all shadow-[0_4px_16px_rgba(10,132,255,0.25)] cursor-pointer flex justify-center items-center gap-2"
                >
                    <Bookmark className="w-4 h-4 text-white" /> {t('saveSearch')}
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
            if (onlyFavorites) {
                url += `&is_favorite=true`;
            } else {
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
                if (onlyWithPrice) url += `&has_price=true`;
                if (showArchived) url += `&is_archived=true`;
                if (publishedAfter) url += `&published_after=${encodeURIComponent(publishedAfter)}`;
                if (publishedBefore) url += `&published_before=${encodeURIComponent(publishedBefore)}`;
            }

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

    useEffect(() => {
        const handlePopState = (event) => {
            setSelectedOffer(prev => {
                if (prev) {
                    return null;
                }
                return prev;
            });
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const processCheckQueue = useCallback(async () => {
        if (!liveCheckEnabled || pendingQueueRef.current.length === 0) return;

        const chunk = pendingQueueRef.current.splice(0, 10);
        if (chunk.length === 0) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/offers/check_active_chunk/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ offer_ids: chunk }),
            });
            if (!res.ok) return;
            const resData = await res.json();
            if (resData.archived_ids && resData.archived_ids.length > 0) {
                const archivedSet = new Set(resData.archived_ids);
                const resultsMap = new Map((resData.results || []).map(r => [r.id, r]));

                setOffers(prev => prev.map(off => {
                    if (archivedSet.has(off.id)) {
                        const item = resultsMap.get(off.id);
                        return {
                            ...off,
                            is_archived: true,
                            title: item?.title || (off.title?.startsWith('[SPRZEDANE]') ? off.title : `[SPRZEDANE] ${off.title}`)
                        };
                    }
                    return off;
                }));

                setAllResults(prev => prev.map(off => {
                    if (archivedSet.has(off.id)) {
                        const item = resultsMap.get(off.id);
                        return {
                            ...off,
                            is_archived: true,
                            title: item?.title || (off.title?.startsWith('[SPRZEDANE]') ? off.title : `[SPRZEDANE] ${off.title}`)
                        };
                    }
                    return off;
                }));
            }
        } catch (err) {
            console.error("Live check chunk error:", err);
        }

        if (pendingQueueRef.current.length > 0) {
            setTimeout(processCheckQueue, 400);
        }
    }, [liveCheckEnabled]);

    const handleOfferVisible = useCallback((offerId) => {
        if (!liveCheckEnabled) return;

        const now = Date.now();
        const tenMinutes = 10 * 60 * 1000;
        const lastChecked = recentCheckMapRef.current.get(offerId);

        if (lastChecked && (now - lastChecked) < tenMinutes) {
            return;
        }

        recentCheckMapRef.current.set(offerId, now);
        if (!pendingQueueRef.current.includes(offerId)) {
            pendingQueueRef.current.push(offerId);
        }

        if (pendingQueueRef.current.length >= 5) {
            if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
            processCheckQueue();
        } else {
            if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
            checkTimerRef.current = setTimeout(() => {
                processCheckQueue();
            }, 800);
        }
    }, [liveCheckEnabled, processCheckQueue]);

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
        setWithinPeriod(null);
        setPublishedAfter('');
        setPublishedBefore('');
    };

    const getPublishedAfterDate = (days) => {
        const d = new Date();
        d.setDate(d.getDate() - days);
        return d.toISOString().slice(0, 10).replace(/-/g, '.');
    };

    const DATE_PRESETS = [
        { label: '1D', days: 1, code: '1d' },
        { label: '1W', days: 7, code: '7d' },
        { label: '2W', days: 14, code: '14d' },
        { label: '3W', days: 21, code: '21d' },
        { label: '1M', days: 30, code: '30d' },
        { label: '2M', days: 60, code: '60d' },
        { label: '3M', days: 90, code: '90d' },
    ];

    const getResolvedDate = (val) => {
        if (!val) return "";
        const preset = DATE_PRESETS.find(p => p.code === val.toLowerCase());
        if (preset) {
            return getPublishedAfterDate(preset.days);
        }
        return val;
    };

    const saveCurrentSearch = async (name, telegramNotifications = false) => {
        if (telegramNotifications && (!scraperStatus || !scraperStatus.telegram_configured)) {
            showToast(t('telegramNotConfigured') || 'Telegram bot is not configured in .env', 'error');
            return;
        }
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (ordering) params.append('ordering', ordering);
        if (brandFilter) params.append('brand', brandFilter);
        if (fuelFilter.length > 0) {
            fuelFilter.forEach(f => params.append('fuel', f));
        }
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
        if (withinPeriod) {
            params.append('period', withinPeriod);
        } else {
            if (publishedAfter) params.append('published_after', publishedAfter);
            if (publishedBefore) params.append('published_before', publishedBefore);
        }

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
        if (withinPeriod) {
            params.append('period', withinPeriod);
        } else {
            if (publishedAfter) params.append('published_after', publishedAfter);
            if (publishedBefore) params.append('published_before', publishedBefore);
        }

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

        const periodParam = params.get('period') || params.get('within_days');
        if (periodParam) {
            const preset = DATE_PRESETS.find(p =>
                p.label.toLowerCase() === periodParam.toLowerCase() ||
                p.days.toString() === periodParam
            );
            if (preset) {
                setWithinPeriod(preset.label);
                setPublishedAfter(getPublishedAfterDate(preset.days));
                setPublishedBefore('');
            } else {
                const days = parseInt(periodParam, 10);
                if (!isNaN(days)) {
                    setWithinPeriod(`${days}D`);
                    setPublishedAfter(getPublishedAfterDate(days));
                    setPublishedBefore('');
                } else {
                    setWithinPeriod(null);
                    setPublishedAfter('');
                    setPublishedBefore('');
                }
            }
        } else {
            setWithinPeriod(null);
            setPublishedAfter(params.get('published_after') || "");
            setPublishedBefore(params.get('published_before') || "");
        }
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
        window.history.pushState({ modal: 'offer' }, '');
    };

    const handleBack = () => {
        if (window.history.state && window.history.state.modal === 'offer') {
            window.history.back();
        } else {
            setSelectedOffer(null);
        }
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
                <header className="mb-6 md:mb-8 flex flex-col md:flex-row justify-between items-start md:items-end border-b border-white/[0.08] pb-6 gap-6">
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between md:justify-start gap-4 w-full md:w-auto">
                            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white flex items-center gap-2.5">
                                {t('title')}
                            </h1>
                            <div className="flex bg-white/[0.06] rounded-full p-0.5 border border-white/10">
                                <button
                                    onClick={() => setLang('pl')}
                                    className={`px-3 py-1 rounded-full text-[11px] transition-all cursor-pointer ${lang === 'pl' ? 'bg-white/20 text-white border border-white/25 shadow-sm font-semibold' : 'text-zinc-400 hover:text-white font-medium'}`}
                                >
                                    PL
                                </button>
                                <button
                                    onClick={() => setLang('en')}
                                    className={`px-3 py-1 rounded-full text-[11px] transition-all cursor-pointer ${lang === 'en' ? 'bg-white/20 text-white border border-white/25 shadow-sm font-semibold' : 'text-zinc-400 hover:text-white font-medium'}`}
                                >
                                    EN
                                </button>
                            </div>
                        </div>
                        <div className="text-zinc-400 text-xs sm:text-sm flex flex-col md:flex-row md:items-center gap-2">
                            <span>{t('subtitle')}</span>
                            {scraperStatus && (
                                <div className="flex items-center gap-2 md:ml-2 md:pl-3 md:border-l border-white/10">
                                    <span className={`w-2 h-2 rounded-full ${(scraperStatus.is_running || isTriggering) ? 'bg-[#30d158] animate-pulse' : 'bg-zinc-600'}`}></span>
                                    <span className="text-xs text-zinc-400 font-medium">
                                        {(scraperStatus.is_running || isTriggering) ? (
                                            <span className="text-[#30d158] font-semibold">{t('scrapingNow')}</span>
                                        ) : (
                                            <span>
                                                {t('nextRun')}: {scraperStatus.next_run ? new Date(scraperStatus.next_run).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                                                <button
                                                    onClick={handleForceScrape}
                                                    className="ml-2.5 text-xs text-white/80 hover:text-white underline underline-offset-2 transition-colors cursor-pointer"
                                                >
                                                    {t('runNow')}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        fetchScraperLogs();
                                                        setShowLogsModal(true);
                                                    }}
                                                    className="ml-2 text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-2 transition-colors cursor-pointer"
                                                >
                                                    {t('logs') || 'Logs'}
                                                </button>
                                                <button
                                                    onClick={() => setShowMaintenanceModal(true)}
                                                    className="ml-2 text-[10px] text-emerald-400 hover:text-emerald-300 underline font-medium cursor-pointer"
                                                >
                                                    {t('maintenance') || 'Maintenance'}
                                                </button>
                                            </span>
                                        )}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="text-zinc-300 text-sm flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                        {!onlyFavorites && (
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-full border text-xs font-medium tracking-tight transition-all duration-200 w-full md:w-auto cursor-pointer ${showFilters
                                    ? 'bg-white/20 text-white border-white/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25)] font-semibold'
                                    : 'bg-white/[0.05] border-white/10 text-zinc-300 hover:text-white hover:bg-white/[0.09]'
                                    }`}
                            >
                                <Filter className={`w-3.5 h-3.5 transition-transform duration-300 ${showFilters ? 'scale-110' : ''}`} />
                                <span className="uppercase tracking-wider text-[11px]">{t('filters')}</span>
                            </button>
                        )}

                        <button
                            onClick={() => {
                                const next = !liveCheckEnabled;
                                setLiveCheckEnabled(next);
                                localStorage.setItem('liveCheckEnabled', String(next));
                                if (!next) {
                                    pendingQueueRef.current = [];
                                }
                            }}
                            className={`relative flex items-center justify-center gap-2 px-3.5 py-2 rounded-full border text-xs font-medium tracking-tight transition-all duration-200 cursor-pointer w-full md:w-auto ${liveCheckEnabled
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 font-semibold shadow-sm'
                                : 'bg-white/[0.05] border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.09]'
                                }`}
                            title={t('liveCheckDesc')}
                        >
                            <span className={`w-1.5 h-1.5 rounded-full ${liveCheckEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span className="uppercase tracking-wider text-[11px]">{t('liveCheck')}</span>
                        </button>

                        <button
                            onClick={() => setOnlyFavorites(!onlyFavorites)}
                            className={`relative flex items-center justify-center gap-2 px-4 py-2 rounded-full border text-xs font-medium tracking-tight transition-all duration-200 group w-full md:w-auto cursor-pointer ${onlyFavorites
                                ? 'bg-rose-500/15 border-rose-500/30 text-rose-300 font-semibold shadow-sm'
                                : 'bg-white/[0.05] border-white/10 text-zinc-300 hover:text-white hover:bg-white/[0.09]'
                                }`}
                        >
                            <Heart className={`w-3.5 h-3.5 transition-all duration-300 ${onlyFavorites ? 'fill-rose-500 text-rose-500 scale-110' : 'text-zinc-400 group-hover:text-rose-400'}`} />
                            <span className="uppercase tracking-wider text-[11px]">{t('favorites')}</span>
                        </button>

                        <button
                            onClick={() => setShowSavedDrawer(true)}
                            className="relative flex items-center justify-center gap-2 px-4 py-2 bg-white/[0.05] hover:bg-white/[0.09] text-zinc-300 hover:text-white rounded-full border border-white/10 text-xs font-medium tracking-tight transition-all cursor-pointer w-full md:w-auto"
                        >
                            <Bookmark className={`w-3.5 h-3.5 transition-colors ${savedSearches.some(ss => ss.new_count > 0) ? 'text-white' : 'text-zinc-400 group-hover:text-white'}`} />
                            <span className="uppercase tracking-wider text-[11px]">{t('savedSearches')}</span>
                            {savedSearches.reduce((acc, ss) => acc + (ss.new_count || 0), 0) > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-rose-500 text-[9px] font-bold text-white">
                                    {savedSearches.reduce((acc, ss) => acc + (ss.new_count || 0), 0)}
                                </span>
                            )}
                        </button>
                    </div>
                </header>

                <div className="flex flex-col gap-4 md:gap-6">
                    <div className="w-full">
                        {/* Desktop Filters Panel (Inline) */}
                        {!onlyFavorites && showFilters && (
                            <div className="hidden md:block glass-panel p-6 w-full mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-base font-semibold text-white flex items-center gap-2 tracking-tight">
                                        <Filter className="w-4 h-4 text-zinc-400" /> {t('filters')}
                                    </h3>
                                </div>
                                {renderFilters()}
                            </div>
                        )}

                        {/* Mobile Filters Drawer */}
                        <div className={`fixed inset-y-0 left-0 z-[130] w-full sm:w-80 bg-zinc-900/95 backdrop-blur-2xl border-r border-white/10 shadow-2xl transform transition-transform duration-300 ease-in-out md:hidden ${showFilters && !onlyFavorites ? 'translate-x-0' : '-translate-x-full'}`}>
                            <div className="p-6 border-b border-white/[0.08] flex justify-between items-center bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
                                <h3 className="text-lg font-semibold text-white flex items-center gap-3 tracking-tight">
                                    <Filter className="text-zinc-400 w-4 h-4" /> {t('filters')}
                                </h3>
                                <button onClick={() => setShowFilters(false)} className="p-1.5 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto h-[calc(100%-80px)] custom-scrollbar">
                                {renderFilters()}
                            </div>
                        </div>

                        {/* Mobile Drawer Backdrop */}
                        {showFilters && !onlyFavorites && (
                            <div className="fixed inset-0 z-[125] bg-black/60 backdrop-blur-md md:hidden animate-in fade-in duration-300" onClick={() => setShowFilters(false)}></div>
                        )}
                    </div>

                    <div className="w-full">
                        {/* Controls Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 glass-panel p-4 rounded-2xl border border-white/[0.08]">
                            <div className="flex items-center gap-5">
                                <span className="text-zinc-400 text-xs sm:text-sm">
                                    {t('showing')} <span className="font-semibold text-white">{data.count || 0}</span> {t('offers')}
                                </span>

                                <div className="h-4 w-px bg-white/10 hidden sm:block"></div>

                                <div className="flex items-center gap-2.5">
                                    <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">{t('pageSize')}</span>
                                    <select
                                        value={pageSize}
                                        onChange={(e) => setPageSize(Number(e.target.value))}
                                        className="bg-zinc-900 border border-white/10 text-white text-xs font-medium rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-white/30 transition-all cursor-pointer hover:bg-zinc-800"
                                    >
                                        {[12, 18, 24, 36, 48].map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setIsInfinite(!isInfinite)}
                                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium tracking-tight transition-all border cursor-pointer ${isInfinite ? 'bg-white/20 text-white border-white/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25)] font-semibold' : 'bg-white/[0.05] border-white/10 text-zinc-400 hover:text-white'}`}
                                >
                                    <LayoutGrid className="w-3.5 h-3.5" />
                                    {t('infiniteScroll')}
                                </button>

                                <div className="flex items-center bg-white/[0.06] rounded-full border border-white/10 p-0.5">
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`p-1.5 rounded-full transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-white/20 text-white border border-white/25 shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                                        title="Grid view"
                                    >
                                        <LayoutGrid className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`p-1.5 rounded-full transition-all cursor-pointer ${viewMode === 'list' ? 'bg-white/20 text-white border border-white/25 shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                                        title="List view"
                                    >
                                        <LayoutList className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {(loading && (!allResults || allResults.length === 0)) ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white"></div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {(!allResults || allResults.length === 0) ? (
                                    <div className="glass-panel p-12 text-center text-zinc-400 text-sm">
                                        {t('noOffersFound')}
                                    </div>
                                ) : (
                                    viewMode === 'grid' ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {allResults.map(offer => (
                                                <OfferCard key={offer.id} offer={offer} onSelect={handleSelectOffer} t={t} showToast={showToast} onToggleFavorite={toggleFavorite} viewMode="grid" onOfferVisible={handleOfferVisible} />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-3">
                                            {allResults.map(offer => (
                                                <OfferCard key={offer.id} offer={offer} onSelect={handleSelectOffer} t={t} showToast={showToast} onToggleFavorite={toggleFavorite} viewMode="list" onOfferVisible={handleOfferVisible} />
                                            ))}
                                        </div>
                                    )
                                )}

                                {isInfinite && data.next && (
                                    <div ref={loaderRef} className="py-12 flex justify-center">
                                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/10 text-zinc-400 text-xs font-medium">
                                            <div className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce"></div>
                                            <div className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                            <div className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                            <span className="text-[11px] font-medium tracking-wider ml-1">{t('loadingMore')}</span>
                                        </div>
                                    </div>
                                )}

                                {!isInfinite && data.count > pageSize && (
                                    <div className="flex justify-between items-center py-4">
                                        <button
                                            disabled={!data.previous}
                                            onClick={() => handlePageChange(page - 1)}
                                            className="px-4 py-2 bg-white/[0.05] hover:bg-white/[0.1] disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-xs font-medium text-white border border-white/10 transition-all cursor-pointer"
                                        >
                                            {t('previousPage')}
                                        </button>
                                        <span className="text-xs text-zinc-400">{lang === 'pl' ? 'Strona' : 'Page'} {page}</span>
                                        <button
                                            disabled={!data.next}
                                            onClick={() => handlePageChange(page + 1)}
                                            className="px-4 py-2 bg-white/[0.05] hover:bg-white/[0.1] disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-xs font-medium text-white border border-white/10 transition-all cursor-pointer"
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
            {showMaintenanceModal && (
                <MaintenanceModal
                    status={scraperStatus}
                    onClose={() => setShowMaintenanceModal(false)}
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
                    className="fixed bottom-8 right-8 p-3.5 bg-zinc-900/80 hover:bg-zinc-800 text-white rounded-full backdrop-blur-xl border border-white/15 shadow-2xl transition-all hover:scale-105 active:scale-95 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300 cursor-pointer"
                    title="Back to top"
                >
                    <ArrowUp className="w-5 h-5" />
                </button>
            )}

            {/* Saved Searches Side Drawer */}
            <div className={`fixed inset-y-0 right-0 z-[120] w-full sm:w-96 bg-zinc-900/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl transform transition-transform duration-300 ease-in-out ${showSavedDrawer ? 'translate-x-0' : 'translate-x-full'}`}>
                {/* Drawer Header */}
                <div className="p-6 border-b border-white/[0.08] flex justify-between items-center bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2.5 tracking-tight">
                        <Bookmark className="text-zinc-400 w-4 h-4" /> {t('savedSearches')}
                    </h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                fetchSavedSearches();
                                showToast(t('savedSearchesRefreshed'), 'info');
                            }}
                            className="p-1.5 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer"
                            title={t('refreshCounts')}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </button>
                        <button onClick={() => setShowSavedDrawer(false)} className="p-1.5 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Drawer Content */}
                <div className="p-6 overflow-y-auto h-[calc(100%-80px)] custom-scrollbar">
                    <div className="space-y-3">
                        {savedSearches.length === 0 ? (
                            <div className="text-center py-12">
                                <Bookmark className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                                <p className="text-xs text-zinc-500 italic">{t('noSavedSearches')}</p>
                            </div>
                        ) : (
                            savedSearches.map(ss => (
                                <div key={ss.id} className="group/item bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 hover:border-white/15 transition-all">
                                    <div className="flex justify-between items-start mb-2.5">
                                        <div className="flex-1 cursor-pointer" onClick={() => applySavedSearch(ss.query_string)}>
                                            <h4 className="text-white font-medium group-hover/item:text-white transition-colors text-sm">{ss.name}</h4>
                                            <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">
                                                {ss.query_string.split('&').join(' • ')}
                                            </p>
                                        </div>
                                        <div className="flex gap-1.5">
                                            <button
                                                onClick={() => toggleTelegram(ss.id, ss.telegram_notifications)}
                                                className={`p-2 rounded-xl border transition-all cursor-pointer ${ss.telegram_notifications ? 'bg-[#0071e3]/15 border-[#0071e3]/30 text-[#0071e3]' : 'bg-white/[0.04] border-white/10 text-zinc-400 hover:text-white'}`}
                                                title="Telegram Notifications"
                                            >
                                                <Send className={`w-3.5 h-3.5 ${ss.telegram_notifications ? 'fill-[#0071e3]/20' : ''}`} />
                                            </button>
                                            <button
                                                onClick={() => deleteSavedSearch(ss.id)}
                                                className="p-2 bg-white/[0.04] hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 rounded-xl border border-white/10 transition-all cursor-pointer"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                    {ss.new_count > 0 && (
                                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-white/10 border border-white/15 rounded-full w-fit">
                                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                                            <span className="text-[10px] font-semibold text-white uppercase tracking-wider">
                                                {ss.new_count} {t('newResults')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {scraperStatus?.telegram_configured && (
                        <div className="mt-8 pt-6 border-t border-white/[0.08]">
                            <button
                                onClick={handleTestTelegram}
                                className="w-full py-3.5 px-4 bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 hover:text-white border border-white/10 rounded-2xl transition-all flex items-center justify-center gap-3 font-medium text-xs cursor-pointer group"
                            >
                                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/15 transition-colors">
                                    <Send className="w-3.5 h-3.5 group-hover:scale-105 transition-transform" />
                                </div>
                                {t('testTelegram')}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Drawer Backdrop */}
            {showSavedDrawer && (
                <div className="fixed inset-0 z-[115] bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowSavedDrawer(false)}></div>
            )}
        </>
    );
}

export default App;
