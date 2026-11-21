import { PDFDocument, StandardFonts, rgb, type PDFImage, type PDFFont } from 'pdf-lib';

export interface TenantStayPdfFile {
  name: string;
  contentType: string;
  data: ArrayBuffer;
}

export interface TenantStayPdfInput {
  tenant: {
    name: string;
    phone: string;
    address: string;
    city: string;
  };
  stay: {
    roomNumber: string;
    checkInDate: string;
    checkOutDate: string;
    status: string;
    monthlyRent: string;
    depositReceived: string;
    depositRefunded: string;
    additionalCharges: string;
  };
  photo: TenantStayPdfFile | null;
  documents: TenantStayPdfFile[];
  payments: Array<{
    date: string;
    received: string;
    charges: string;
    balance: string;
    method: string;
  }>;
  totalReceived: string;
  electricity: Array<{
    period: string;
    serviceName: string;
    meterNumber: string;
    roomUnits: string;
    tenantUnits: string;
    chargePerUnit: string;
    totalCharge: string;
    status: string;
  }>;
}

export interface TenantStayPdfResult {
  bytes: Uint8Array;
  warnings: string[];
}

const pageWidth = 595.28;
const pageHeight = 841.89;
const margin = 44;
const contentWidth = pageWidth - margin * 2;
const ink = rgb(0.12, 0.2, 0.31);
const muted = rgb(0.38, 0.43, 0.5);
const lineColor = rgb(0.86, 0.88, 0.9);
const brand = rgb(0.08, 0.28, 0.39);
const panel = rgb(0.94, 0.96, 0.97);

const pdfSafeText = (value: string): string =>
  value
    .replace(/[₹]/g, 'INR ')
    .replace(/[—–]/g, '-')
    .replace(/[^\x20-\x7E]/g, '?');

const wrapText = (text: string, font: PDFFont, size: number, maxWidth: number): string[] => {
  const words = pdfSafeText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';

  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });
  if (line) lines.push(line);
  return lines.length ? lines : ['-'];
};

const imageFromFile = async (pdf: PDFDocument, file: TenantStayPdfFile): Promise<PDFImage | null> => {
  const mimeType = file.contentType.toLowerCase();
  const extension = file.name.split('.').pop()?.toLowerCase();
  const data = new Uint8Array(file.data);

  if (mimeType.includes('png') || extension === 'png') return pdf.embedPng(data);
  if (mimeType.includes('jpeg') || mimeType.includes('jpg') || ['jpg', 'jpeg'].includes(extension || '')) {
    return pdf.embedJpg(data);
  }
  return null;
};

export const createTenantStayPdf = async (input: TenantStayPdfInput): Promise<TenantStayPdfResult> => {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Tenant Stay Report - ${input.tenant.name}`);
  pdf.setAuthor('Gnanabi Mansion');
  pdf.setSubject('Tenant stay, rent payment, electricity, and supporting documents');
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const warnings: string[] = [];
  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;
  let pageNumber = 1;

  const addFooter = (target: typeof page, number: number): void => {
    target.drawLine({
      start: { x: margin, y: 28 },
      end: { x: pageWidth - margin, y: 28 },
      thickness: 0.6,
      color: lineColor,
    });
    target.drawText(`Gnanabi Mansion | Tenant stay report | Page ${number}`, {
      x: margin,
      y: 14,
      size: 8,
      font: regular,
      color: muted,
    });
  };

  const addPage = (): void => {
    addFooter(page, pageNumber);
    page = pdf.addPage([pageWidth, pageHeight]);
    pageNumber += 1;
    y = pageHeight - margin;
  };

  const ensureSpace = (height: number): void => {
    if (y - height < margin + 18) addPage();
  };

  const addText = (text: string, options: {
    size?: number;
    font?: PDFFont;
    color?: ReturnType<typeof rgb>;
    indent?: number;
    gap?: number;
  } = {}): void => {
    const size = options.size ?? 10;
    const font = options.font ?? regular;
    const x = margin + (options.indent ?? 0);
    const lines = wrapText(text, font, size, contentWidth - (options.indent ?? 0));
    lines.forEach((line) => {
      ensureSpace(size + 6);
      y -= size + 4;
      page.drawText(line, { x, y, size, font, color: options.color ?? ink });
    });
    y -= options.gap ?? 3;
  };

  const addSection = (title: string): void => {
    ensureSpace(32);
    y -= 4;
    page.drawRectangle({
      x: margin,
      y: y - 5,
      width: contentWidth,
      height: 23,
      color: panel,
    });
    page.drawText(title.toUpperCase(), {
      x: margin + 9,
      y: y + 2,
      size: 10,
      font: bold,
      color: brand,
    });
    y -= 30;
  };

  page.drawRectangle({
    x: 0,
    y: pageHeight - 130,
    width: pageWidth,
    height: 130,
    color: brand,
  });
  page.drawText('GNANABI MANSION', {
    x: margin,
    y: pageHeight - 55,
    size: 22,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText('Tenant stay details', {
    x: margin,
    y: pageHeight - 80,
    size: 12,
    font: regular,
    color: rgb(0.86, 0.92, 0.94),
  });
  page.drawText(`Generated ${new Date().toLocaleDateString('en-IN')}`, {
    x: margin,
    y: pageHeight - 104,
    size: 9,
    font: regular,
    color: rgb(0.86, 0.92, 0.94),
  });
  y = pageHeight - 155;

  if (input.photo) {
    try {
      const photo = await imageFromFile(pdf, input.photo);
      if (photo) {
        const dimensions = photo.scale(1);
        const scale = Math.min(92 / dimensions.width, 112 / dimensions.height);
        page.drawImage(photo, {
          x: pageWidth - margin - dimensions.width * scale,
          y: pageHeight - 125,
          width: dimensions.width * scale,
          height: dimensions.height * scale,
        });
      } else {
        warnings.push(`Tenant photo format is not supported: ${input.photo.name}`);
      }
    } catch {
      warnings.push(`Tenant photo could not be embedded: ${input.photo.name}`);
    }
  }

  addSection('Tenant details');
  addText(`Name: ${input.tenant.name}`);
  addText(`Phone: ${input.tenant.phone}`);
  addText(`Address: ${input.tenant.address}, ${input.tenant.city}`);

  addSection('Stay details');
  addText(`Room: ${input.stay.roomNumber}`);
  addText(`Status: ${input.stay.status}`);
  addText(`Check-in: ${input.stay.checkInDate}`);
  addText(`Reserved check-out: ${input.stay.checkOutDate}`);
  addText(`Monthly rent: ${input.stay.monthlyRent}`);
  addText(`Deposit received: ${input.stay.depositReceived}`);
  addText(`Deposit refunded: ${input.stay.depositRefunded}`);
  addText(`Additional charges: ${input.stay.additionalCharges}`);

  addSection(`Rent payments (${input.payments.length})`);
  if (!input.payments.length) {
    addText('No rent payments are recorded for this stay.', { color: muted });
  } else {
    addText(`Total rent received since check-in: ${input.totalReceived}`, { font: bold });
    input.payments.forEach((payment) => {
      addText(`${payment.date} | Received ${payment.received} | Charges ${payment.charges} | Balance ${payment.balance} | ${payment.method}`);
    });
  }

  addSection(`Electricity details (${input.electricity.length})`);
  if (!input.electricity.length) {
    addText('No electricity charges are recorded for this stay.', { color: muted });
  } else {
    input.electricity.forEach((charge) => {
      addText(`${charge.period} - ${charge.serviceName} (Meter ${charge.meterNumber})`, {
        font: bold,
        gap: 1,
      });
      addText(`Room units: ${charge.roomUnits} | Tenant units: ${charge.tenantUnits} | Rate: ${charge.chargePerUnit} | Charge: ${charge.totalCharge} | ${charge.status}`, {
        indent: 8,
        color: muted,
      });
    });
  }

  addSection(`Attached documents (${input.documents.length})`);
  if (!input.documents.length) {
    addText('No tenant documents are attached.', { color: muted });
  } else {
    input.documents.forEach((document) => addText(document.name, { color: muted }));
  }

  for (const document of input.documents) {
    const mimeType = document.contentType.toLowerCase();
    const extension = document.name.split('.').pop()?.toLowerCase();
    if (mimeType.includes('pdf') || extension === 'pdf') {
      try {
        const source = await PDFDocument.load(document.data);
        const pages = await pdf.copyPages(source, source.getPageIndices());
        pages.forEach((copiedPage) => pdf.addPage(copiedPage));
      } catch {
        await pdf.attach(document.data, document.name, {
          mimeType: document.contentType,
          description: 'Tenant stay supporting document',
        });
        warnings.push(`PDF could not be merged as pages and was attached as a file: ${document.name}`);
      }
      continue;
    }

    try {
      const image = await imageFromFile(pdf, document);
      if (!image) {
        await pdf.attach(document.data, document.name, {
          mimeType: document.contentType,
          description: 'Tenant stay supporting document',
        });
        continue;
      }

      const imagePage = pdf.addPage([pageWidth, pageHeight]);
      imagePage.drawText(pdfSafeText(`Tenant document: ${document.name}`), {
        x: margin,
        y: pageHeight - margin,
        size: 11,
        font: bold,
        color: brand,
      });
      const dimensions = image.scale(1);
      const scale = Math.min(
        contentWidth / dimensions.width,
        (pageHeight - margin * 2 - 30) / dimensions.height,
      );
      imagePage.drawImage(image, {
        x: (pageWidth - dimensions.width * scale) / 2,
        y: margin,
        width: dimensions.width * scale,
        height: dimensions.height * scale,
      });
    } catch {
      await pdf.attach(document.data, document.name, {
        mimeType: document.contentType,
        description: 'Tenant stay supporting document',
      });
      warnings.push(`Document could not be displayed as a page and was attached as a file: ${document.name}`);
    }
  }

  if (warnings.length) {
    addPage();
    addSection('Files requiring attention');
    warnings.forEach((warning) => addText(warning, { color: muted }));
  }

  addFooter(page, pageNumber);
  return { bytes: await pdf.save(), warnings };
};
