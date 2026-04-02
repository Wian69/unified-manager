"use client";

import React, { useRef, useEffect, useState } from 'react';

interface SignaturePadProps {
    onSave: (dataUrl: string) => void;
    label: string;
}

export default function SignaturePad({ onSave, label }: SignaturePadProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isEmpty, setIsEmpty] = useState(true);

    const getPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        
        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as MouseEvent).clientX;
            clientY = (e as MouseEvent).clientY;
        }

        return {
            x: (clientX - rect.left) * (canvas.width / rect.width),
            y: (clientY - rect.top) * (canvas.height / rect.height)
        };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const { x, y } = getPos(e);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            setIsDrawing(true);
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const { x, y } = getPos(e);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.lineTo(x, y);
            ctx.stroke();
            setIsEmpty(false);
        }
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        if (!isEmpty) {
            // Use JPEG with 0.6 quality for much smaller file size
            const dataUrl = canvasRef.current?.toDataURL('image/jpeg', 0.6);
            if (dataUrl) onSave(dataUrl);
        }
    };

    const clear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            setIsEmpty(true);
            onSave("");
        }
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // Initialize white background for JPEG support
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 1.5; // Slightly thinner for smaller canvas
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
            }
        }

        // Prevent scrolling when touching the canvas
        const preventDefault = (e: TouchEvent) => {
            if (e.target === canvas) e.preventDefault();
        };
        document.body.addEventListener('touchstart', preventDefault, { passive: false });
        document.body.addEventListener('touchmove', preventDefault, { passive: false });
        
        return () => {
            document.body.removeEventListener('touchstart', preventDefault);
            document.body.removeEventListener('touchmove', preventDefault);
        };
    }, []);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
                <button 
                    onClick={clear}
                    disabled={isEmpty}
                    className={`px-4 py-2 text-[10px] sm:text-[11px] font-black uppercase tracking-widest rounded-xl transition-all border ${
                        isEmpty 
                        ? 'text-slate-700 bg-slate-900/50 border-slate-800 cursor-not-allowed' 
                        : 'text-rose-500 bg-rose-500/5 border-rose-500/20 hover:bg-rose-500/10 active:scale-95'
                    }`}
                >
                    Clear Signature
                </button>
            </div>
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 rounded-3xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
                <canvas
                    ref={canvasRef}
                    width={500} // Increased resolution for cleaner signatures
                    height={200}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="relative w-full aspect-[5/2] bg-white border border-slate-800 rounded-2xl cursor-crosshair touch-none shadow-inner"
                    style={{ background: '#ffffff' }}
                />
            </div>
        </div>
    );
}
