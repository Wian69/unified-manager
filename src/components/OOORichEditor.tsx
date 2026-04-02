'use client';

import { forwardRef } from 'react';
import { Type, Type as FontSizeIcon } from 'lucide-react';

interface RichEditorProps {
    id: string;
    label: string;
    onCommand: (cmd: string, val: string) => void;
    onChange?: (html: string) => void;
}

const fonts = ['Calibre, sans-serif', 'Inter, sans-serif', 'Roboto, sans-serif', 'Arial, sans-serif', 'Times New Roman, serif', 'Courier New, monospace'];
const fontSizes = ['10pt', '11pt', '12pt', '14pt', '16pt', '18pt', '20pt'];

const ToolbarButton = ({ onClick, children }: any) => (
    <button 
        type="button"
        onMouseDown={(e) => { e.preventDefault(); onClick(); }}
        className="p-2 px-3 text-xs font-black text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
    >
        {children}
    </button>
);

const RichEditor = forwardRef<HTMLDivElement, RichEditorProps>(({ id, label, onCommand, onChange }, ref) => {
    return (
        <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">{label}</label>
            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950 shadow-2xl">
                {/* TOOLBAR */}
                <div className="flex items-center gap-4 p-3 bg-slate-900 border-b border-slate-800">
                    <div className="flex items-center gap-2 border-r border-slate-700 pr-4">
                        <Type size={14} className="text-blue-400" />
                        <select 
                            onChange={(e) => onCommand('fontName', e.target.value)}
                            className="bg-slate-950 border border-slate-700 text-slate-300 text-[10px] font-black uppercase py-1 px-2 rounded-md outline-none"
                        >
                            <option value="">Font</option>
                            {fonts.map(f => (<option key={f} value={f}>{f.split(',')[0]}</option>))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2 border-r border-slate-700 pr-4">
                        <FontSizeIcon size={14} className="text-emerald-400" />
                        <select 
                            onChange={(e) => onCommand('fontSize', e.target.value)}
                            className="bg-slate-950 border border-slate-700 text-slate-300 text-[10px] font-black uppercase py-1 px-2 rounded-md outline-none"
                        >
                            <option value="">Size</option>
                            {fontSizes.map(s => (<option key={s} value={s}>{s}</option>))}
                        </select>
                    </div>
                    <div className="flex items-center gap-1">
                        <ToolbarButton onClick={() => onCommand('bold', '')}>B</ToolbarButton>
                        <ToolbarButton onClick={() => onCommand('italic', '')}>I</ToolbarButton>
                        <ToolbarButton onClick={() => onCommand('underline', '')}>U</ToolbarButton>
                    </div>
                </div>

                {/* EDITOR BOX */}
                <div 
                    ref={ref}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={(e) => onChange?.(e.currentTarget.innerHTML)}
                    onPaste={(e) => e.stopPropagation()}
                    className="w-full min-h-[180px] max-h-[400px] text-slate-200 text-sm p-6 outline-none overflow-y-auto prose prose-invert prose-sm"
                />
            </div>
        </div>
    );
});

RichEditor.displayName = 'RichEditor';

export default RichEditor;
