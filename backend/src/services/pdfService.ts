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

export async function generateInvoicePDF(invoice: IInvoice, settings: ISettings | null): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const company = settings?.company || { name: 'Your Company', address: '', phone: '', gstNumber: '' };
    const primaryColor = '#4F46E5';
    const grayColor = '#6B7280';

    // Header background
    doc.rect(0, 0, doc.page.width, 120).fill(primaryColor);

    // Company Name
    doc.fillColor('white').fontSize(24).font('Helvetica-Bold')
      .text(company.name || 'Your Company', 50, 35);

    // Invoice label
    doc.fillColor('white').fontSize(12).font('Helvetica')
      .text('INVOICE', doc.page.width - 150, 35, { width: 100, align: 'right' });

    doc.fillColor('white').fontSize(20).font('Helvetica-Bold')
      .text(invoice.invoiceNumber, doc.page.width - 150, 52, { width: 100, align: 'right' });

    // Company details
    doc.fillColor('rgba(255,255,255,0.85)').fontSize(9).font('Helvetica')
      .text(company.address || '', 50, 70)
      .text(company.phone ? `Tel: ${company.phone}` : '', 50, 85)
      .text(company.gstNumber ? `GST: ${company.gstNumber}` : '', 50, 100);

    // Status badge
    const statusColors: Record<string, string> = { paid: '#10B981', pending: '#F59E0B', overdue: '#EF4444' };
    const statusColor = statusColors[invoice.status] || '#6B7280';
    doc.roundedRect(doc.page.width - 120, 80, 70, 22, 4).fill(statusColor);
    doc.fillColor('white').fontSize(9).font('Helvetica-Bold')
      .text(invoice.status.toUpperCase(), doc.page.width - 120, 87, { width: 70, align: 'center' });

    doc.moveDown(3);

    // Bill To / Invoice Info section
    const colLeft = 50;
    const colRight = 350;
    const startY = 145;

    doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold')
      .text('BILL TO', colLeft, startY);

    doc.fillColor('#1F2937').fontSize(11).font('Helvetica-Bold')
      .text(invoice.clientName, colLeft, startY + 15);
    doc.fillColor(grayColor).fontSize(10).font('Helvetica')
      .text(invoice.companyName, colLeft, startY + 30)
      .text(invoice.address, colLeft, startY + 45, { width: 200 })
      .text(invoice.email, colLeft, startY + 70)
      .text(invoice.whatsappNumber, colLeft, startY + 85);

    // Invoice details
    doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold')
      .text('INVOICE DETAILS', colRight, startY);

    const details = [
      ['Invoice Date', formatDate(invoice.invoiceDate)],
      ['Due Date', formatDate(invoice.dueDate)],
      ['Status', invoice.status.toUpperCase()],
    ];

    details.forEach(([label, value], i) => {
      doc.fillColor(grayColor).fontSize(9).font('Helvetica')
        .text(label, colRight, startY + 15 + i * 18);
      doc.fillColor('#1F2937').fontSize(9).font('Helvetica-Bold')
        .text(value, colRight + 90, startY + 15 + i * 18);
    });

    // Services table
    const tableTop = startY + 120;
    const tableHeaders = ['Service', 'Description', 'Qty', 'Price', 'Total'];
    const colWidths = [120, 140, 45, 80, 80];
    const colPositions = [50, 170, 310, 355, 435];

    // Table header
    doc.rect(50, tableTop, doc.page.width - 100, 25).fill('#F3F4F6');
    tableHeaders.forEach((header, i) => {
      doc.fillColor('#374151').fontSize(9).font('Helvetica-Bold')
        .text(header, colPositions[i], tableTop + 8, { width: colWidths[i] });
    });

    // Table rows
    let rowY = tableTop + 30;
    invoice.services.forEach((service, idx) => {
      if (idx % 2 === 0) {
        doc.rect(50, rowY - 5, doc.page.width - 100, 30).fill('#FAFAFA');
      }
      doc.fillColor('#1F2937').fontSize(9).font('Helvetica-Bold')
        .text(service.serviceName, colPositions[0], rowY, { width: colWidths[0] });
      doc.fillColor(grayColor).fontSize(8).font('Helvetica')
        .text(service.serviceDescription || '-', colPositions[1], rowY, { width: colWidths[1] });
      doc.fillColor('#1F2937').fontSize(9).font('Helvetica')
        .text(String(service.quantity), colPositions[2], rowY)
        .text(formatCurrency(service.price), colPositions[3], rowY)
        .text(formatCurrency(service.total), colPositions[4], rowY);
      rowY += 30;
    });

    // Totals
    const totalsY = rowY + 10;
    doc.moveTo(50, totalsY).lineTo(doc.page.width - 50, totalsY).stroke('#E5E7EB');

    const totalsX = 380;
    doc.fillColor(grayColor).fontSize(10).font('Helvetica')
      .text('Subtotal:', totalsX, totalsY + 15)
      .text(formatCurrency(invoice.subtotal), totalsX + 80, totalsY + 15, { align: 'right', width: 55 });

    if (invoice.taxRate > 0) {
      doc.text(`Tax (${invoice.taxRate}%):`, totalsX, totalsY + 35)
        .text(formatCurrency(invoice.taxAmount), totalsX + 80, totalsY + 35, { align: 'right', width: 55 });
    }

    // Total box
    const totalBoxY = totalsY + (invoice.taxRate > 0 ? 60 : 40);
    doc.rect(totalsX - 10, totalBoxY, 150, 35).fill(primaryColor);
    doc.fillColor('white').fontSize(11).font('Helvetica-Bold')
      .text('TOTAL:', totalsX, totalBoxY + 11)
      .text(formatCurrency(invoice.totalAmount), totalsX + 80, totalBoxY + 11, { align: 'right', width: 55 });

    // Notes
    if (invoice.notes) {
      doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold')
        .text('NOTES', 50, totalBoxY + 50);
      doc.fillColor(grayColor).fontSize(9).font('Helvetica')
        .text(invoice.notes, 50, totalBoxY + 65, { width: 280 });
    }

    // Footer
    const footerY = doc.page.height - 60;
    doc.moveTo(50, footerY).lineTo(doc.page.width - 50, footerY).stroke('#E5E7EB');
    doc.fillColor(grayColor).fontSize(8).font('Helvetica')
      .text('Thank you for your business!', 50, footerY + 10, { align: 'center', width: doc.page.width - 100 });
    if (company.website) {
      doc.text(company.website, 50, footerY + 22, { align: 'center', width: doc.page.width - 100 });
    }

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
