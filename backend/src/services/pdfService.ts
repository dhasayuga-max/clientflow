import PDFDocument from 'pdfkit';
import { IInvoice } from '../models/Invoice';
import { IProposal } from '../models/Proposal';
import { ISettings } from '../models/Settings';

function formatCurrency(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ============================================================
// Number to words (Indian numbering system: lakh/crore)
// ============================================================
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigitsToWords(n: number): string {
  if (n < 20) return ONES[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return TENS[tens] + (ones ? ' ' + ONES[ones] : '');
}

function threeDigitsToWords(n: number): string {
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  let result = '';
  if (hundred) result += ONES[hundred] + ' Hundred';
  if (rest) result += (hundred ? ' ' : '') + twoDigitsToWords(rest);
  return result;
}

function numberToIndianWords(num: number): string {
  if (num === 0) return 'Zero';
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const hundred = num;

  const parts: string[] = [];
  if (crore) parts.push(threeDigitsToWords(crore) + ' Crore');
  if (lakh) parts.push(threeDigitsToWords(lakh) + ' Lakh');
  if (thousand) parts.push(threeDigitsToWords(thousand) + ' Thousand');
  if (hundred) parts.push(threeDigitsToWords(hundred));

  return parts.join(' ');
}

function amountInWords(amount: number): string {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let words = numberToIndianWords(rupees) + ' Only';
  if (paise > 0) {
    words = numberToIndianWords(rupees) + ' and ' + numberToIndianWords(paise) + ' Paise Only';
  }
  return words;
}

// ============================================================
// Tax Invoice PDF — matches the Propelbees tax-invoice format
// ============================================================
const INV = {
  text: '#1A1A1A',
  muted: '#6B7280',
  amber: '#B8860B',
  green: '#15803D',
  red: '#DC2626',
  border: '#D1D5DB',
  headerBlue: '#1E3A5F',
};

export async function generateInvoicePDF(invoice: IInvoice, settings: ISettings | null): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const company = settings?.company || { name: 'Your Company', address: '', phone: '', state: '', gstNumber: '' };
    const W = doc.page.width;
    const M = 40;
    const contentW = W - M * 2;

    // Top-right E.&O.E
    doc.fillColor(INV.muted).fontSize(7).font('Helvetica').text('E. & O.E', W - M - 100, 16, { width: 100, align: 'right' });

    // Header: company name + details (left), TAX INVOICE (right)
    let y = 38;
    doc.fillColor(INV.text).font('Helvetica-Bold').fontSize(20).text(company.name || 'Your Company', M, y);
    doc.font('Helvetica-Bold').fontSize(16).fillColor(INV.text)
      .text('TAX INVOICE', M, y, { width: contentW, align: 'right' });
    doc.font('Helvetica-Oblique').fontSize(9).fillColor(INV.muted)
      .text('(Original for Recipient)', M, y + 20, { width: contentW, align: 'right' });

    y += 25;
    doc.font('Helvetica').fontSize(9).fillColor(INV.muted)
      .text(company.address || '', M, y, { width: 330 });
    y += doc.heightOfString(company.address || '', { width: 330 }) + 2;
    if (company.state) {
      doc.text(`State : ${company.state}`, M, y);
      y += 13;
    }
    const contactLine = [company.phone, company.email].filter(Boolean).join('  |  ');
    if (contactLine) doc.text(`Contact : ${contactLine}`, M, y);

    y += 25;
    doc.moveTo(M, y).lineTo(W - M, y).strokeColor(INV.border).lineWidth(1).stroke();

    // Info row: Invoice No / Date / Reference / Payment
    y += 12;
    const infoColW = contentW / 4;
    const infoCols = [
      { label: 'INVOICE NO.', value: invoice.invoiceNumber },
      { label: 'DATE', value: formatDate(invoice.invoiceDate) },
      { label: 'REFERENCE', value: invoice.reference || '-' },
      { label: 'PAYMENT', value: invoice.paymentMethod || '-' },
    ];
    infoCols.forEach((c, i) => {
      const x = M + i * infoColW;
      doc.font('Helvetica').fontSize(8).fillColor(INV.muted).text(c.label, x, y, { width: infoColW, align: 'center' });
      doc.font('Helvetica-Bold').fontSize(11).fillColor(INV.text).text(c.value, x, y + 13, { width: infoColW, align: 'center' });
    });

    y += 40;
    doc.moveTo(M, y).lineTo(W - M, y).strokeColor(INV.border).stroke();

    // Buyer / Contact details row
    y += 14;
    const halfW = contentW / 2 - 10;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(INV.amber).text('BUYER (BILL TO)', M, y);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(INV.amber).text('CONTACT DETAILS', M + halfW + 20, y);

    y += 14;
    doc.font('Helvetica-Bold').fontSize(12).fillColor(INV.text).text(invoice.companyName || invoice.clientName, M, y, { width: halfW });
    const buyerNameH = doc.heightOfString(invoice.companyName || invoice.clientName, { width: halfW });

    doc.font('Helvetica').fontSize(9).fillColor(INV.muted).text(`Phone: ${invoice.whatsappNumber}`, M + halfW + 20, y);
    let contactY = y + 13;
    if (invoice.state) {
      doc.text(`State : ${invoice.state}`, M + halfW + 20, contactY);
    }

    y += buyerNameH + 4;
    doc.font('Helvetica').fontSize(9).fillColor(INV.muted).text(invoice.address, M, y, { width: halfW });
    const addrH = doc.heightOfString(invoice.address, { width: halfW });

    y += Math.max(addrH, 30) + 14;
    doc.moveTo(M, y).lineTo(W - M, y).strokeColor(INV.border).stroke();

    // Services table
    y += 10;
    const cols = [
      { key: 'sn', label: 'S.N', w: 25, align: 'left' as const },
      { key: 'desc', label: 'DESCRIPTION OF GOODS', w: 160, align: 'left' as const },
      { key: 'hsn', label: 'HSN/SAC', w: 55, align: 'center' as const },
      { key: 'qty', label: 'QUANTITY', w: 60, align: 'center' as const },
      { key: 'rate', label: 'RATE', w: 75, align: 'right' as const },
      { key: 'per', label: 'PER', w: 55, align: 'center' as const },
      { key: 'amount', label: 'AMOUNT', w: 85, align: 'right' as const },
    ];
    let colX = M;
    const colPositions: number[] = [];
    cols.forEach((c) => { colPositions.push(colX); colX += c.w; });

    doc.font('Helvetica-Bold').fontSize(8).fillColor(INV.text);
    cols.forEach((c, i) => doc.text(c.label, colPositions[i], y, { width: c.w, align: c.align }));
    y += 14;
    doc.moveTo(M, y).lineTo(W - M, y).strokeColor(INV.border).stroke();
    y += 8;

    doc.font('Helvetica').fontSize(9).fillColor(INV.text);
    invoice.services.forEach((s, idx) => {
      const unit = s.unit || 'NOS';
      const rowVals = [
        String(idx + 1),
        s.serviceName,
        s.hsnSac || '-',
        `${s.quantity} ${unit}`,
        s.price.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
        unit,
        s.total.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      ];
      const descH = doc.heightOfString(s.serviceName, { width: cols[1].w });
      const rowH = Math.max(descH, 14);

      rowVals.forEach((v, i) => {
        doc.text(v, colPositions[i], y, { width: cols[i].w, align: cols[i].align });
      });
      y += rowH + 6;
    });

    doc.moveTo(M, y).lineTo(W - M, y).strokeColor(INV.border).stroke();
    y += 6;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(INV.text)
      .text(invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }), colPositions[6], y, { width: cols[6].w, align: 'right' });

    if (invoice.taxAmount > 0) {
      y += 16;
      doc.font('Helvetica').fontSize(9).fillColor(INV.muted)
        .text(`Tax (${invoice.taxRate}%)`, colPositions[4], y, { width: 150, align: 'right' });
      doc.font('Helvetica-Bold').fillColor(INV.text)
        .text(invoice.taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }), colPositions[6], y, { width: cols[6].w, align: 'right' });
    }

    y += 22;
    doc.moveTo(M, y).lineTo(W - M, y).strokeColor(INV.border).stroke();
    y += 10;

    // Paid amount / balance due
    doc.font('Helvetica-Bold').fontSize(9).fillColor(INV.green)
      .text('PAID AMOUNT', colPositions[4], y, { width: 150, align: 'right' });
    doc.fillColor(INV.green)
      .text(invoice.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }), colPositions[6], y, { width: cols[6].w, align: 'right' });

    y += 16;
    const balanceDue = invoice.totalAmount - invoice.paidAmount;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(balanceDue > 0 ? INV.red : INV.muted)
      .text('BALANCE DUE', colPositions[4], y, { width: 150, align: 'right' });
    doc.fillColor(balanceDue > 0 ? INV.red : INV.muted)
      .text(balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 }), colPositions[6], y, { width: cols[6].w, align: 'right' });

    y += 20;
    doc.moveTo(M, y).lineTo(W - M, y).strokeColor(INV.border).lineWidth(1.2).stroke();
    y += 8;

    // Total row
    const totalQty = invoice.services.reduce((sum, s) => sum + s.quantity, 0);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(INV.text)
      .text('Total', colPositions[3] - 40, y, { width: 40, align: 'right' });
    doc.text(`${totalQty} NOS`, colPositions[3], y, { width: cols[3].w, align: 'center' });
    doc.text(`Rs. ${invoice.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, colPositions[6], y, { width: cols[6].w, align: 'right' });

    y += 18;
    doc.moveTo(M, y).lineTo(W - M, y).strokeColor(INV.border).stroke();
    y += 12;

    // Amount in words
    doc.font('Helvetica').fontSize(8).fillColor(INV.muted).text('AMOUNT CHARGEABLE (IN WORDS)', M, y);
    y += 12;
    doc.font('Helvetica-Bold').fontSize(10).fillColor(INV.text)
      .text(`INR ${amountInWords(invoice.totalAmount)}`, M, y, { width: contentW - 80 });
    y += doc.heightOfString(`INR ${amountInWords(invoice.totalAmount)}`, { width: contentW - 80 }) + 6;

    doc.font('Helvetica').fontSize(8).fillColor(INV.muted)
      .text(`TAX AMOUNT (IN WORDS) : ${invoice.taxAmount > 0 ? amountInWords(invoice.taxAmount) : 'Zero Only'}`, M, y);

    y += 22;

    // Declaration + Bank details
    const declW = contentW * 0.55;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(INV.text).text('Declaration', M, y);
    doc.font('Helvetica-Oblique').fontSize(8).fillColor(INV.muted)
      .text('We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.', M, y + 13, { width: declW });

    const bankX = M + declW + 20;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(INV.text).text("Company's Bank Details", bankX, y);
    const bd = invoice.bankDetails || {};
    const bankLines = [
      ['Bank Name', bd.bankName || '--'],
      ['A/c No.', bd.accountNumber || '--'],
      ['Branch & IFSC', bd.branchIfsc || '--'],
    ];
    let bankY = y + 14;
    bankLines.forEach(([label, val]) => {
      doc.font('Helvetica').fontSize(8).fillColor(INV.muted).text(label, bankX, bankY, { width: 90 });
      doc.fillColor(INV.text).text(`: ${val}`, bankX + 90, bankY, { width: contentW - declW - 20 - 90 });
      bankY += 13;
    });

    y += 70;
    doc.moveTo(M, y).lineTo(W - M, y).strokeColor(INV.border).stroke();

    // Signatory
    y += 10;
    doc.font('Helvetica').fontSize(9).fillColor(INV.text)
      .text(`for ${company.name || 'Your Company'}`, M, y, { width: contentW, align: 'right' });
    y += 35;
    doc.font('Helvetica').fontSize(9).fillColor(INV.text)
      .text('Authorised Signatory', M, y, { width: contentW, align: 'right' });

    // Footer — must stay within the bottom margin boundary (page.height - bottomMargin)
    // to avoid PDFKit auto-creating a new page.
    const footerY = doc.page.height - doc.page.margins.bottom - 18;
    doc.moveTo(M, footerY - 8).lineTo(W - M, footerY - 8).strokeColor(INV.border).stroke();
    doc.font('Helvetica').fontSize(7.5).fillColor(INV.muted)
      .text('SUBJECT TO JURISDICTION', M, footerY, { width: contentW / 2, lineBreak: false });
    doc.text('This is a Computer Generated Invoice', M, footerY, { width: contentW, align: 'right', lineBreak: false });

    doc.end();
  });
}

// ============================================================
// Propelbees brand palette — used for proposal PDFs
// ============================================================
const BRAND = {
  orange: '#E8762C',
  orangeDark: '#C25E1E',
  cream: '#FCEFE3',
  yellow: '#F2B632',
  white: '#FFFFFF',
  textDark: '#2B2118',
  textMuted: '#6B5D4F',
  cardBg: '#FFF8F0',
  cardBorder: '#EAD9C8',
};

function drawHexagonOutline(doc: PDFKit.PDFDocument, cx: number, cy: number, r: number, color: string, lineWidth = 3): void {
  const points: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
  }
  doc.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < 6; i++) doc.lineTo(points[i][0], points[i][1]);
  doc.closePath();
  doc.lineWidth(lineWidth).stroke(color);
}

function drawCheckmark(doc: PDFKit.PDFDocument, cx: number, cy: number, size: number, color: string): void {
  // Draws a simple checkmark using vector strokes (avoids font glyph issues)
  const s = size;
  doc.save();
  doc.lineWidth(Math.max(1.5, s * 0.18)).strokeColor(color).lineCap('round').lineJoin('round');
  doc.moveTo(cx - s * 0.55, cy)
    .lineTo(cx - s * 0.15, cy + s * 0.4)
    .lineTo(cx + s * 0.6, cy - s * 0.45)
    .stroke();
  doc.restore();
}

function drawProposalFooter(doc: PDFKit.PDFDocument, pageNum: string): void {
  doc.fillColor(BRAND.textMuted).fontSize(9).font('Helvetica')
    .text(pageNum, doc.page.width - 70, doc.page.height - 40, { width: 30, align: 'right' });
}

function addCoverSlide(doc: PDFKit.PDFDocument, proposal: IProposal, company: ISettings['company'] | undefined): void {
  const W = doc.page.width, H = doc.page.height;
  doc.rect(0, 0, W, H).fill(BRAND.orange);

  drawHexagonOutline(doc, 0, H / 2 - 30, 65, BRAND.yellow, 4);

  doc.moveTo(70, 60).lineTo(W - 70, 60).lineWidth(1).strokeColor('#FFFFFF').strokeOpacity(0.4).stroke();
  doc.strokeOpacity(1);
  doc.moveTo(70, H - 60).lineTo(W - 70, H - 60).lineWidth(1).strokeColor('#FFFFFF').strokeOpacity(0.4).stroke();
  doc.strokeOpacity(1);

  doc.fillColor(BRAND.white).font('Helvetica-Bold').fontSize(30)
    .text('Business Proposal', 75, H / 2 - 90, { width: W - 200 });
  doc.fontSize(24).text(`for ${proposal.clientName}`, 75, H / 2 - 50, { width: W - 200 });
  doc.fontSize(16).font('Helvetica').fillColor('#FFE8D6')
    .text(proposal.companyName, 75, H / 2 - 10, { width: W - 200 });

  doc.fontSize(13).fillColor('#FFE8D6')
    .text('by ', 75, H / 2 + 60, { continued: true })
    .font('Helvetica-Bold').fillColor(BRAND.white)
    .text(company?.name || 'Your Agency');

  drawProposalFooter(doc, '01');
}

function addObjectiveSlide(doc: PDFKit.PDFDocument, proposal: IProposal, company: ISettings['company'] | undefined): void {
  doc.addPage();
  const W = doc.page.width;
  doc.rect(0, 0, W, doc.page.height).fill(BRAND.white);

  doc.fillColor(BRAND.textDark).font('Helvetica-Bold').fontSize(22).text('Project Objective', 60, 50);

  const objY = 100;
  doc.roundedRect(60, objY, W - 120, 130, 10).fill(BRAND.cream);

  const objectiveText = proposal.notes
    ? proposal.notes
    : `To deliver high-quality, results-driven work for ${proposal.clientName}, improving brand visibility, engagement, and growth across all relevant channels.`;

  doc.fillColor(BRAND.textDark).font('Helvetica').fontSize(13)
    .text(objectiveText, 95, objY + 25, { width: W - 230, lineGap: 5 });

  // accent circle
  doc.circle(W - 130, objY + 65, 32).fill(BRAND.orange);
  drawCheckmark(doc, W - 130, objY + 65, 18, BRAND.white);

  // contact callouts
  const calloutY = objY + 160;
  const calloutW = (W - 120 - 20) / 2;
  [
    { label: 'CLIENT EMAIL', value: proposal.email },
    { label: 'CLIENT PHONE', value: proposal.phone },
  ].forEach((item, i) => {
    const x = 60 + i * (calloutW + 20);
    doc.roundedRect(x, calloutY, calloutW, 70, 8).fillAndStroke(BRAND.white, BRAND.cardBorder);
    doc.fillColor(BRAND.textMuted).font('Helvetica-Bold').fontSize(9).text(item.label, x + 18, calloutY + 16);
    doc.fillColor(BRAND.orangeDark).font('Helvetica-Bold').fontSize(13).text(item.value, x + 18, calloutY + 36, { width: calloutW - 36 });
  });

  // company info footer block
  doc.fillColor(BRAND.textMuted).font('Helvetica').fontSize(9)
    .text(`Prepared by ${company?.name || 'our team'}${company?.website ? '  ·  ' + company.website : ''}`, 60, calloutY + 100);

  drawProposalFooter(doc, '02');
}

interface ServiceCard {
  name: string;
  description?: string;
  price: number;
}

function addServicesSlides(doc: PDFKit.PDFDocument, services: ServiceCard[], proposal: IProposal): void {
  const W = doc.page.width;
  const cardsPerPage = 4;
  const totalPages = Math.max(1, Math.ceil(services.length / cardsPerPage));

  for (let page = 0; page < totalPages; page++) {
    doc.addPage();
    doc.rect(0, 0, W, doc.page.height).fill(BRAND.white);

    doc.fillColor(BRAND.textDark).font('Helvetica-Bold').fontSize(22)
      .text(totalPages > 1 ? `Services & Pricing (${page + 1}/${totalPages})` : 'Services & Pricing', 60, 50);
    doc.fillColor(BRAND.textMuted).font('Helvetica').fontSize(11)
      .text(`Proposed for ${proposal.clientName}`, 60, 78);

    const pageServices = services.slice(page * cardsPerPage, page * cardsPerPage + cardsPerPage);

    const cardW = (W - 120 - 20) / 2;
    const cardH = 145;
    const startX = 60, startY = 115, gapX = 20, gapY = 20;

    pageServices.forEach((svc, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);

      doc.roundedRect(x, y, cardW, cardH, 8).fillAndStroke(BRAND.cardBg, BRAND.cardBorder);

      // icon circle
      doc.circle(x + 35, y + 35, 18).fill(BRAND.orange);
      drawCheckmark(doc, x + 35, y + 35, 11, BRAND.white);

      doc.fillColor(BRAND.textDark).font('Helvetica-Bold').fontSize(13)
        .text(svc.name, x + 65, y + 22, { width: cardW - 85 });

      if (svc.description) {
        doc.fillColor(BRAND.textMuted).font('Helvetica').fontSize(9.5)
          .text(svc.description, x + 20, y + 60, { width: cardW - 40, lineGap: 3, height: cardH - 95 });
      }

      // price footer inside card
      doc.fillColor(BRAND.orangeDark).font('Helvetica-Bold').fontSize(15)
        .text(formatCurrency(svc.price), x + 20, y + cardH - 32, { width: cardW - 40, align: 'right' });
    });

    drawProposalFooter(doc, String(page + 3).padStart(2, '0'));
  }
}

function addTotalSlide(doc: PDFKit.PDFDocument, proposal: IProposal, company: ISettings['company'] | undefined): void {
  doc.addPage();
  const W = doc.page.width, H = doc.page.height;
  doc.rect(0, 0, W, H).fill(BRAND.white);

  doc.fillColor(BRAND.textDark).font('Helvetica-Bold').fontSize(22).text('Total Investment', 60, 50);

  const boxY = 110;
  doc.roundedRect(60, boxY, W - 120, 110, 10).fill(BRAND.orange);
  doc.fillColor('#FFE8D6').font('Helvetica').fontSize(12).text('TOTAL FOR THIS PROPOSAL', 90, boxY + 25);
  doc.fillColor(BRAND.white).font('Helvetica-Bold').fontSize(34)
    .text(formatCurrency(proposal.totalAmount), 90, boxY + 48);

  if (proposal.validUntil) {
    doc.fillColor('#FFE8D6').font('Helvetica').fontSize(11)
      .text(`Valid until ${formatDate(proposal.validUntil)}`, W - 280, boxY + 45, { width: 220, align: 'right' });
  }

  // signature area
  const sigY = boxY + 160;
  doc.fillColor(BRAND.textMuted).font('Helvetica').fontSize(10).text('Signatures', 60, sigY);
  doc.moveTo(60, sigY + 50).lineTo(280, sigY + 50).strokeColor(BRAND.cardBorder).lineWidth(1).stroke();
  doc.text('Client Signature & Date', 60, sigY + 58);
  doc.moveTo(W - 280, sigY + 50).lineTo(W - 60, sigY + 50).stroke();
  doc.text('Authorized Signature & Date', W - 280, sigY + 58);

  drawProposalFooter(doc, 'fin');

  // closing band
  const bandY = H - 130;
  doc.rect(0, bandY, W, 130).fill(BRAND.orange);
  drawHexagonOutline(doc, W / 2, bandY + 35, 22, BRAND.yellow, 3);
  drawCheckmark(doc, W / 2, bandY + 35, 13, BRAND.yellow);
  doc.fillColor(BRAND.white).font('Helvetica-Bold').fontSize(18)
    .text('Thank You!', 0, bandY + 65, { width: W, align: 'center' });
  doc.fillColor('#FFE8D6').font('Helvetica').fontSize(10)
    .text(company?.name || 'Your Agency', 0, bandY + 92, { width: W, align: 'center' });
}

export async function generateProposalPDF(proposal: IProposal, settings: ISettings | null): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const company = settings?.company;
    const services: ServiceCard[] = proposal.services.length > 0
      ? proposal.services
      : [{ name: 'Service', description: 'No services added yet', price: 0 }];

    addCoverSlide(doc, proposal, company);
    addObjectiveSlide(doc, proposal, company);
    addServicesSlides(doc, services, proposal);
    addTotalSlide(doc, proposal, company);

    doc.end();
  });
}
