import React, { useEffect, useRef, useState } from 'react';
import { MapPin, X, ExternalLink, Calendar, Gauge, Fuel, Car, Palette, Box, Settings, Globe, ShieldCheck, ChevronLeft, ChevronRight, Maximize, Heart } from 'lucide-react';

const ZoomableImage = ({ src, alt, className, onClick, isModal = false }) => {
    const imgRef = useRef(null);
    const [zoom, setZoom] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);
    const [transformOrigin, setTransformOrigin] = useState('center center');
    const hasMoved = useRef(false);

    useEffect(() => {
        setZoom(1);
        setPosition({ x: 0, y: 0 });
        setTransformOrigin('center center');
        setIsHovered(false);
        setIsDragging(false);
    }, [src]);

    const handleMouseMove = (e) => {
        if (!isModal) {
            if (!imgRef.current) return;
            const rect = imgRef.current.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            setTransformOrigin(`${x}% ${y}%`);
        } else if (isDragging && zoom > 1) {
            hasMoved.current = true;
            setPosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }
    };

    const handleMouseDown = (e) => {
        if (isModal) {
            hasMoved.current = false;
        }
        if (isModal && zoom > 1) {
            e.preventDefault();
            setIsDragging(true);
            setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleClick = (e) => {
        if (isModal) {
            e.stopPropagation();
            if (hasMoved.current) {
                hasMoved.current = false;
                return;
            }
            if (zoom > 1) {
                setZoom(1);
                setPosition({ x: 0, y: 0 });
                setTransformOrigin('center center');
            } else {
                if (!imgRef.current) return;
                const rect = imgRef.current.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const clickY = e.clientY - rect.top;

                const newZoom = 2.5;
                // Calculate translation to center the clicked point
                const newPosX = (rect.width / 2 - clickX) * (newZoom - 1);
                const newPosY = (rect.height / 2 - clickY) * (newZoom - 1);

                setTransformOrigin('center center');
                setZoom(newZoom);
                setPosition({ x: newPosX, y: newPosY });
            }
        } else if (onClick) {
            onClick(e);
        }
    };

    const handleWheel = (e) => {
        if (isModal) {
            e.preventDefault();
            setZoom((prev) => {
                const delta = e.deltaY > 0 ? -0.3 : 0.3;
                const newZoom = Math.min(Math.max(prev + delta, 1), 5);
                if (newZoom === 1) setPosition({ x: 0, y: 0 });
                return newZoom;
            });
        }
    };

    const currentZoom = isModal ? zoom : (isHovered ? 2 : 1);

    return (
        <div
            className={`relative w-full h-full flex items-center justify-center overflow-hidden ${isModal && zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'}`}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
                setIsDragging(false);
                setIsHovered(false);
            }}
            onWheel={handleWheel}
        >
            <img
                ref={imgRef}
                src={src}
                alt={alt}
                className={`${className} select-none`}
                style={{
                    transform: isModal ? `translate(${position.x}px, ${position.y}px) scale(${zoom})` : `scale(${currentZoom})`,
                    transformOrigin: transformOrigin,
                    transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseDown={handleMouseDown}
                onClick={handleClick}
                draggable={false}
            />
        </div>
    );
};

const OfferDetails = ({ offer, onBack, t, onToggleFavorite }) => {
    const modalRef = useRef(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const images = offer.images && offer.images.length > 0 ? offer.images : (offer.img && offer.img !== 'NULL' ? [offer.img] : []);
    const [previewOpen, setPreviewOpen] = useState(false);

    useEffect(() => {
        setPreviewOpen(false);
        setCurrentImageIndex(0);
    }, [offer.offer_id]);

    useEffect(() => {
        if (!previewOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setPreviewOpen(false);
            if (e.key === 'ArrowRight' && images.length > 1) nextImage();
            if (e.key === 'ArrowLeft' && images.length > 1) prevImage();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [previewOpen, images.length]);

    const nextImage = () => {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = () => {
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    };

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

    const renderSpec = (icon, labelKey, value) => {
        if (!value || value === 'NULL' || value === '-') return null;
        return (
            <div className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-blue-500/30 transition-colors">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                    {icon}
                </div>
                <div>
                    <div className="text-xs text-slate-500">{t(labelKey)}</div>
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

            {/* Modal Content Wrapper */}
            <div
                className="relative w-full max-w-6xl max-h-full flex flex-col bg-slate-900 border border-slate-700/60 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-4 duration-300"
            >
                {/* Fixed Close Button (relative to the modal box) */}
                <button
                    onClick={onBack}
                    className="absolute top-4 right-4 z-40 p-2 bg-slate-950/60 hover:bg-slate-800 text-white rounded-full backdrop-blur-md border border-slate-700/50 shadow-2xl transition-all hover:scale-110 group"
                >
                    <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                </button>

                {/* Scrollable Content Container */}
                <div 
                    ref={modalRef}
                    className="w-full h-full overflow-y-auto custom-scrollbar p-6 md:p-8"
                >
                    <div className="flex flex-col gap-8 lg:grid lg:grid-cols-2 lg:grid-rows-[auto_1fr_auto] lg:items-start lg:gap-8">
                        {/* Main Image */}
                        <div className="glass-panel overflow-hidden relative order-1 lg:col-start-1 lg:row-start-1">
                                <div className="relative bg-slate-800/80 flex items-center justify-center overflow-hidden rounded-xl h-[400px]">
                                    {images.length > 0 ? (
                                        <>
                                            {/* Blurred background fill */}
                                            <img src={images[currentImageIndex]} aria-hidden="true" className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-30 pointer-events-none" />
                                            {/* Main image */}
                                            <ZoomableImage
                                                key={images[currentImageIndex]}
                                                src={images[currentImageIndex]}
                                                alt={offer.title}
                                                className="relative w-full h-full object-contain rounded-lg drop-shadow-2xl transition-opacity duration-300"
                                                onClick={() => setPreviewOpen(true)}
                                            />

                                            {/* Fullscreen button */}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setPreviewOpen(true); }}
                                                className="absolute bottom-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors"
                                            >
                                                <Maximize className="w-5 h-5" />
                                            </button>

                                            {images.length > 1 && (
                                                <>
                                                    <button onClick={(e) => { e.stopPropagation(); prevImage(); }} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors z-10">
                                                        <ChevronLeft className="w-6 h-6" />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); nextImage(); }} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors z-10">
                                                        <ChevronRight className="w-6 h-6" />
                                                    </button>

                                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10 bg-black/40 px-3 py-1.5 rounded-full overflow-x-auto max-w-[80%] custom-scrollbar">
                                                        {images.map((_, idx) => (
                                                            <button
                                                                key={idx}
                                                                onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(idx); }}
                                                                className={`w-2 h-2 rounded-full transition-colors flex-shrink-0 ${idx === currentImageIndex ? 'bg-white' : 'bg-white/40 hover:bg-white/80'}`}
                                                            />
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        <div className="h-64 flex items-center justify-center text-slate-500">{t('noImage')}</div>
                                    )}
                                </div>
                            </div>

                        {/* Description */}
                        <div className="glass-panel p-6 md:p-8 order-3 lg:col-start-1 lg:row-start-2">
                                <h3 className="text-xl font-bold text-white mb-6 border-b border-slate-700 pb-4">{t('sellerDescription')}</h3>
                                <div className="text-slate-300 leading-relaxed whitespace-pre-wrap font-light text-sm">
                                    {offer.description && offer.description !== 'NULL' ? offer.description : t('noDescription')}
                                </div>
                            </div>

                        {/* Equipment list */}
                        {equipmentList.length > 0 && (
                            <div className="glass-panel p-6 md:p-8 order-4 lg:col-start-1 lg:row-start-3">
                                    <h3 className="text-xl font-bold text-white mb-6 border-b border-slate-700 pb-4">{t('equipment')}</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {equipmentList.map((item, idx) => (
                                            <span key={idx} className="bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-full text-xs font-medium">
                                                {item}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        {/* Pricing & Main Info */}
                        <div className="glass-panel p-6 md:p-8 lg:sticky lg:top-24 order-2 lg:col-start-2 lg:row-start-1 lg:row-span-3 relative">
                                <button
                                    onClick={() => onToggleFavorite(offer.id, offer.is_favorite)}
                                    className="absolute top-6 right-6 p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-rose-400 rounded-xl transition-all border border-slate-700 shadow-xl group/fav hover:scale-110 z-10"
                                    title={offer.is_favorite ? t('removeFavorite') : t('addFavorite')}
                                >
                                    <Heart className={`w-5 h-5 transition-colors ${offer.is_favorite ? 'fill-rose-500 text-rose-500' : 'text-slate-400 group-hover/fav:text-rose-400'}`} />
                                </button>
                                <div className="text-sm text-slate-500 mb-2 font-mono">{t('id')}: {offer.offer_id}</div>
                                <h1 className="text-3xl font-extrabold text-white mb-4 leading-tight pr-12">{offer.title}</h1>

                                <div className="text-4xl font-black text-emerald-400 mb-6 bg-emerald-500/10 inline-block px-4 py-2 rounded-xl border border-emerald-500/20">
                                    {offer.price ? `${String(parseInt(offer.price, 10)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')} PLN` : t('askPrice')}
                                </div>

                                <div className="flex items-center gap-2 text-slate-400 mb-8 border-b border-slate-700 pb-6">
                                    <MapPin className="w-4 h-4 text-blue-400" />
                                    <span className="font-medium text-slate-300">{offer.location || t('locationNotSpecified')}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-8">
                                    {renderSpec(<Calendar className="w-4 h-4" />, "year", offer.year)}
                                    {renderSpec(<Gauge className="w-4 h-4" />, "mileage_label", offer.mileage ? `${offer.mileage}` : null)}
                                    {renderSpec(<Fuel className="w-4 h-4" />, "fuel", offer.fuel)}
                                    {renderSpec(<Settings className="w-4 h-4" />, "engine", offer.capacity)}
                                </div>

                                <div className="space-y-2 mb-8">
                                    <h4 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">{t('additionalDetails')}</h4>
                                    <div className="grid grid-cols-1 gap-2">
                                        {renderSpec(<Car className="w-4 h-4" />, "bodyType", offer.body)}
                                        {renderSpec(<Settings className="w-4 h-4" />, "transmission", offer.transmission)}
                                        {renderSpec(<Palette className="w-4 h-4" />, "color", offer.color)}
                                        {renderSpec(<Box className="w-4 h-4" />, "doors", offer.number_of_doors)}
                                        {renderSpec(<Globe className="w-4 h-4" />, "origin", offer.registration_country)}
                                        {renderSpec(<ShieldCheck className="w-4 h-4" />, "importStatus", offer.imported_status)}
                                    </div>
                                </div>

                                <a
                                    href={offer.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-lg transition-all shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] flex items-center justify-center gap-2 transform hover:-translate-y-1"
                                >
                                    {t('viewOriginal')} <ExternalLink className="w-5 h-5" />
                                </a>
                                <div className="text-center mt-4 text-xs text-slate-500">
                                    {t('publishedDate')}: {offer.date}
                                </div>
                            </div>
                    </div>
                </div>
            </div>

            {/* Full-screen image preview modal */}
            {previewOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setPreviewOpen(false)}>
                    {/* Close button */}
                    <button
                        onClick={() => setPreviewOpen(false)}
                        className="absolute top-4 right-4 z-[110] p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {/* Navigation arrows */}
                    {images.length > 1 && (
                        <>
                            <button
                                onClick={(e) => { e.stopPropagation(); prevImage(); }}
                                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-[110]"
                            >
                                <ChevronLeft className="w-8 h-8" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); nextImage(); }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-[110]"
                            >
                                <ChevronRight className="w-8 h-8" />
                            </button>
                        </>
                    )}

                    {/* Image */}
                    <ZoomableImage
                        key={images[currentImageIndex]}
                        src={images[currentImageIndex]}
                        alt={offer.title}
                        className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
                        isModal={true}
                    />

                    {/* Image counter */}
                    {images.length > 1 && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm bg-black/40 px-4 py-2 rounded-full">
                            {currentImageIndex + 1} / {images.length}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default OfferDetails;
