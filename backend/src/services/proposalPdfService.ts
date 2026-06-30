import PDFDocument from 'pdfkit';
import { IProposal } from '../models/Proposal';
import { ISettings } from '../models/Settings';

// Brand palette
const ORANGE = '#E8762C';
const YELLOW = '#F2B632';
const WHITE = '#FFFFFF';
const TEXT_DARK = '#2B2118';
const TEXT_MUTED = '#6B5D4F';
const CREAM = '#FFF8F0';
const CARD_BG = '#FFF3E8';
const CARD_BORDER = '#EAD9C8';

function fmtINR(n: number): string {
  return 'Rs.' + n.toLocaleString('en-IN');
}

function drawHexagonOutline(
  doc: PDFKit.PDFDocument, cx: number, cy: number, r: number, color: string, lw = 3
): void {
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  doc.save();
  doc.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < 6; i++) doc.lineTo(pts[i][0], pts[i][1]);
  doc.closePath();
  doc.lineWidth(lw).stroke(color);
  doc.restore();
}

function pageFooter(doc: PDFKit.PDFDocument, num: string): void {
  const y = doc.page.height - doc.page.margins.bottom - 14;
  doc.save();
  doc.font('Helvetica').fontSize(8).fillColor(TEXT_MUTED)
    .text(num, 0, y, { width: doc.page.width - 80, align: 'right', lineBreak: false });
  doc.restore();
}

function headerLines(doc: PDFKit.PDFDocument): void {
  const W = doc.page.width, M = 45;
  doc.save();
  doc.moveTo(M, 42).lineTo(W - M, 42).lineWidth(0.7).strokeColor(WHITE).strokeOpacity(0.4).stroke();
  doc.moveTo(M, doc.page.height - 42).lineTo(W - M, doc.page.height - 42).stroke();
  doc.strokeOpacity(1);
  doc.restore();
}

// ---- SLIDE 1: COVER ----
function addCover(doc: PDFKit.PDFDocument, proposal: IProposal, website: string): void {
  const W = doc.page.width, H = doc.page.height;
  doc.rect(0, 0, W, H).fill(ORANGE);
  headerLines(doc);
  drawHexagonOutline(doc, 0, H / 2 - 22, 52, YELLOW, 3.5);

  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(28)
    .text('Social Media Production', 68, H / 2 - 88, { width: W - 130 });
  doc.text('& Meta Ads Proposal', 68, H / 2 - 52, { width: W - 130 });
  doc.text(`for ${proposal.companyName}`, 68, H / 2 - 16, { width: W - 130 });

  doc.font('Helvetica').fontSize(13).fillColor('#FFE8D6')
    .text('by ', 68, H / 2 + 48, { continued: true })
    .font('Helvetica-Bold').fillColor(WHITE).text(website, { lineBreak: false });
}

// ---- SLIDE 2: PROJECT OBJECTIVE ----
function addObjective(doc: PDFKit.PDFDocument, proposal: IProposal, website: string): void {
  doc.addPage();
  const W = doc.page.width, M = 45;
  const cW = W - M * 2;

  doc.fillColor(TEXT_DARK).font('Helvetica-Bold').fontSize(22)
    .text('Project Objective', M, 42);

  // Cream box
  doc.roundedRect(M, 80, cW, 120, 8).fill(CREAM);
  doc.fillColor(TEXT_DARK).font('Helvetica').fontSize(15)
    .text(
      `To produce high-quality Instagram Reels that showcase ${proposal.companyName}, craftsmanship, and brand value while improving reach and engagement across social media platforms.`,
      M + 28, 100, { width: cW - 56, lineGap: 4 }
    );

  // Callout cards
  const cardY = 220, cardW = (cW - 18) / 2;
  [
    { label: 'OUR PORTFOLIO', val: 'behance.net/whiteberrys' },
    { label: 'OUR OFFICIAL WEBSITE', val: website },
  ].forEach((c, i) => {
    const x = M + i * (cardW + 18);
    doc.roundedRect(x, cardY, cardW, 68, 6).fillAndStroke(WHITE, CARD_BORDER);
    doc.fillColor(TEXT_MUTED).font('Helvetica-Bold').fontSize(9).text(c.label, x + 16, cardY + 14);
    doc.fillColor(ORANGE).font('Helvetica-Bold').fontSize(15).text(c.val, x + 16, cardY + 34, { width: cardW - 32 });
  });

  pageFooter(doc, '02');
}

// ---- SLIDE 3: MONTHLY VIDEO PACKAGE ----
function addVideoPackage(doc: PDFKit.PDFDocument, proposal: IProposal): void {
  doc.addPage();
  const W = doc.page.width, M = 45;
  const cW = W - M * 2;

  doc.fillColor(TEXT_DARK).font('Helvetica-Bold').fontSize(20)
    .text(`Monthly Video Package \u2014 ${proposal.companyName}`, M, 38, { width: cW });

  // Price banner
  doc.roundedRect(M, 72, cW, 52, 7).fill(ORANGE);
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(16)
    .text(proposal.videoCount || '12 Videos / Month', M + 18, 90);
  doc.font('Helvetica-Bold').fontSize(18).fillColor(WHITE)
    .text(`${fmtINR(proposal.monthlyPrice)}`, W - M - 200, 84, { width: 130, align: 'right', lineBreak: false });
  doc.font('Helvetica').fontSize(12).fillColor('#FFE8D6')
    .text(' Monthly', { continued: false, lineBreak: false });

  // 4 video type cards (2x2)
  const videoTypes = [
    { title: 'Artist Team Videos', bullets: ['Creative cinematic product showcase', 'Professional lighting and storytelling', 'Focus on tile designs and aesthetic appeal'] },
    { title: 'Site Videos (Work Process)', bullets: ['Real footage', 'Behind-the-scenes work process', 'Builds customer trust and authenticity'] },
    { title: 'Trending Videos', bullets: ['Social media trend-based content', 'Designed to increase reach and engagement'] },
    { title: 'Presenter Videos', bullets: ['Presenter explaining products', 'Customer content', 'Product highlighting videos'] },
  ];
  const cw2 = (cW - 12) / 2, ch2 = 118, gx2 = 12, sy2 = 138, gy2 = 10;

  videoTypes.forEach((vt, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = M + col * (cw2 + gx2);
    const y = sy2 + row * (ch2 + gy2);

    doc.roundedRect(x, y, cw2, ch2, 6).fillAndStroke(CARD_BG, CARD_BORDER);
    doc.circle(x + 24, y + 24, 16).fill(ORANGE);
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(12)
      .text(String(i + 1), x + 17, y + 16);
    doc.fillColor(TEXT_DARK).font('Helvetica-Bold').fontSize(12)
      .text(vt.title, x + 52, y + 14, { width: cw2 - 62 });
    doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(9.5);
    vt.bullets.forEach((b, bi) => {
      doc.text(`- ${b}`, x + 16, y + 48 + bi * 18, { width: cw2 - 28, lineGap: 2 });
    });
  });

  // Includes strip
  const incY = sy2 + 2 * ch2 + gy2 + 10;
  doc.roundedRect(M, incY, cW, 36, 5).fill(CREAM);
  const includes = ['Content planning', 'Script & concept', 'Professional shooting', 'Video editing', 'Optimized delivery'];
  const segW2 = cW / includes.length;
  doc.fillColor(TEXT_DARK).font('Helvetica').fontSize(9);
  includes.forEach((t, i) => {
    doc.text(`+ ${t}`, M + i * segW2, incY + 11, { width: segW2, align: 'center', lineBreak: false });
  });

  pageFooter(doc, '03');
}

// ---- SLIDE 4: META ADS SERVICES (DYNAMIC) ----
function addMetaAds(doc: PDFKit.PDFDocument, proposal: IProposal): void {
  doc.addPage();
  const W = doc.page.width, M = 45;
  const cW = W - M * 2;

  doc.fillColor(TEXT_DARK).font('Helvetica-Bold').fontSize(20)
    .text('Our Core Services & Charges (Meta Ads)', M, 38, { width: cW });
  doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(11)
    .text('Meta & Google Ads Management Services', M, 64);

  const services = [...proposal.services].sort((a, b) => a.order - b.order);
  const count = services.length;
  const cols = Math.min(3, count);
  const rows = Math.ceil(count / cols);
  const cw3 = (cW - (cols - 1) * 10) / cols;
  const chargeH = 58;
  const availH = doc.page.height - doc.page.margins.bottom - 84 - chargeH - 20;
  const ch3 = Math.min(140, Math.floor(availH / rows) - 10);
  const sy3 = 84;

  services.forEach((svc, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = M + col * (cw3 + 10);
    const y = sy3 + row * (ch3 + 10);

    doc.roundedRect(x, y, cw3, ch3, 6).fillAndStroke(CARD_BG, CARD_BORDER);
    doc.circle(x + 20, y + 22, 13).fill(WHITE).stroke(ORANGE);
    doc.fillColor(ORANGE).font('Helvetica-Bold').fontSize(9)
      .text(String(i + 1), x + 13, y + 16, { width: 14, align: 'center' });
    doc.fillColor(TEXT_DARK).font('Helvetica-Bold').fontSize(10.5)
      .text(svc.name, x + 12, y + 42, { width: cw3 - 20 });

    const maxBullets = Math.max(1, Math.floor((ch3 - 65) / 16));
    const bullets = svc.bullets.slice(0, maxBullets);
    doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(8.5);
    bullets.forEach((b, bi) => {
      doc.text(`- ${b}`, x + 12, y + 64 + bi * 16, { width: cw3 - 22, lineGap: 1 });
    });
  });

  // Charges banner
  const chargeY = doc.page.height - doc.page.margins.bottom - chargeH - 10;
  doc.roundedRect(M, chargeY, cW, chargeH, 7).fill(ORANGE);
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(12)
    .text('Monthly charges', M + 14, chargeY + 20);
  doc.moveTo(M + 160, chargeY + 10).lineTo(M + 160, chargeY + chargeH - 10)
    .strokeColor(WHITE).strokeOpacity(0.4).lineWidth(1).stroke().strokeOpacity(1);

  doc.fillColor('#FFE8D6').font('Helvetica').fontSize(9.5)
    .text(`Below ${fmtINR(proposal.belowAdSpend)} monthly ad spend`, M + 172, chargeY + 12);
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(15)
    .text(`${fmtINR(proposal.monthlyCharge)} / month`, M + 172, chargeY + 30);

  doc.moveTo(M + 390, chargeY + 10).lineTo(M + 390, chargeY + chargeH - 10)
    .strokeColor(WHITE).strokeOpacity(0.4).stroke().strokeOpacity(1);

  doc.fillColor('#FFE8D6').font('Helvetica').fontSize(9.5)
    .text(`Above ${fmtINR(proposal.aboveAdSpend)} monthly ad spend`, M + 402, chargeY + 12);
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(15)
    .text(`${proposal.percentageCharge}% of monthly spend`, M + 402, chargeY + 30);

  pageFooter(doc, '04');
}

// ---- SLIDE 5: PRODUCTION EQUIPMENT (FIXED) ----
function addEquipment(doc: PDFKit.PDFDocument): void {
  doc.addPage();
  const W = doc.page.width, M = 45;
  const cW = W - M * 2;

  doc.fillColor(TEXT_DARK).font('Helvetica-Bold').fontSize(22).text('Production Equipment', M, 42);

  const equipment = [
    { name: 'Sony A7M4', desc: 'Professional mirrorless camera' },
    { name: 'Godox LC500', desc: 'LED lighting system' },
    { name: 'Nanlite BI 300', desc: 'Studio lighting (used when required)' },
    { name: 'Professional Focus Lights', desc: 'For precise, polished cinematic shots' },
  ];

  const cw4 = (cW - 3 * 12) / 4, ch4 = 200, sy4 = 100;

  equipment.forEach((e, i) => {
    const x = M + i * (cw4 + 12);
    doc.roundedRect(x, sy4, cw4, ch4, 8).fillAndStroke(CARD_BG, CARD_BORDER);
    doc.circle(x + cw4 / 2, sy4 + 45, 30).fill(ORANGE);
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(20)
      .text('\uD83D\uDCF7', x, sy4 + 30, { width: cw4, align: 'center' });
    doc.fillColor(TEXT_DARK).font('Helvetica-Bold').fontSize(12)
      .text(e.name, x + 8, sy4 + 95, { width: cw4 - 16, align: 'center' });
    doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(9.5)
      .text(e.desc, x + 10, sy4 + 118, { width: cw4 - 20, align: 'center', lineGap: 3 });
  });

  pageFooter(doc, '05');
}

// ---- SLIDE 6: CASE STUDIES (FIXED) ----
function addCaseStudies(doc: PDFKit.PDFDocument): void {
  doc.addPage();
  const W = doc.page.width, M = 45;
  const cW = W - M * 2;

  doc.fillColor(TEXT_DARK).font('Helvetica-Bold').fontSize(22).text('Our Recent Case Studies', M, 42);

  const cases = [
    { name: 'Naatus India', url: 'propelbees.com/case-study/naatusakkarai-casestudy/' },
    { name: 'Pandian Ecoxpods', url: 'propelbees.com/case-study/pandianecoxpods-casestudy/' },
    { name: 'GB Pack', url: 'propelbees.com/case-study/gbpack-casestudy/' },
    { name: 'Charu Multispeciality', url: 'propelbees.com/case-study/charudental-casestudy/' },
  ];

  const cw5 = (cW - 3 * 12) / 4;
  cases.forEach((c, i) => {
    const x = M + i * (cw5 + 12);
    doc.roundedRect(x, 90, cw5, 72, 6).fillAndStroke(CARD_BG, CARD_BORDER);
    doc.fillColor(TEXT_DARK).font('Helvetica-Bold').fontSize(11).text(c.name, x + 12, 104, { width: cw5 - 24 });
    doc.fillColor(ORANGE).font('Helvetica').fontSize(8).text(c.url, x + 12, 126, { width: cw5 - 24 });
  });

  pageFooter(doc, '06');
}

// ---- SLIDE 7: BRANDS (FIXED) ----
function addBrands(doc: PDFKit.PDFDocument): void {
  doc.addPage();
  const W = doc.page.width, M = 45;
  const cW = W - M * 2;

  doc.fillColor(TEXT_DARK).font('Helvetica-Bold').fontSize(22).text('Brands We Collaborate With', M, 42);
  doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(9).text('TRUSTED BY TOP BRANDS & GROWING BUSINESSES', M, 72);

  const brands = ['Naalu Sakkarai', 'Eco Pods', 'GB Pack', 'Steeris', "Dr. Charu's", 'MSM Holidays', 'Exoticamp', 'Sri Srinivasa Maruthuvar', "Jyothi's", 'The Sheriff Dental', 'Tiny Bee'];
  const perRow = 5, bw = cW / perRow - 8, bh = 38, bsy = 92;

  brands.forEach((b, i) => {
    const col = i % perRow, row = Math.floor(i / perRow);
    const x = M + col * (bw + 8);
    const y = bsy + row * (bh + 8);
    doc.roundedRect(x, y, bw, bh, 5).fillAndStroke(WHITE, CARD_BORDER);
    doc.fillColor(TEXT_DARK).font('Helvetica').fontSize(9)
      .text(b, x + 4, y + bh / 2 - 5, { width: bw - 8, align: 'center' });
  });

  const dpY = bsy + 2 * (bh + 8) + 14;
  doc.fillColor(TEXT_MUTED).font('Helvetica-Bold').fontSize(9).text('DIGITAL PRODUCTS WE BUILD', M, dpY);
  ['Ecartu', 'Ecartu Billing', 'Whiteberry Ads'].forEach((p, i) => {
    const x = M + i * (160);
    doc.roundedRect(x, dpY + 20, 150, bh, 5).fillAndStroke(WHITE, CARD_BORDER);
    doc.fillColor(TEXT_DARK).font('Helvetica').fontSize(9)
      .text(p, x + 4, dpY + 20 + bh / 2 - 5, { width: 142, align: 'center' });
  });

  pageFooter(doc, '07');
}

// ---- SLIDE 8: THANK YOU (FIXED) ----
function addThankYou(doc: PDFKit.PDFDocument, website: string): void {
  doc.addPage();
  const W = doc.page.width, H = doc.page.height;
  doc.rect(0, 0, W, H).fill(ORANGE);

  drawHexagonOutline(doc, W / 2, H / 2 - 90, 46, YELLOW, 3);

  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(34)
    .text('Thank You!', 0, H / 2 - 40, { width: W, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(15)
    .text('PROPELBEES', 0, H / 2 + 12, { width: W, align: 'center' });
  doc.font('Helvetica').fontSize(12).fillColor('#FFE8D6')
    .text('Social Media Production \u00B7 Branding \u00B7 SEO \u00B7 AEO \u00B7 Meta & Google Ads', 0, H / 2 + 42, { width: W, align: 'center' });
  doc.fontSize(11)
    .text(website, 0, H / 2 + 72, { width: W, align: 'center' });
}

// ============================================================
// MAIN EXPORT: Generate proposal PDF
// ============================================================
export async function generateProposalPDF(proposal: IProposal, settings: ISettings | null): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 40,
    });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const company = settings?.company;
    const website = company?.website || 'propelbees.com';

    addCover(doc, proposal, website);
    addObjective(doc, proposal, website);
    addVideoPackage(doc, proposal);
    addMetaAds(doc, proposal);
    addEquipment(doc);
    addCaseStudies(doc);
    addBrands(doc);
    addThankYou(doc, website);

    doc.end();
  });
}
