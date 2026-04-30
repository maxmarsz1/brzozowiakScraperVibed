import React, { useEffect, useRef } from 'react';
import { MapPin, X, ExternalLink, Calendar, Gauge, Fuel, Car, Palette, Box, Settings, Globe, ShieldCheck } from 'lucide-react';

const OfferDetails = ({ offer, onBack }) => {
    const modalRef = useRef(null);

    // Scroll to top of modal on mount
    useEffect(() => {
        if (modalRef.current) {
            modalRef.current.scrollTo(0, 0);
        }
        
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const renderSpec = (icon, label, value) => {
        if (!value || value === 'NULL' || value === '-') return null;
        return (
            <div className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-blue-500/30 transition-colors">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                    {icon}
                </div>
                <div>
                    <div className="text-xs text-slate-500">{label}</div>
                    <div className="text-sm font-semibold text-slate-200">{value}</div>
                </div>
            </div>
        );
    };

    const equipmentList = offer.equipment && offer.equipment !== 'NULL' 
        ? offer.equipment.split(',').map(e => e.trim()).filter(e => e) 
        : [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 animate-in fade-in duration-200">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" 
                onClick={onBack}
            ></div>

            {/* Modal Content */}
            <div 
                ref={modalRef}
                className="relative w-full max-w-6xl max-h-full overflow-y-auto custom-scrollbar bg-slate-900 border border-slate-700/60 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-4 duration-300"
            >
                {/* Sticky Header with Close Button */}
                <div className="sticky top-0 z-20 flex justify-between items-center p-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-sm">
                    <div className="text-sm font-medium text-slate-400">Offer Details</div>
                    <button 
                        onClick={onBack}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition-colors group"
                    >
                        <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                    </button>
                </div>

                <div className="p-6 md:p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left Column: Image and Description */}
                        <div className="space-y-8">
                            {/* Main Image */}
                            <div className="glass-panel overflow-hidden relative">
                                <div className="relative bg-slate-800/80 flex items-center justify-center overflow-hidden rounded-xl">
                                    {offer.img && offer.img !== 'NULL' ? (
                                        <>
                                            {/* Blurred background fill */}
                                            <img src={offer.img} aria-hidden="true" className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-30 pointer-events-none" />
                                            {/* Main image */}
                                            <img src={offer.img} alt={offer.title} className="relative w-full h-auto max-h-[500px] object-contain rounded-lg drop-shadow-2xl" />
                                        </>
                                    ) : (
                                        <div className="h-64 flex items-center justify-center text-slate-500">No Image Available</div>
                                    )}
                                </div>
                            </div>

                            {/* Description */}
                            <div className="glass-panel p-6 md:p-8">
                                <h3 className="text-xl font-bold text-white mb-6 border-b border-slate-700 pb-4">Seller's Description</h3>
                                <div className="text-slate-300 leading-relaxed whitespace-pre-wrap font-light text-sm">
                                    {offer.description && offer.description !== 'NULL' ? offer.description : 'No description provided by the seller.'}
                                </div>
                            </div>

                            {/* Equipment list */}
                            {equipmentList.length > 0 && (
                                <div className="glass-panel p-6 md:p-8">
                                    <h3 className="text-xl font-bold text-white mb-6 border-b border-slate-700 pb-4">Equipment</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {equipmentList.map((item, idx) => (
                                            <span key={idx} className="bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-full text-xs font-medium">
                                                {item}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Column: Key Details */}
                        <div className="space-y-6">
                            {/* Pricing & Main Info */}
                            <div className="glass-panel p-6 md:p-8 sticky top-24">
                                <div className="text-sm text-slate-500 mb-2 font-mono">ID: {offer.offer_id}</div>
                                <h1 className="text-3xl font-extrabold text-white mb-4 leading-tight">{offer.title}</h1>
                                
                                <div className="text-4xl font-black text-emerald-400 mb-6 bg-emerald-500/10 inline-block px-4 py-2 rounded-xl border border-emerald-500/20">
                                    {offer.price ? `${String(parseInt(offer.price, 10)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')} PLN` : 'Ask Price'}
                                </div>

                                <div className="flex items-center gap-2 text-slate-400 mb-8 border-b border-slate-700 pb-6">
                                    <MapPin className="w-4 h-4 text-blue-400" />
                                    <span className="font-medium text-slate-300">{offer.location || 'Location not specified'}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-8">
                                    {renderSpec(<Calendar className="w-4 h-4" />, "Year", offer.year)}
                                    {renderSpec(<Gauge className="w-4 h-4" />, "Mileage", offer.mileage ? `${offer.mileage} km` : null)}
                                    {renderSpec(<Fuel className="w-4 h-4" />, "Fuel", offer.fuel)}
                                    {renderSpec(<Settings className="w-4 h-4" />, "Engine", offer.capacity)}
                                </div>

                                <div className="space-y-2 mb-8">
                                    <h4 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">Additional Details</h4>
                                    <div className="grid grid-cols-1 gap-2">
                                        {renderSpec(<Car className="w-4 h-4" />, "Body Type", offer.body)}
                                        {renderSpec(<Settings className="w-4 h-4" />, "Transmission", offer.transmission)}
                                        {renderSpec(<Palette className="w-4 h-4" />, "Color", offer.color)}
                                        {renderSpec(<Box className="w-4 h-4" />, "Doors", offer.number_of_doors)}
                                        {renderSpec(<Globe className="w-4 h-4" />, "Origin", offer.registration_country)}
                                        {renderSpec(<ShieldCheck className="w-4 h-4" />, "Import Status", offer.imported_status)}
                                    </div>
                                </div>

                                <a 
                                    href={offer.url} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-lg transition-all shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] flex items-center justify-center gap-2 transform hover:-translate-y-1"
                                >
                                    View Original Source <ExternalLink className="w-5 h-5" />
                                </a>
                                <div className="text-center mt-4 text-xs text-slate-500">
                                    Data scraped on {new Date(offer.created_at).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OfferDetails;
