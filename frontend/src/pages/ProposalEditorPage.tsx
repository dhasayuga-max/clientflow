import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fabric } from 'fabric';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Save, Plus, Trash2, Copy, ChevronUp, ChevronDown,
  Loader2, Type, Square, AlignLeft, AlignCenter, AlignRight,
  Bold, Italic, FileText, Presentation, ImagePlus
} from 'lucide-react';
import { PROPELBEES_TEMPLATE, CANVAS_W, CANVAS_H, SlideDefinition, BRAND } from '../data/proposalTemplates';
import { proposalApi, proposalImageApi } from '../api';
import { resolveFileUrl } from '../utils';

const EDITOR_SCALE = 0.9;
const EDITOR_W = Math.round(CANVAS_W * EDITOR_SCALE);
const EDITOR_H = Math.round(CANVAS_H * EDITOR_SCALE);
const THUMB_SCALE = 160 / CANVAS_W;
const THUMB_W = 160;
const THUMB_H = Math.round(CANVAS_H * THUMB_SCALE);

function deepClone<T>(v: T): T { return JSON.parse(JSON.stringify(v)); }

// Populate a fabric canvas from a SlideDefinition. Returns a promise that
// resolves once any images have finished loading (text/shapes render sync).
function populateCanvas(canvas: fabric.Canvas, slide: SlideDefinition, interactive: boolean): Promise<void> {
  canvas.clear();
  canvas.backgroundColor = slide.background;

  const imagePromises: Promise<void>[] = [];

  slide.objects.forEach(obj => {
    const { type, ...props } = obj;
    let fo: fabric.Object | null = null;
    if (type === 'textbox') {
      fo = new fabric.Textbox(String(props.text || ''), {
        left: Number(props.left), top: Number(props.top), width: Number(props.width || 200),
        fontSize: Number(props.fontSize || 14), fontWeight: String(props.fontWeight || 'normal'),
        fontStyle: String(props.fontStyle || 'normal') as 'normal'|'italic'|'oblique',
        fill: String(props.fill || '#000'), fontFamily: String(props.fontFamily || 'Arial'),
        textAlign: String(props.textAlign || 'left') as 'left'|'right'|'center'|'justify',
        lineHeight: Number(props.lineHeight || 1.3), charSpacing: Number(props.charSpacing || 0),
        selectable: interactive, hasControls: interactive, editable: interactive,
      });
    } else if (type === 'rect') {
      fo = new fabric.Rect({
        left: Number(props.left), top: Number(props.top),
        width: Number(props.width), height: Number(props.height),
        fill: String(props.fill || 'transparent'), stroke: String(props.stroke || 'transparent'),
        strokeWidth: Number(props.strokeWidth || 0), rx: Number(props.rx || 0), ry: Number(props.ry || 0),
        opacity: Number(props.opacity ?? 1), selectable: interactive, hasControls: interactive,
      });
    } else if (type === 'line') {
      fo = new fabric.Line([Number(props.x1), Number(props.y1), Number(props.x2), Number(props.y2)], {
        stroke: String(props.stroke || '#000'), strokeWidth: Number(props.strokeWidth || 1),
        opacity: Number(props.opacity ?? 1), selectable: interactive, hasControls: interactive,
      });
    } else if (type === 'polygon') {
      fo = new fabric.Polygon((props.points as {x:number;y:number}[]) || [], {
        left: Number(props.left), top: Number(props.top),
        fill: 'transparent', stroke: String(props.stroke || '#000'),
        strokeWidth: Number(props.strokeWidth || 2),
        selectable: interactive, hasControls: interactive,
      });
    } else if (type === 'image') {
      // Images load asynchronously — track the promise so callers can await full render
      const src = String(props.src || '');
      if (src) {
        const p = new Promise<void>(resolve => {
          fabric.Image.fromURL(src, img => {
            img.set({
              left: Number(props.left || 0),
              top: Number(props.top || 0),
              scaleX: Number(props.scaleX || 1),
              scaleY: Number(props.scaleY || 1),
              angle: Number(props.angle || 0),
              opacity: Number(props.opacity ?? 1),
              selectable: interactive,
              hasControls: interactive,
            });
            canvas.add(img);
            canvas.renderAll();
            resolve();
          }, { crossOrigin: 'anonymous' });
        });
        imagePromises.push(p);
      }
      return; // skip the generic canvas.add(fo) below — handled async above
    }
    if (fo) canvas.add(fo);
  });

  canvas.renderAll();
  return Promise.all(imagePromises).then(() => { canvas.renderAll(); });
}

function extractSlide(canvas: fabric.Canvas, id: string, name: string): SlideDefinition {
  const json = canvas.toJSON([
    'selectable','hasControls','editable','rx','ry','charSpacing','lineHeight',
    'x1','y1','x2','y2','src','crossOrigin','scaleX','scaleY','angle',
  ]) as unknown as { objects?: Array<Record<string, unknown>> };
  return {
    id, name,
    background: String(canvas.backgroundColor || '#ffffff'),
    objects: (json.objects || []).map((o: Record<string,unknown>) => ({
      type: o.type === 'i-text' ? 'textbox' : String(o.type), ...o,
    })),
  };
}

// ── Thumbnail ───────────────────────────────────────────────────────────────
function Thumb({ slide, index, active, onClick }: { slide: SlideDefinition; index: number; active: boolean; onClick: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const fab = useRef<fabric.Canvas | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    if (fab.current) { try { fab.current.dispose(); } catch {} }
    const c = new fabric.Canvas(ref.current, { width: THUMB_W, height: THUMB_H, selection: false, backgroundColor: slide.background });
    c.setZoom(THUMB_SCALE);
    populateCanvas(c, slide, false);
    fab.current = c;
    return () => { try { fab.current?.dispose(); fab.current = null; } catch {} };
  }, [slide]);
  return (
    <div onClick={onClick} className={`relative cursor-pointer rounded overflow-hidden border-2 transition-all flex-shrink-0 ${active ? 'border-orange-500 shadow-md' : 'border-gray-200 dark:border-gray-700 hover:border-orange-300'}`} style={{ width: THUMB_W + 4, height: THUMB_H + 4 }}>
      <div className="absolute top-1 left-1 bg-black/50 text-white text-xs rounded px-1 z-10 leading-tight">{index + 1}</div>
      <canvas ref={ref} style={{ display: 'block' }} />
    </div>
  );
}

// ── Properties Panel ────────────────────────────────────────────────────────
function PropsPanel({ canvas, bg, onBg }: { canvas: fabric.Canvas | null; bg: string; onBg: (c: string) => void }) {
  const [sel, setSel] = useState<fabric.Object | null>(null);
  const [fill, setFill] = useState('#000000');
  const [stroke, setStroke] = useState('#cccccc');
  const [fs, setFs] = useState(14);
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [align, setAlign] = useState('left');

  useEffect(() => {
    if (!canvas) return;
    const upd = () => {
      const o = canvas.getActiveObject(); setSel(o || null);
      if (!o) return;
      setFill(String((o as fabric.Textbox).fill || '#000000'));
      setStroke(String((o as fabric.Rect).stroke || '#cccccc'));
      if (o.type === 'textbox' || o.type === 'i-text') {
        const tb = o as fabric.Textbox;
        setFs(tb.fontSize || 14); setBold(tb.fontWeight === 'bold');
        setItalic(tb.fontStyle === 'italic'); setAlign(tb.textAlign || 'left');
      }
    };
    canvas.on('selection:created', upd); canvas.on('selection:updated', upd); canvas.on('selection:cleared', upd);
    return () => { canvas.off('selection:created', upd); canvas.off('selection:updated', upd); canvas.off('selection:cleared', upd); };
  }, [canvas]);

  const apply = (fn: (o: fabric.Object) => void) => { if (!canvas || !sel) return; fn(sel); canvas.renderAll(); };
  const isText = sel?.type === 'textbox' || sel?.type === 'i-text';

  return (
    <div className="w-52 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 p-3 overflow-y-auto flex-shrink-0 text-xs space-y-3">
      <p className="font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide text-xs">Properties</p>

      <div>
        <p className="text-gray-400 mb-1">Background</p>
        <div className="flex items-center gap-2">
          <input type="color" value={bg} onChange={e => onBg(e.target.value)} className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0.5" />
          <span className="font-mono text-xs text-gray-500">{bg}</span>
        </div>
      </div>

      {sel ? <>
        <div className="border-t border-gray-100 dark:border-gray-800 pt-2">
          <p className="text-gray-400 capitalize mb-2">{sel.type === 'i-text' ? 'text' : sel.type}</p>

          <p className="text-gray-400 mb-1">{isText ? 'Text color' : 'Fill'}</p>
          <div className="flex gap-2 mb-3">
            <input type="color" value={fill} onChange={e => { setFill(e.target.value); apply(o => o.set('fill', e.target.value)); }} className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0.5" />
            <input value={fill} onChange={e => { setFill(e.target.value); apply(o => o.set('fill', e.target.value)); }} className="input text-xs flex-1" />
          </div>

          {!isText && <>
            <p className="text-gray-400 mb-1">Stroke</p>
            <div className="flex gap-2 mb-3">
              <input type="color" value={stroke} onChange={e => { setStroke(e.target.value); apply(o => o.set('stroke', e.target.value)); }} className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0.5" />
            </div>
          </>}

          {isText && <>
            <p className="text-gray-400 mb-1">Font size</p>
            <div className="flex items-center gap-1 mb-3">
              <button onClick={() => { const n=fs-1; setFs(n); apply(o=>(o as fabric.Textbox).set('fontSize',n)); }} className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-600">−</button>
              <input type="number" value={fs} min={6} max={120} onChange={e => { const n=Number(e.target.value); setFs(n); apply(o=>(o as fabric.Textbox).set('fontSize',n)); }} className="input text-center text-xs w-14" />
              <button onClick={() => { const n=fs+1; setFs(n); apply(o=>(o as fabric.Textbox).set('fontSize',n)); }} className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-600">+</button>
            </div>

            <div className="flex gap-2 mb-3">
              <button onClick={() => { const n=!bold; setBold(n); apply(o=>(o as fabric.Textbox).set('fontWeight',n?'bold':'normal')); }} className={`p-1.5 rounded border ${bold?'bg-orange-100 border-orange-400 text-orange-600':'border-gray-200 text-gray-400'}`}><Bold className="w-3.5 h-3.5"/></button>
              <button onClick={() => { const n=!italic; setItalic(n); apply(o=>(o as fabric.Textbox).set('fontStyle',n?'italic':'normal')); }} className={`p-1.5 rounded border ${italic?'bg-orange-100 border-orange-400 text-orange-600':'border-gray-200 text-gray-400'}`}><Italic className="w-3.5 h-3.5"/></button>
            </div>

            <div className="flex gap-1 mb-3">
              {(['left','center','right'] as const).map(a=>(
                <button key={a} onClick={() => { setAlign(a); apply(o=>(o as fabric.Textbox).set('textAlign',a)); }} className={`p-1.5 rounded border ${align===a?'bg-orange-100 border-orange-400 text-orange-600':'border-gray-200 text-gray-400'}`}>
                  {a==='left'&&<AlignLeft className="w-3.5 h-3.5"/>}{a==='center'&&<AlignCenter className="w-3.5 h-3.5"/>}{a==='right'&&<AlignRight className="w-3.5 h-3.5"/>}
                </button>
              ))}
            </div>
          </>}

          <div className="grid grid-cols-2 gap-1 mb-3">
            {['left','top','width','height'].map(p=>(
              <div key={p}>
                <p className="text-gray-400 text-xs mb-0.5 capitalize">{p}</p>
                <input type="number" value={Math.round(Number(sel.get(p as 'left')||0))} onChange={e=>{apply(o=>{o.set(p as 'left',Number(e.target.value));o.setCoords();});}} className="input text-xs w-full" />
              </div>
            ))}
          </div>

          <button onClick={() => { if (!canvas||!sel) return; canvas.remove(sel); canvas.renderAll(); setSel(null); }} className="w-full py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 text-xs font-medium flex items-center justify-center gap-1">
            <Trash2 className="w-3 h-3"/> Delete element
          </button>
        </div>
      </> : <p className="text-gray-400 text-xs">Click any element to edit its properties.</p>}
    </div>
  );
}

// ── Main Editor ─────────────────────────────────────────────────────────────
export default function ProposalEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const [slides, setSlides] = useState<SlideDefinition[]>(() => deepClone(PROPELBEES_TEMPLATE));
  const [activeIdx, setActiveIdx] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState<'pdf'|'pptx'|null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [proposalId, setProposalId] = useState<string|null>(!isNew ? id! : null);
  const [title, setTitle] = useState('New Proposal');
  const [bg, setBg] = useState(PROPELBEES_TEMPLATE[0].background);

  const editorEl = useRef<HTMLCanvasElement>(null);
  const fab = useRef<fabric.Canvas|null>(null);
  const slideData = useRef<SlideDefinition[]>(deepClone(PROPELBEES_TEMPLATE));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const flush = useCallback(() => {
    if (!fab.current) return;
    const cur = slideData.current[activeIdx];
    slideData.current[activeIdx] = extractSlide(fab.current, cur.id, cur.name);
  }, [activeIdx]);

  // Load existing proposal if editing
  useEffect(() => {
    if (!isNew && proposalId) {
      proposalApi.getOne(proposalId).then(res => {
        const p = res.data.data;
        setTitle(p.clientName || 'Proposal');
        if (p.editorData) {
          try {
            const parsed = JSON.parse(p.editorData) as SlideDefinition[];
            slideData.current = parsed;
            setSlides([...parsed]);
          } catch {}
        }
      }).catch(() => toast.error('Failed to load proposal'));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Build editor canvas when activeIdx changes
  useEffect(() => {
    if (!editorEl.current) return;
    // Flush before switching
    if (fab.current) {
      flush();
      try { fab.current.dispose(); } catch {}
    }
    const slide = slideData.current[activeIdx];
    setBg(slide.background);

    const canvas = new fabric.Canvas(editorEl.current, {
      width: EDITOR_W, height: EDITOR_H,
      selection: true, preserveObjectStacking: true,
      backgroundColor: slide.background,
    });
    canvas.setZoom(EDITOR_SCALE);
    populateCanvas(canvas, slide, true);

    const onChange = () => {
      const cur = slideData.current[activeIdx];
      slideData.current[activeIdx] = extractSlide(canvas, cur.id, cur.name);
      setSlides([...slideData.current]);
    };
    canvas.on('object:modified', onChange);
    canvas.on('text:changed', onChange);

    fab.current = canvas;
    return () => { try { canvas.dispose(); fab.current = null; } catch {} };
  }, [activeIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBg = (color: string) => {
    setBg(color);
    if (fab.current) { fab.current.backgroundColor = color; fab.current.renderAll(); }
  };

  // Slide ops
  const switchSlide = (i: number) => { flush(); setSlides([...slideData.current]); setActiveIdx(i); };
  const addSlide = () => {
    flush();
    const ns: SlideDefinition = { id: `slide-${Date.now()}`, name: `Slide ${slideData.current.length+1}`, background: '#ffffff', objects: [] };
    slideData.current = [...slideData.current, ns];
    setSlides([...slideData.current]);
    setActiveIdx(slideData.current.length - 1);
  };
  const dupSlide = () => {
    flush();
    const d = deepClone(slideData.current[activeIdx]);
    d.id = `slide-${Date.now()}`; d.name += ' (copy)';
    slideData.current = [...slideData.current.slice(0, activeIdx+1), d, ...slideData.current.slice(activeIdx+1)];
    setSlides([...slideData.current]);
    setActiveIdx(activeIdx + 1);
  };
  const delSlide = () => {
    if (slideData.current.length <= 1) { toast.error('Cannot delete the only slide'); return; }
    flush();
    slideData.current = slideData.current.filter((_,i) => i !== activeIdx);
    setSlides([...slideData.current]);
    setActiveIdx(Math.max(0, activeIdx - 1));
  };
  const moveSlide = (dir: -1|1) => {
    const j = activeIdx + dir;
    if (j < 0 || j >= slideData.current.length) return;
    flush();
    const arr = [...slideData.current];
    [arr[activeIdx], arr[j]] = [arr[j], arr[activeIdx]];
    slideData.current = arr;
    setSlides([...slideData.current]);
    setActiveIdx(j);
  };

  // Add elements
  const addText = () => {
    if (!fab.current) return;
    const tb = new fabric.Textbox('Click to edit text', { left: 100, top: 100, width: 300, fontSize: 18, fontFamily: 'Arial', fill: '#2B2118', editable: true });
    fab.current.add(tb); fab.current.setActiveObject(tb); fab.current.renderAll();
  };
  const addShape = () => {
    if (!fab.current) return;
    const rect = new fabric.Rect({ left: 100, top: 100, width: 200, height: 120, fill: BRAND.orange, rx: 8, ry: 8 });
    fab.current.add(rect); fab.current.setActiveObject(rect); fab.current.renderAll();
  };

  const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/svg+xml'];
  const MAX_IMAGE_MB = 10;

  const handleImageFile = async (file: File) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Unsupported format. Use PNG, JPG, WebP, GIF, or SVG.');
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      toast.error(`Image too large — max ${MAX_IMAGE_MB}MB.`);
      return;
    }
    setIsUploadingImage(true);
    try {
      const res = await proposalImageApi.upload(file);
      const relativeUrl = res.data.data.url as string;
      const absoluteUrl = resolveFileUrl(relativeUrl);

      if (!fab.current) return;
      fabric.Image.fromURL(absoluteUrl, img => {
        // Scale large images down to fit reasonably within the slide on insert
        const maxDim = 320;
        const scale = Math.min(1, maxDim / Math.max(img.width || maxDim, img.height || maxDim));
        img.set({
          left: (CANVAS_W - (img.width || 0) * scale) / 2,
          top: (CANVAS_H - (img.height || 0) * scale) / 2,
          scaleX: scale, scaleY: scale,
          selectable: true, hasControls: true,
        });
        fab.current!.add(img);
        fab.current!.setActiveObject(img);
        fab.current!.renderAll();
        const cur = slideData.current[activeIdx];
        slideData.current[activeIdx] = extractSlide(fab.current!, cur.id, cur.name);
        setSlides([...slideData.current]);
      }, { crossOrigin: 'anonymous' });

      toast.success('Image added');
    } catch {
      toast.error('Image upload failed');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const triggerImagePicker = () => fileInputRef.current?.click();

  const onImagePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
    e.target.value = ''; // allow re-selecting the same file later
  };

  // Save
  const handleSave = async () => {
    flush();
    setIsSaving(true);
    try {
      const payload = {
        clientName: title, companyName: title,
        videoCount: '12 Videos / Month', monthlyPrice: 57000,
        belowAdSpend: 30000, monthlyCharge: 10000, aboveAdSpend: 30000, percentageCharge: 20,
        services: [], notes: '',
        editorData: JSON.stringify(slideData.current),
      };
      if (proposalId) {
        await proposalApi.update(proposalId, payload);
        toast.success('Saved!');
      } else {
        const res = await proposalApi.create(payload);
        const newId = res.data.data._id;
        setProposalId(newId);
        toast.success('Proposal created!');
        navigate(`/proposals/${newId}/editor`, { replace: true });
      }
    } catch { toast.error('Failed to save'); }
    finally { setIsSaving(false); }
  };

  // Export PDF
  const handlePDF = async () => {
    flush();
    setIsExporting('pdf');
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [CANVAS_W, CANVAS_H] });
      for (let i = 0; i < slideData.current.length; i++) {
        if (i > 0) pdf.addPage();
        const tmp = document.createElement('canvas');
        tmp.width = CANVAS_W; tmp.height = CANVAS_H;
        const tc = new fabric.Canvas(tmp, { width: CANVAS_W, height: CANVAS_H, backgroundColor: slideData.current[i].background });
        await populateCanvas(tc, slideData.current[i], false);
        pdf.addImage(tmp.toDataURL('image/png', 1.0), 'PNG', 0, 0, CANVAS_W, CANVAS_H);
        try { tc.dispose(); } catch {}
      }
      pdf.save(`${title || 'proposal'}.pdf`);
      toast.success('PDF exported!');
    } catch (e) { console.error(e); toast.error('PDF export failed'); }
    finally { setIsExporting(null); }
  };

  // Export PPTX (server-side)
  const handlePPTX = async () => {
    if (!proposalId) { toast.error('Save the proposal first'); return; }
    setIsExporting('pptx');
    try {
      const res = await proposalApi.downloadPPTX(proposalId);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }));
      const a = document.createElement('a'); a.href = url; a.download = `${title}.pptx`; a.click();
      URL.revokeObjectURL(url);
      toast.success('PPTX downloaded!');
    } catch { toast.error('PPTX export failed'); }
    finally { setIsExporting(null); }
  };

  return (
    <div className="flex flex-col bg-gray-100 dark:bg-gray-950" style={{ height: '100vh', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div className="h-12 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center px-3 gap-2 flex-shrink-0 z-10">
        <button onClick={() => navigate('/proposals')} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft className="w-4 h-4 text-gray-500"/>
        </button>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Proposal title"
          className="text-sm font-medium bg-transparent border-b border-transparent hover:border-gray-300 focus:border-orange-400 focus:outline-none px-1 w-52 text-gray-800 dark:text-gray-200"/>
        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1"/>
        <button onClick={addText} className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
          <Type className="w-3.5 h-3.5"/> Text
        </button>
        <button onClick={addShape} className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
          <Square className="w-3.5 h-3.5"/> Shape
        </button>
        <button onClick={triggerImagePicker} disabled={isUploadingImage} className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
          {isUploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <ImagePlus className="w-3.5 h-3.5"/>} Image
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml"
          onChange={onImagePicked}
          className="hidden"
        />
        <div className="flex-1"/>
        <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium hover:bg-gray-200 transition-colors">
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Save className="w-3.5 h-3.5"/>} Save
        </button>
        <button onClick={handlePDF} disabled={!!isExporting} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors">
          {isExporting==='pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <FileText className="w-3.5 h-3.5"/>} PDF
        </button>
        <button onClick={handlePPTX} disabled={!!isExporting} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium hover:opacity-90 transition-opacity" style={{ background: BRAND.orange }}>
          {isExporting==='pptx' ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Presentation className="w-3.5 h-3.5"/>} PPTX
        </button>
      </div>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="w-44 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col flex-shrink-0">
          <div className="flex items-center justify-between p-2 border-b border-gray-100 dark:border-gray-800">
            <span className="text-xs text-gray-500 font-medium">{slides.length} slides</span>
            <button onClick={addSlide} className="p-1 rounded hover:bg-orange-50 dark:hover:bg-orange-900/20" title="Add slide">
              <Plus className="w-4 h-4 text-orange-500"/>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {slides.map((sl, i) => (
              <div key={sl.id} className="relative group">
                <Thumb slide={sl} index={i} active={i === activeIdx} onClick={() => switchSlide(i)}/>
                <div className="absolute top-1 right-1 hidden group-hover:flex gap-0.5 bg-black/60 rounded p-0.5">
                  <button onClick={() => { switchSlide(i); setTimeout(dupSlide, 50); }} className="p-0.5 text-white hover:text-orange-300" title="Duplicate"><Copy className="w-2.5 h-2.5"/></button>
                  <button onClick={() => { switchSlide(i); setTimeout(delSlide, 50); }} className="p-0.5 text-white hover:text-red-400" title="Delete"><Trash2 className="w-2.5 h-2.5"/></button>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 dark:border-gray-800 p-2 flex justify-around">
            <button onClick={() => moveSlide(-1)} disabled={activeIdx === 0} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30" title="Move up"><ChevronUp className="w-4 h-4 text-gray-500"/></button>
            <button onClick={() => moveSlide(1)} disabled={activeIdx === slides.length-1} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30" title="Move down"><ChevronDown className="w-4 h-4 text-gray-500"/></button>
            <button onClick={delSlide} disabled={slides.length <= 1} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30" title="Delete"><Trash2 className="w-4 h-4 text-gray-500"/></button>
          </div>
        </div>

        {/* Canvas */}
        <div
          className="flex-1 overflow-auto bg-gray-300 dark:bg-gray-800 flex items-start justify-center p-8"
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) handleImageFile(file);
          }}
        >
          <div className="shadow-2xl flex-shrink-0" style={{ width: EDITOR_W, height: EDITOR_H }}>
            <canvas ref={editorEl} style={{ display: 'block' }}/>
          </div>
        </div>

        {/* Properties */}
        <PropsPanel canvas={fab.current} bg={bg} onBg={handleBg}/>
      </div>

      {/* Status bar */}
      <div className="h-7 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex items-center px-4 text-xs text-gray-400 gap-3 flex-shrink-0">
        <span>Slide {activeIdx+1} of {slides.length} · {slides[activeIdx]?.name}</span>
        <span>·</span>
        <span>Click to select · Double-click text to edit · Drag to move · Drop an image file anywhere to add it</span>
      </div>
    </div>
  );
}
