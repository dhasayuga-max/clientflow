import PptxGenJS from 'pptxgenjs';
import { IProposal } from '../models/Proposal';
import path from 'path';
import fs from 'fs';

// Canvas coordinate space used by the frontend editor (see proposalTemplates.ts)
const CANVAS_W = 960;
const CANVAS_H = 540;

// PPTX slide size (16:9, inches) — pptxgenjs LAYOUT_WIDE is 13.33 x 7.5
const SLIDE_W = 13.333;
const SLIDE_H = 7.5;
const SCALE = SLIDE_W / CANVAS_W; // px -> inches

interface FabricObjectData {
  type?: string;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  text?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  fill?: string;
  fontFamily?: string;
  textAlign?: string;
  lineHeight?: number;
  charSpacing?: number;
  stroke?: string;
  strokeWidth?: number;
  rx?: number;
  ry?: number;
  opacity?: number;
  x1?: number; y1?: number; x2?: number; y2?: number;
  points?: { x: number; y: number }[];
  src?: string;
  scaleX?: number;
  scaleY?: number;
  angle?: number;
  [key: string]: unknown;
}

interface SlideData {
  id: string;
  name: string;
  background: string;
  objects: FabricObjectData[];
}

function px(n: number | undefined): number {
  return (n || 0) * SCALE;
}

function normalizeColor(c: string | undefined): string {
  if (!c) return '000000';
  const hex = c.replace('#', '').toUpperCase();
  return /^[0-9A-F]{6}$/.test(hex) ? hex : '000000';
}

// Resolve an uploaded image's relative URL to an absolute filesystem path
// so pptxgenjs can embed the actual bytes (it needs a real path or base64,
// not a URL the server itself is hosting).
function resolveLocalImagePath(src: string): string | null {
  // Expect paths like /uploads/proposal-images/xyz.png or a full URL ending in that
  const marker = '/uploads/';
  const idx = src.indexOf(marker);
  if (idx === -1) return null;
  const relative = src.slice(idx + marker.length); // e.g. "proposal-images/xyz.png"
  const fullPath = path.join(__dirname, '../../uploads', relative);
  return fs.existsSync(fullPath) ? fullPath : null;
}

function addTextbox(slide: PptxGenJS.Slide, obj: FabricObjectData): void {
  const fontSizePt = Math.max(6, Math.round((obj.fontSize || 14) * 0.75)); // px -> pt approximation
  slide.addText(obj.text || '', {
    x: px(obj.left), y: px(obj.top),
    w: px(obj.width || 200), h: px((obj.fontSize || 14) * (obj.lineHeight || 1.3) * ((obj.text || '').split('\n').length) * 1.1 / SCALE * SCALE) || px(40),
    fontFace: obj.fontFamily || 'Arial',
    fontSize: fontSizePt,
    bold: obj.fontWeight === 'bold',
    italic: obj.fontStyle === 'italic',
    color: normalizeColor(obj.fill),
    align: (obj.textAlign as 'left' | 'center' | 'right' | 'justify') || 'left',
    valign: 'top',
    lineSpacingMultiple: obj.lineHeight || 1.3,
    charSpacing: obj.charSpacing ? obj.charSpacing / 100 : undefined,
    margin: 0,
    autoFit: false,
    wrap: true,
  });
}

function addRect(slide: PptxGenJS.Slide, obj: FabricObjectData): void {
  const hasFill = obj.fill && obj.fill !== 'transparent';
  const hasStroke = obj.stroke && obj.stroke !== 'transparent' && (obj.strokeWidth || 0) > 0;
  const isRounded = (obj.rx || 0) > 0 || (obj.ry || 0) > 0;
  const transparency = obj.opacity !== undefined ? Math.round((1 - obj.opacity) * 100) : undefined;

  slide.addShape(isRounded ? 'roundRect' : 'rect', {
    x: px(obj.left), y: px(obj.top), w: px(obj.width), h: px(obj.height),
    rectRadius: isRounded ? Math.min(px(obj.rx || 0), 0.15) : undefined,
    fill: hasFill ? { color: normalizeColor(obj.fill), transparency } : { type: 'none' },
    line: hasStroke ? { color: normalizeColor(obj.stroke), width: Math.max(0.25, (obj.strokeWidth || 1) * SCALE * 72), transparency } : { type: 'none' },
  });
}

function addLine(slide: PptxGenJS.Slide, obj: FabricObjectData): void {
  slide.addShape('line', {
    x: px(obj.x1), y: px(obj.y1),
    w: px((obj.x2 || 0) - (obj.x1 || 0)), h: px((obj.y2 || 0) - (obj.y1 || 0)),
    line: {
      color: normalizeColor(obj.stroke),
      width: Math.max(0.25, (obj.strokeWidth || 1) * SCALE * 72),
      transparency: obj.opacity !== undefined ? Math.round((1 - obj.opacity) * 100) : undefined,
    },
  });
}

function addPolygon(slide: PptxGenJS.Slide, obj: FabricObjectData): void {
  // PptxGenJS doesn't support arbitrary polygons directly via addShape with
  // simple options, but it does support a custom "freeform" via addShape
  // with 'custGeom' — out of scope for v1. As a faithful approximation for
  // our known use case (hexagon outlines), we draw a hexagon preset shape.
  const w = px(obj.width || 100), h = px(obj.height || 100);
  slide.addShape('hexagon', {
    x: px(obj.left), y: px(obj.top), w, h,
    fill: { type: 'none' },
    line: { color: normalizeColor(obj.stroke), width: Math.max(0.25, (obj.strokeWidth || 2) * SCALE * 72) },
  });
}

function addImage(slide: PptxGenJS.Slide, obj: FabricObjectData): void {
  if (!obj.src) return;
  const localPath = resolveLocalImagePath(obj.src);
  if (!localPath) return; // skip images we can't resolve to a local file (e.g. external URLs not yet supported)

  const scaleX = obj.scaleX || 1;
  const scaleY = obj.scaleY || 1;
  // Fabric image width/height before scale aren't always present in JSON;
  // pptxgenjs needs explicit w/h, so we fall back to a reasonable default
  // if the natural size wasn't serialized, then apply the user's scale.
  const naturalW = (obj.width as number) || 200;
  const naturalH = (obj.height as number) || 200;

  slide.addImage({
    path: localPath,
    x: px(obj.left), y: px(obj.top),
    w: px(naturalW * scaleX), h: px(naturalH * scaleY),
    rotate: obj.angle || 0,
    transparency: obj.opacity !== undefined ? Math.round((1 - obj.opacity) * 100) : undefined,
  });
}

export async function generateEditorPPTX(proposal: IProposal): Promise<Buffer> {
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_WIDE';
  pres.author = 'Propelbees';
  pres.title = proposal.companyName || proposal.clientName || 'Proposal';

  let slides: SlideData[] = [];
  if (proposal.editorData) {
    try {
      slides = JSON.parse(proposal.editorData);
    } catch {
      slides = [];
    }
  }

  if (slides.length === 0) {
    // No editor data saved yet — produce a single blank slide rather than failing
    const s = pres.addSlide();
    s.addText('This proposal has no slide content yet. Open it in the editor to add slides.', {
      x: 0.5, y: 0.5, w: SLIDE_W - 1, h: 1, fontFace: 'Arial', fontSize: 16, color: '666666',
    });
  } else {
    for (const slideData of slides) {
      const s = pres.addSlide();
      s.background = { color: normalizeColor(slideData.background) };

      for (const obj of slideData.objects) {
        switch (obj.type) {
          case 'textbox':
          case 'i-text':
            addTextbox(s, obj);
            break;
          case 'rect':
            addRect(s, obj);
            break;
          case 'line':
            addLine(s, obj);
            break;
          case 'polygon':
            addPolygon(s, obj);
            break;
          case 'image':
            addImage(s, obj);
            break;
          default:
            break; // unknown/unsupported object types are skipped, not fatal
        }
      }
    }
  }

  const result = await pres.write({ outputType: 'nodebuffer' });
  return result as Buffer;
}
