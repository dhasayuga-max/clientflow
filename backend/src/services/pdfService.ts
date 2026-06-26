import PDFDocument from 'pdfkit';
import { IInvoice } from '../models/Invoice';
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

