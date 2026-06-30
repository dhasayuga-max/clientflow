import PptxGenJS from 'pptxgenjs';
import { IProposal, IServiceCategory } from '../models/Proposal';
import { ISettings } from '../models/Settings';

// ---- Brand palette (exact match to Propelbees template) ----
const ORANGE = 'E8762C';
const YELLOW = 'F2B632';
const WHITE = 'FFFFFF';
const TEXT_DARK = '2B2118';
const TEXT_MUTED = '6B5D4F';
const CREAM = 'FFF8F0';
const CARD_BG = 'FFF3E8';
const CARD_BORDER = 'EAD9C8';

const W = 13.33;
const H = 7.5;

function fmtINR(n: number): string {
  return '\u20B9' + n.toLocaleString('en-IN');
}

function drawHexOutline(slide: PptxGenJS.Slide, cx: number, cy: number, r: number, color: string, lineW: number): void {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    pts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  slide.addShape('hexagon' as PptxGenJS.SHAPE_NAME, {
    x: cx - r, y: cy - r, w: r * 2, h: r * 2,
    fill: { type: 'none' },
    line: { color, width: lineW * 0.75 },
  });
}

function addHeaderFooterLines(slide: PptxGenJS.Slide): void {
  slide.addShape('rect' as PptxGenJS.SHAPE_NAME, {
    x: 0.55, y: 0.55, w: W - 1.1, h: 0.01,
    fill: { color: WHITE }, line: { color: WHITE, width: 1, transparency: 40 },
  });
  slide.addShape('rect' as PptxGenJS.SHAPE_NAME, {
    x: 0.55, y: H - 0.55, w: W - 1.1, h: 0.01,
    fill: { color: WHITE }, line: { color: WHITE, width: 1, transparency: 40 },
  });
}

// ============================================================
// SLIDE 1: COVER
// ============================================================
function addCoverSlide(pres: PptxGenJS, proposal: IProposal, company: ISettings['company'] | undefined): void {
  const slide = pres.addSlide();
  slide.background = { color: ORANGE };

  addHeaderFooterLines(slide);

  // Yellow hexagon outline (left side, partially cropped)
  drawHexOutline(slide, 0.15, H / 2 - 0.3, 0.72, YELLOW, 4);

  // Main title
  slide.addText(
    [
      { text: 'Social Media Production\n& Meta Ads Proposal\n', options: { breakLine: true } },
      { text: `for ${proposal.companyName}`, options: {} },
    ],
    {
      x: 0.9, y: 1.7, w: 9.5, h: 2.8,
      fontFace: 'Arial', bold: true, fontSize: 36,
      color: WHITE, align: 'left', valign: 'top',
      lineSpacingMultiple: 1.1,
    }
  );

  // "by propelbees.com"
  slide.addText(
    [
      { text: 'by ', options: { bold: false, color: 'FFE8D6' } },
      { text: company?.website || 'propelbees.com', options: { bold: true, color: WHITE } },
    ],
    { x: 0.9, y: 4.9, w: 7, h: 0.5, fontFace: 'Arial', fontSize: 16, align: 'left' }
  );
}

// ============================================================
// SLIDE 2: PROJECT OBJECTIVE
// ============================================================
function addObjectiveSlide(pres: PptxGenJS, proposal: IProposal, company: ISettings['company'] | undefined): void {
  const slide = pres.addSlide();
  slide.background = { color: WHITE };

  slide.addText('Project Objective', {
    x: 0.6, y: 0.5, w: 10, h: 0.55,
    fontFace: 'Arial', bold: true, fontSize: 26, color: TEXT_DARK,
  });

  // Cream objective box
  slide.addShape('roundRect' as PptxGenJS.SHAPE_NAME, {
    x: 0.6, y: 1.2, w: W - 1.2, h: 2.4, rectRadius: 0.1,
    fill: { color: CREAM }, line: { type: 'none' },
  });

  slide.addText(
    `To produce high-quality Instagram Reels that showcase ${proposal.companyName}, craftsmanship, and brand value while improving reach and engagement across social media platforms.`,
    {
      x: 0.95, y: 1.55, w: W - 1.9, h: 1.6,
      fontFace: 'Arial', fontSize: 17, color: TEXT_DARK,
      align: 'left', valign: 'top', lineSpacingMultiple: 1.35,
    }
  );

  // Portfolio/website callout cards
  const callY = 4.0;
  const cards = [
    { label: 'OUR PORTFOLIO', val: 'behance.net/whiteberrys' },
    { label: 'OUR OFFICIAL WEBSITE', val: company?.website || 'propelbees.com' },
  ];
  cards.forEach((c, i) => {
    const x = 0.6 + i * 6.1;
    slide.addShape('roundRect' as PptxGenJS.SHAPE_NAME, {
      x, y: callY, w: 5.85, h: 1.1, rectRadius: 0.08,
      fill: { color: WHITE }, line: { color: CARD_BORDER, width: 1 },
    });
    slide.addText(c.label, {
      x: x + 0.3, y: callY + 0.18, w: 5.3, h: 0.28,
      fontFace: 'Arial', bold: true, fontSize: 10, color: TEXT_MUTED, charSpacing: 1,
    });
    slide.addText(c.val, {
      x: x + 0.3, y: callY + 0.52, w: 5.3, h: 0.42,
      fontFace: 'Arial', bold: true, fontSize: 16, color: ORANGE,
    });
  });

  slide.addText('02', {
    x: W - 0.9, y: H - 0.5, w: 0.5, h: 0.3,
    fontFace: 'Arial', fontSize: 11, color: TEXT_MUTED, align: 'right',
  });
}

// ============================================================
// SLIDE 3: MONTHLY VIDEO PACKAGE
// ============================================================
function addVideoPackageSlide(pres: PptxGenJS, proposal: IProposal): void {
  const slide = pres.addSlide();
  slide.background = { color: WHITE };

  slide.addText(`Monthly Video Package \u2014 ${proposal.companyName}`, {
    x: 0.6, y: 0.42, w: W - 1.2, h: 0.5,
    fontFace: 'Arial', bold: true, fontSize: 22, color: TEXT_DARK,
  });

  // Orange price banner
  slide.addShape('roundRect' as PptxGenJS.SHAPE_NAME, {
    x: 0.6, y: 1.0, w: W - 1.2, h: 0.82, rectRadius: 0.08,
    fill: { color: ORANGE }, line: { type: 'none' },
  });
  slide.addText(proposal.videoCount || '12 Videos / Month', {
    x: 0.85, y: 1.0, w: 5, h: 0.82,
    fontFace: 'Arial', bold: true, fontSize: 18, color: WHITE, valign: 'middle',
  });
  slide.addText(
    [
      { text: `${fmtINR(proposal.monthlyPrice)} `, options: { bold: true, fontSize: 22, color: WHITE } },
      { text: 'Monthly', options: { fontSize: 14, color: 'FFE8D6' } },
    ],
    { x: 7.0, y: 1.0, w: 5.73, h: 0.82, align: 'right', valign: 'middle', fontFace: 'Arial' }
  );

  // 4 video type cards (2×2 grid)
  const videoTypes = [
    { title: 'Artist Team Videos', bullets: ['Creative cinematic product showcase', 'Professional lighting and storytelling', 'Focus on tile designs and aesthetic appeal'] },
    { title: 'Site Videos (Work Process)', bullets: ['Real footage', 'Behind-the-scenes work process', 'Builds customer trust and authenticity'] },
    { title: 'Trending Videos', bullets: ['Social media trend-based content', 'Designed to increase reach and engagement'] },
    { title: 'Presenter Videos', bullets: ['Presenter explaining products', 'Customer content', 'Product highlighting videos'] },
  ];

  const cw = 5.88, ch = 2.05, gx = 0.18, gy = 0.2, sx = 0.6, sy = 2.0;
  videoTypes.forEach((vt, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = sx + col * (cw + gx);
    const y = sy + row * (ch + gy);

    slide.addShape('roundRect' as PptxGenJS.SHAPE_NAME, {
      x, y, w: cw, h: ch, rectRadius: 0.08,
      fill: { color: CARD_BG }, line: { color: CARD_BORDER, width: 1 },
    });

    // Orange dot
    slide.addShape('ellipse' as PptxGenJS.SHAPE_NAME, {
      x: x + 0.22, y: y + 0.18, w: 0.48, h: 0.48,
      fill: { color: ORANGE }, line: { type: 'none' },
    });

    // Number in dot
    slide.addText(String(i + 1), {
      x: x + 0.22, y: y + 0.18, w: 0.48, h: 0.48,
      fontFace: 'Arial', bold: true, fontSize: 13, color: WHITE, align: 'center', valign: 'middle',
    });

    slide.addText(vt.title, {
      x: x + 0.85, y: y + 0.18, w: cw - 1.0, h: 0.38,
      fontFace: 'Arial', bold: true, fontSize: 13, color: TEXT_DARK, valign: 'middle',
    });

    slide.addText(
      vt.bullets.map((b, bi) => ({
        text: b,
        options: {
          bullet: { code: '25B8', indent: 12 },
          breakLine: bi < vt.bullets.length - 1,
          color: TEXT_MUTED,
        },
      })),
      { x: x + 0.28, y: y + 0.68, w: cw - 0.55, h: ch - 0.8, fontFace: 'Arial', fontSize: 10, valign: 'top', lineSpacingMultiple: 1.2 }
    );
  });

  // Includes strip
  const includeY = sy + 2 * ch + gy + 0.22;
  slide.addShape('roundRect' as PptxGenJS.SHAPE_NAME, {
    x: 0.6, y: includeY, w: W - 1.2, h: 0.52, rectRadius: 0.06,
    fill: { color: CREAM }, line: { type: 'none' },
  });
  const includes = ['Content planning', 'Script & concept creation', 'Professional shooting', 'Video editing', 'Final optimized delivery'];
  const segW = (W - 1.2) / includes.length;
  includes.forEach((txt, i) => {
    slide.addText(`\u2713 ${txt}`, {
      x: 0.6 + i * segW, y: includeY, w: segW, h: 0.52,
      fontFace: 'Arial', fontSize: 9.5, color: TEXT_DARK, valign: 'middle', align: 'center',
    });
  });

  slide.addText('03', {
    x: W - 0.9, y: H - 0.5, w: 0.5, h: 0.3,
    fontFace: 'Arial', fontSize: 11, color: TEXT_MUTED, align: 'right',
  });
}

// ============================================================
// SLIDE 4: META ADS SERVICES (DYNAMIC)
// ============================================================
function addMetaAdsSlide(pres: PptxGenJS, proposal: IProposal): void {
  const slide = pres.addSlide();
  slide.background = { color: WHITE };

  slide.addText('Our Core Services & Charges (Meta Ads)', {
    x: 0.6, y: 0.42, w: W - 1.2, h: 0.5,
    fontFace: 'Arial', bold: true, fontSize: 22, color: TEXT_DARK,
  });
  slide.addText('Meta & Google Ads Management Services', {
    x: 0.6, y: 0.88, w: W - 1.2, h: 0.3,
    fontFace: 'Arial', fontSize: 12, color: TEXT_MUTED,
  });

  const services = [...proposal.services].sort((a, b) => a.order - b.order);
  const count = services.length;

  // Determine grid: max 3 cols, rows as needed
  const cols = Math.min(3, count);
  const rows = Math.ceil(count / cols);
  const cw = (W - 1.2 - (cols - 1) * 0.15) / cols;
  const sy = 1.32;
  const availH = H - sy - 1.15; // reserve bottom for charges banner
  const ch = Math.min(2.0, availH / rows - 0.15);

  services.forEach((svc, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 0.6 + col * (cw + 0.15);
    const y = sy + row * (ch + 0.15);

    slide.addShape('roundRect' as PptxGenJS.SHAPE_NAME, {
      x, y, w: cw, h: ch, rectRadius: 0.08,
      fill: { color: CARD_BG }, line: { color: CARD_BORDER, width: 1 },
    });

    // Icon circle
    slide.addShape('ellipse' as PptxGenJS.SHAPE_NAME, {
      x: x + 0.2, y: y + 0.14, w: 0.4, h: 0.4,
      fill: { color: WHITE }, line: { color: ORANGE, width: 1.25 },
    });
    slide.addText(String(i + 1), {
      x: x + 0.2, y: y + 0.14, w: 0.4, h: 0.4,
      fontFace: 'Arial', bold: true, fontSize: 10, color: ORANGE, align: 'center', valign: 'middle',
    });

    slide.addText(svc.name, {
      x: x + 0.15, y: y + 0.58, w: cw - 0.3, h: 0.36,
      fontFace: 'Arial', bold: true, fontSize: 11, color: TEXT_DARK,
    });

    const maxBullets = Math.max(1, Math.floor((ch - 1.05) / 0.22));
    const bulletsToShow = svc.bullets.slice(0, maxBullets);
    slide.addText(
      bulletsToShow.map((b, bi) => ({
        text: b,
        options: { bullet: { code: '25B8', indent: 10 }, breakLine: bi < bulletsToShow.length - 1, color: TEXT_MUTED },
      })),
      { x: x + 0.15, y: y + 0.96, w: cw - 0.3, h: ch - 1.08, fontFace: 'Arial', fontSize: 9, valign: 'top', lineSpacingMultiple: 1.1 }
    );
  });

  // Monthly charges banner
  const chargeY = H - 1.05;
  slide.addShape('roundRect' as PptxGenJS.SHAPE_NAME, {
    x: 0.6, y: chargeY, w: W - 1.2, h: 0.9, rectRadius: 0.08,
    fill: { color: ORANGE }, line: { type: 'none' },
  });
  slide.addText('Monthly charges', {
    x: 0.85, y: chargeY, w: 2.6, h: 0.9,
    fontFace: 'Arial', bold: true, fontSize: 13, color: WHITE, valign: 'middle',
  });
  // Divider line
  slide.addShape('line' as PptxGenJS.SHAPE_NAME, {
    x: 3.65, y: chargeY + 0.15, w: 0, h: 0.6,
    line: { color: WHITE, width: 1, transparency: 50 },
  });
  slide.addText(
    [
      { text: `Below ${fmtINR(proposal.belowAdSpend)} monthly ad spend\n`, options: { fontSize: 10.5, color: 'FFE8D6', breakLine: true } },
      { text: `${fmtINR(proposal.monthlyCharge)} / month`, options: { fontSize: 16, bold: true, color: WHITE } },
    ],
    { x: 3.9, y: chargeY, w: 4.0, h: 0.9, fontFace: 'Arial', valign: 'middle' }
  );
  slide.addShape('line' as PptxGenJS.SHAPE_NAME, {
    x: 8.15, y: chargeY + 0.15, w: 0, h: 0.6,
    line: { color: WHITE, width: 1, transparency: 50 },
  });
  slide.addText(
    [
      { text: `Above ${fmtINR(proposal.aboveAdSpend)} monthly ad spend\n`, options: { fontSize: 10.5, color: 'FFE8D6', breakLine: true } },
      { text: `${proposal.percentageCharge}% of monthly spend`, options: { fontSize: 16, bold: true, color: WHITE } },
    ],
    { x: 8.4, y: chargeY, w: 4.5, h: 0.9, fontFace: 'Arial', valign: 'middle' }
  );

  slide.addText('04', {
    x: W - 0.9, y: H - 0.5, w: 0.5, h: 0.3,
    fontFace: 'Arial', fontSize: 11, color: TEXT_MUTED, align: 'right',
  });
}

// ============================================================
// SLIDE 5: PRODUCTION EQUIPMENT (FIXED)
// ============================================================
function addEquipmentSlide(pres: PptxGenJS): void {
  const slide = pres.addSlide();
  slide.background = { color: WHITE };

  slide.addText('Production Equipment', {
    x: 0.6, y: 0.5, w: 10, h: 0.55,
    fontFace: 'Arial', bold: true, fontSize: 26, color: TEXT_DARK,
  });

  const equipment = [
    { name: 'Sony A7M4', desc: 'Professional mirrorless camera' },
    { name: 'Godox LC500', desc: 'LED lighting system' },
    { name: 'Nanlite BI 300', desc: 'Studio lighting (used when required)' },
    { name: 'Professional Focus Lights', desc: 'For precise, polished cinematic shots' },
  ];

  const cw = 2.85, ch = 3.0, gap = 0.2, sx = 0.6, sy = 1.65;
  equipment.forEach((e, i) => {
    const x = sx + i * (cw + gap);

    slide.addShape('roundRect' as PptxGenJS.SHAPE_NAME, {
      x, y: sy, w: cw, h: ch, rectRadius: 0.1,
      fill: { color: CARD_BG }, line: { color: CARD_BORDER, width: 1 },
    });
    slide.addShape('ellipse' as PptxGenJS.SHAPE_NAME, {
      x: x + (cw - 0.75) / 2, y: sy + 0.38, w: 0.75, h: 0.75,
      fill: { color: ORANGE }, line: { type: 'none' },
    });
    // Camera icon character
    slide.addText('\uD83D\uDCF7', {
      x: x + (cw - 0.75) / 2, y: sy + 0.42, w: 0.75, h: 0.7,
      fontSize: 18, align: 'center', valign: 'middle',
    });
    slide.addText(e.name, {
      x: x + 0.15, y: sy + 1.42, w: cw - 0.3, h: 0.5,
      fontFace: 'Arial', bold: true, fontSize: 13, color: TEXT_DARK, align: 'center',
    });
    slide.addText(e.desc, {
      x: x + 0.2, y: sy + 1.95, w: cw - 0.4, h: 0.85,
      fontFace: 'Arial', fontSize: 10, color: TEXT_MUTED, align: 'center', lineSpacingMultiple: 1.2,
    });
  });

  slide.addText('05', {
    x: W - 0.9, y: H - 0.5, w: 0.5, h: 0.3,
    fontFace: 'Arial', fontSize: 11, color: TEXT_MUTED, align: 'right',
  });
}

// ============================================================
// SLIDE 6: CASE STUDIES (FIXED)
// ============================================================
function addCaseStudiesSlide(pres: PptxGenJS): void {
  const slide = pres.addSlide();
  slide.background = { color: WHITE };

  slide.addText('Our Recent Case Studies', {
    x: 0.6, y: 0.5, w: 10, h: 0.55,
    fontFace: 'Arial', bold: true, fontSize: 26, color: TEXT_DARK,
  });

  const cases = [
    { name: 'Naatus India', url: 'propelbees.com/case-study/naatusakkarai-casestudy/' },
    { name: 'Pandian Ecoxpods', url: 'propelbees.com/case-study/pandianecoxpods-casestudy/' },
    { name: 'GB Pack', url: 'propelbees.com/case-study/gbpack-casestudy/' },
    { name: 'Charu Multispeciality', url: 'propelbees.com/case-study/charudental-casestudy/' },
  ];

  const cw = 2.85, ch = 0.9, gx = 0.2, sy = 1.2;
  cases.forEach((c, i) => {
    const x = 0.6 + i * (cw + gx);
    slide.addShape('roundRect' as PptxGenJS.SHAPE_NAME, {
      x, y: sy, w: cw, h: ch, rectRadius: 0.08,
      fill: { color: CARD_BG }, line: { color: CARD_BORDER, width: 1 },
    });
    slide.addText(c.name, {
      x: x + 0.15, y: sy + 0.1, w: cw - 0.3, h: 0.38,
      fontFace: 'Arial', bold: true, fontSize: 12, color: TEXT_DARK,
    });
    slide.addText(c.url, {
      x: x + 0.15, y: sy + 0.52, w: cw - 0.3, h: 0.28,
      fontFace: 'Arial', fontSize: 8.5, color: ORANGE,
    });
  });

  slide.addText('06', {
    x: W - 0.9, y: H - 0.5, w: 0.5, h: 0.3,
    fontFace: 'Arial', fontSize: 11, color: TEXT_MUTED, align: 'right',
  });
}

// ============================================================
// SLIDE 7: BRANDS (FIXED)
// ============================================================
function addBrandsSlide(pres: PptxGenJS): void {
  const slide = pres.addSlide();
  slide.background = { color: WHITE };

  slide.addText('Brands We Collaborate With', {
    x: 0.6, y: 0.5, w: 10, h: 0.55,
    fontFace: 'Arial', bold: true, fontSize: 26, color: TEXT_DARK,
  });
  slide.addText('TRUSTED BY TOP BRANDS & GROWING BUSINESSES', {
    x: 0.6, y: 1.0, w: 12, h: 0.3,
    fontFace: 'Arial', fontSize: 10, color: TEXT_MUTED, charSpacing: 1,
  });

  const brands = ['Naalu Sakkarai', 'Eco Pods', 'GB Pack', 'Steeris', "Dr. Charu's", 'MSM Holidays', 'Exoticamp', 'Sri Srinivasa Maruthuvar', "Jyothi's", 'The Sheriff Dental', 'Tiny Bee'];
  const perRow = 5;
  const bw = 2.2, bh = 0.55, bgap = 0.12, bsx = 0.6, bsy = 1.45;

  brands.forEach((b, i) => {
    const col = i % perRow, row = Math.floor(i / perRow);
    const x = bsx + col * (bw + bgap);
    const y = bsy + row * (bh + bgap);
    slide.addShape('roundRect' as PptxGenJS.SHAPE_NAME, {
      x, y, w: bw, h: bh, rectRadius: 0.06,
      fill: { color: WHITE }, line: { color: CARD_BORDER, width: 1 },
    });
    slide.addText(b, {
      x: x + 0.08, y, w: bw - 0.16, h: bh,
      fontFace: 'Arial', fontSize: 9.5, color: TEXT_DARK, align: 'center', valign: 'middle',
    });
  });

  slide.addText('DIGITAL PRODUCTS WE BUILD', {
    x: 0.6, y: 4.52, w: 12, h: 0.28,
    fontFace: 'Arial', fontSize: 9.5, color: TEXT_MUTED, charSpacing: 1, bold: true,
  });
  ['Ecartu', 'Ecartu Billing', 'Whiteberry Ads'].forEach((p, i) => {
    const x = 0.6 + i * 2.32;
    slide.addShape('roundRect' as PptxGenJS.SHAPE_NAME, {
      x, y: 4.85, w: 2.1, h: 0.55, rectRadius: 0.06,
      fill: { color: WHITE }, line: { color: CARD_BORDER, width: 1 },
    });
    slide.addText(p, {
      x: x + 0.08, y: 4.85, w: 1.94, h: 0.55,
      fontFace: 'Arial', fontSize: 9.5, color: TEXT_DARK, align: 'center', valign: 'middle',
    });
  });

  slide.addText('07', {
    x: W - 0.9, y: H - 0.5, w: 0.5, h: 0.3,
    fontFace: 'Arial', fontSize: 11, color: TEXT_MUTED, align: 'right',
  });
}

// ============================================================
// SLIDE 8: THANK YOU (FIXED)
// ============================================================
function addThankYouSlide(pres: PptxGenJS, company: ISettings['company'] | undefined): void {
  const slide = pres.addSlide();
  slide.background = { color: ORANGE };

  // Yellow hexagon outline (center)
  drawHexOutline(slide, W / 2, 2.0, 0.65, YELLOW, 4);

  slide.addText('Thank You!', {
    x: 0, y: 2.85, w: W, h: 0.75,
    fontFace: 'Arial', bold: true, fontSize: 36, color: WHITE, align: 'center',
  });
  slide.addText('PROPELBEES', {
    x: 0, y: 3.72, w: W, h: 0.42,
    fontFace: 'Arial', bold: true, fontSize: 16, color: WHITE, align: 'center', charSpacing: 2,
  });
  slide.addText('Social Media Production \u00B7 Branding \u00B7 SEO \u00B7 AEO \u00B7 Meta & Google Ads', {
    x: 0, y: 4.25, w: W, h: 0.38,
    fontFace: 'Arial', fontSize: 13, color: 'FFE8D6', align: 'center',
  });
  slide.addText(company?.website || 'propelbees.com', {
    x: 0, y: 4.78, w: W, h: 0.38,
    fontFace: 'Arial', fontSize: 12, color: 'FFE8D6', align: 'center',
  });
}

// ============================================================
// MAIN EXPORT: Generate PPTX
// ============================================================
export async function generateProposalPPTX(proposal: IProposal, settings: ISettings | null): Promise<Buffer> {
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_WIDE';
  pres.author = 'Propelbees';
  pres.title = `Social Media Production & Meta Ads Proposal for ${proposal.companyName}`;

  const company = settings?.company;

  addCoverSlide(pres, proposal, company);
  addObjectiveSlide(pres, proposal, company);
  addVideoPackageSlide(pres, proposal);
  addMetaAdsSlide(pres, proposal);
  addEquipmentSlide(pres);
  addCaseStudiesSlide(pres);
  addBrandsSlide(pres);
  addThankYouSlide(pres, company);

  const result = await pres.write({ outputType: 'nodebuffer' });
  return result as Buffer;
}
