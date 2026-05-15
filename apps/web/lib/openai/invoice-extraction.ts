export type InvoiceExtraction = {
  vendorName: string | null;
  amountPaise: number;
  taxPaise: number;
  invoiceDate: string | null;
  dueDate: string | null;
  description: string;
  confidence: number;
  periodLabel: string | null;
  forItem: string | null;
};

const INVOICE_SUBJECT_HINT =
  /\b(invoice|bill|payment due|receipt|tax invoice|purchase order|po|raw material|rent|lease|maintenance|cam|utility|utilities|electricity|water|lpg|gas|horkiddan)\b/i;

type StructuredInvoiceResult = {
  vendor_name: string | null;
  amount_rupees: number | null;
  tax_rupees: number | null;
  invoice_date: string | null;
  due_date: string | null;
  period_label: string | null;
  for_item: string | null;
  description: string | null;
  confidence: number | null;
};

const DEFAULT_OCR_MODEL = process.env.OPENAI_BILL_OCR_MODEL?.trim() || "gpt-4.1-mini";

function normalizeInvoiceText(value: string): string {
  return value
    .split("\u0000")
    .join("")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function invoiceLines(value: string): string[] {
  return normalizeInvoiceText(value)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function lineAfter(lines: string[], pattern: RegExp): string | null {
  const index = lines.findIndex((line) => pattern.test(line));
  if (index === -1) return null;
  return lines.slice(index + 1).find(Boolean) ?? null;
}

function captureMoney(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.match(/([0-9][0-9,]*\.[0-9]{2}|[0-9][0-9,]*)/);
  const rawAmount = match?.[1];
  if (!rawAmount) return null;
  const amount = Number(rawAmount.replace(/,/g, ""));
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

function parseSlashDate(value: string): string | null {
  const match = value.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const yearRaw = Number(match[3]);
  const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
  if (!day || !month || !year) return null;
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

function parseLongDate(value: string): string | null {
  const match = value.match(/\b(\d{1,2})[- ]([A-Za-z]{3,9})[- ](\d{4})\b/);
  if (!match) return null;
  const dayText = match[1];
  const monthText = match[2];
  const yearText = match[3];
  if (!dayText || !monthText || !yearText) return null;
  const monthIndex = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ].indexOf(monthText.slice(0, 3).toLowerCase());
  if (monthIndex === -1) return null;
  return new Date(Date.UTC(Number(yearText), monthIndex, Number(dayText)))
    .toISOString()
    .slice(0, 10);
}

function parseInvoiceDate(value: string | null | undefined): string | null {
  if (!value) return null;
  return parseSlashDate(value) ?? parseLongDate(value);
}

function normalizePeriodLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = value.match(/\b([A-Za-z]{3})[- ](\d{2}|\d{4})\b/);
  if (!match) return value.trim();
  const monthText = match[1];
  const yearText = match[2];
  if (!monthText || !yearText) return value.trim();
  const month = monthText.charAt(0).toUpperCase() + monthText.slice(1, 3).toLowerCase();
  const yearRaw = Number(yearText);
  const year = yearText.length === 2 ? 2000 + yearRaw : yearRaw;
  return `${month} ${year}`;
}

function extractSubjectOutlet(subject: string): string | null {
  const match = subject.match(/\bfor\s+(.+?)\s*$/i);
  return match?.[1]?.trim() ?? null;
}

function extractSenderEmail(fromHeader: string): string | null {
  const emailMatch = fromHeader.match(/<([^>]+)>/);
  const raw = (emailMatch?.[1] ?? fromHeader).trim().toLowerCase();
  return raw.includes("@") ? raw : null;
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const parsed = await parser.getText();
    return normalizeInvoiceText(parsed.text || "");
  } finally {
    await parser.destroy();
  }
}

function extractInvoiceFromMessage(args: {
  subject: string;
  sender: string;
  internalDate: string | null;
}): InvoiceExtraction {
  const amountMatch = args.subject.match(/(?:₹|rs\.?|inr)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
  const amountRupees = amountMatch ? Number(amountMatch[1]?.replace(/,/g, "")) : 0;
  const senderEmail = extractSenderEmail(args.sender);
  const vendorName =
    args.sender.match(/^"?([^"<]+)"?\s*</)?.[1]?.trim() ||
    senderEmail?.split("@")[0]?.replace(/[._-]+/g, " ") ||
    "Invoice sender";
  const amountPaise = Number.isFinite(amountRupees) ? Math.round(amountRupees * 100) : 0;
  return {
    vendorName,
    amountPaise,
    taxPaise: 0,
    invoiceDate: args.internalDate?.slice(0, 10) ?? null,
    dueDate: null,
    description: args.subject || "Gmail-scanned invoice",
    confidence: amountPaise > 0 ? 90 : 55,
    periodLabel: null,
    forItem: extractSubjectOutlet(args.subject),
  };
}

function extractRentInvoice(args: {
  text: string;
  subject: string;
  sender: string;
  internalDate: string | null;
}): InvoiceExtraction | null {
  if (
    !/\b(rent|lease|monthly rent|maintenance|cam|common area maintenance)\b/i.test(args.subject) &&
    !/\b(rent|lease|monthly rent|maintenance|cam|common area maintenance)\b/i.test(args.text)
  ) {
    return null;
  }

  const lines = invoiceLines(args.text);
  const senderName = args.sender.match(/^"?([^"<]+)"?\s*</)?.[1]?.trim() ?? null;
  const vendorName =
    senderName ??
    lines.find((line) => /properties|estates|realty|landlord|lease/i.test(line)) ??
    null;
  const totalPaise =
    captureMoney(
      args.text.match(
        /\b(?:net payable amount|total payable|total amount|amount due|rent payable|payable amount)\b[\s:₹-]*([0-9,]+\.[0-9]{2}|[0-9,]+)/i
      )?.[1]
    ) ??
    captureMoney(args.subject.match(/(?:₹|rs\.?|inr)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i)?.[1]) ??
    0;
  const invoiceDate =
    parseInvoiceDate(
      args.text.match(
        /\b(?:invoice date|bill date|date)\b[\s:.-]*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i
      )?.[1]
    ) ??
    parseInvoiceDate(
      args.text.match(
        /\b(?:invoice date|bill date|date)\b[\s:.-]*([0-9]{1,2}[- ][A-Za-z]{3,9}[- ]\d{4})/i
      )?.[1]
    ) ??
    args.internalDate?.slice(0, 10) ??
    null;
  const dueDate =
    parseInvoiceDate(
      args.text.match(
        /\b(?:due date|payment due|pay by)\b[\s:.-]*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i
      )?.[1]
    ) ??
    parseInvoiceDate(
      args.text.match(
        /\b(?:due date|payment due|pay by)\b[\s:.-]*([0-9]{1,2}[- ][A-Za-z]{3,9}[- ]\d{4})/i
      )?.[1]
    ) ??
    null;
  const periodLabel =
    normalizePeriodLabel(
      args.text.match(/\b(?:rent for|period|month)\b[\s:.-]*([A-Za-z]{3,9}[- ]\d{2,4})/i)?.[1]
    ) ??
    normalizePeriodLabel(args.subject.match(/\b([A-Za-z]{3,9}[- ]\d{2,4})\b/i)?.[1]) ??
    (invoiceDate
      ? new Intl.DateTimeFormat("en-IN", {
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(`${invoiceDate}T00:00:00.000Z`))
      : null);
  const forItem =
    extractSubjectOutlet(args.subject) ??
    lines.find((line) => /shop|unit|floor|suite|mall|tower/i.test(line)) ??
    "Rent";
  const description = [
    /\bmaintenance|cam\b/i.test(args.subject) || /\bmaintenance|cam\b/i.test(args.text)
      ? "Maintenance / CAM invoice"
      : "Rent invoice",
    periodLabel ? `Period ${periodLabel}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  let confidence = 62;
  if (vendorName) confidence += 8;
  if (totalPaise > 0) confidence += 10;
  if (invoiceDate) confidence += 5;
  if (dueDate) confidence += 5;
  if (periodLabel) confidence += 5;

  return {
    vendorName,
    amountPaise: totalPaise,
    taxPaise: 0,
    invoiceDate,
    dueDate,
    description,
    confidence: Math.min(confidence, 92),
    periodLabel,
    forItem,
  };
}

function extractGasBillInvoice(args: {
  text: string;
  subject: string;
  sender: string;
  internalDate: string | null;
}): InvoiceExtraction | null {
  if (!/lpg commercial gas invoice|monthly consumption|net payable amount/i.test(args.text)) {
    return null;
  }

  const lines = invoiceLines(args.text);
  const vendorName =
    args.text
      .match(/For\s+([A-Za-z][A-Za-z &.,()-]+(?:Private Limited|Pvt\.?\s*Ltd\.?))/i)?.[1]
      ?.trim() ??
    args.text.match(/LPG COMMERCIAL GAS INVOICE\s+(.+?)\s+GSTIN/i)?.[1]?.trim() ??
    args.sender.match(/^"?([^"<]+)"?\s*</)?.[1]?.trim() ??
    null;
  const billNo =
    args.text.match(/Bill No:?\s*([A-Z0-9/-]+)/i)?.[1] ?? lineAfter(lines, /^Bill No:?$/i) ?? null;
  const invoiceDate = parseInvoiceDate(
    args.text.match(/Bill Date\s+([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i)?.[1] ??
      lineAfter(lines, /^Bill Date$/i) ??
      args.internalDate ??
      undefined
  );
  const dueDate = parseInvoiceDate(
    args.text.match(/Bill Due Date\s+([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i)?.[1] ??
      lineAfter(lines, /^Bill Due Date$/i)
  );
  const disconnectionDate = parseInvoiceDate(
    args.text.match(/Disconnection Date\s+([0-9]{1,2}[- ][A-Za-z]{3,9}[- ]\d{4})/i)?.[1] ??
      lineAfter(lines, /^Disconnection Date$/i)
  );
  const meterNo =
    args.text.match(/Meter No[\s\S]{0,120}?([0-9]{5,})/i)?.[1] ??
    lineAfter(lines, /^Meter No$/i) ??
    null;
  const totalPaise =
    captureMoney(args.text.match(/NET PAYABLE AMOUNT\(INR\)\s+([0-9,]+\.[0-9]{2})/i)?.[1]) ??
    captureMoney(args.text.match(/Total Bill Amount\(INR\)\s+([0-9,]+\.[0-9]{2})/i)?.[1]) ??
    0;
  const basePaise =
    captureMoney(
      args.text.match(/Basic Value of Gas Consumption \(A\)\s+([0-9,]+\.[0-9]{2})/i)?.[1]
    ) ?? totalPaise;
  const amountPaise = Math.max(basePaise, 0);
  const taxPaise = Math.max(totalPaise - amountPaise, 0);
  const subjectOutlet = extractSubjectOutlet(args.subject);
  const unitName =
    args.text.match(/Unit Name\s+(.+?)\s+Bill Due Date/i)?.[1]?.trim() ??
    lineAfter(lines, /^Unit Name$/i);
  const customerName = lines.find((line) => /gabru di chaap/i.test(line)) ?? subjectOutlet;
  const periodLabel =
    normalizePeriodLabel(args.text.match(/Monthly Consumption\s+([A-Za-z]{3}-\d{2,4})/i)?.[1]) ??
    normalizePeriodLabel(
      args.text
        .match(/PRICE\s+([A-Za-z]{3}-\d{2,4})\s+[0-9.]+\s+[0-9.]+/gi)
        ?.pop()
        ?.match(/([A-Za-z]{3}-\d{2,4})/)?.[1]
    ) ??
    (invoiceDate
      ? new Intl.DateTimeFormat("en-IN", {
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(`${invoiceDate}T00:00:00.000Z`))
      : null);
  const forItem =
    [customerName, unitName].filter(Boolean).join(" · ") || subjectOutlet || "Commercial gas bill";
  const details = [
    "LPG commercial gas invoice",
    billNo ? `Bill ${billNo}` : null,
    meterNo ? `Meter ${meterNo}` : null,
    disconnectionDate ? `Disconnect ${disconnectionDate}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  let confidence = 68;
  if (vendorName) confidence += 8;
  if (totalPaise > 0) confidence += 10;
  if (invoiceDate) confidence += 5;
  if (dueDate) confidence += 5;
  if (periodLabel) confidence += 4;

  return {
    vendorName,
    amountPaise,
    taxPaise,
    invoiceDate,
    dueDate,
    description: details,
    confidence: Math.min(confidence, 96),
    periodLabel,
    forItem,
  };
}

function extractPurchaseOrder(args: {
  text: string;
  subject: string;
  sender: string;
  internalDate: string | null;
}): InvoiceExtraction | null {
  const text = normalizeInvoiceText(args.text);
  const subjectOrText = `${args.subject}\n${text}`;
  const isPurchaseOrder =
    /\b(purchase order|p\.?\s*o\.?|po\s*(?:no|number|#)|raw material|horkiddan)\b/i.test(
      subjectOrText
    );
  if (!isPurchaseOrder) return null;

  const senderEmail = extractSenderEmail(args.sender);
  const vendorName =
    text
      .match(/\b(?:vendor|supplier|seller)\b[\s:.-]*([A-Za-z][A-Za-z0-9 &.,()-]{2,80})/i)?.[1]
      ?.trim() ??
    text.match(/\b(Horkiddan[A-Za-z0-9 &.,()-]*)\b/i)?.[1]?.trim() ??
    args.sender.match(/^"?([^"<]+)"?\s*</)?.[1]?.trim() ??
    senderEmail?.split("@")[0]?.replace(/[._-]+/g, " ") ??
    "Horkiddan";
  const poNumber =
    text.match(
      /\b(?:purchase order|po|p\.o\.|po no|po number|po #)\b[\s:#.-]*([A-Z0-9/-]+)/i
    )?.[1] ??
    args.subject.match(/\b(?:purchase order|po|p\.o\.)\b[\s:#.-]*([A-Z0-9/-]+)/i)?.[1] ??
    null;
  const totalPaise =
    captureMoney(
      text.match(
        /\b(?:grand total|net total|order total|po value|total value|total amount|amount payable|payable amount)\b[\s:₹-]*([0-9,]+\.[0-9]{2}|[0-9,]+)/i
      )?.[1]
    ) ??
    captureMoney(args.subject.match(/(?:₹|rs\.?|inr)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i)?.[1]) ??
    0;
  const taxPaise =
    captureMoney(text.match(/\b(?:gst|tax)\b[\s:₹-]*([0-9,]+\.[0-9]{2}|[0-9,]+)/i)?.[1]) ?? 0;
  const amountPaise = Math.max(totalPaise - taxPaise, 0);
  const invoiceDate =
    parseInvoiceDate(
      text.match(
        /\b(?:po date|purchase order date|order date|date)\b[\s:.-]*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i
      )?.[1]
    ) ??
    parseInvoiceDate(
      text.match(
        /\b(?:po date|purchase order date|order date|date)\b[\s:.-]*([0-9]{1,2}[- ][A-Za-z]{3,9}[- ]\d{4})/i
      )?.[1]
    ) ??
    args.internalDate?.slice(0, 10) ??
    null;
  const dueDate =
    parseInvoiceDate(
      text.match(
        /\b(?:delivery date|due date|expected date|required by)\b[\s:.-]*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i
      )?.[1]
    ) ??
    parseInvoiceDate(
      text.match(
        /\b(?:delivery date|due date|expected date|required by)\b[\s:.-]*([0-9]{1,2}[- ][A-Za-z]{3,9}[- ]\d{4})/i
      )?.[1]
    ) ??
    null;
  const periodLabel =
    normalizePeriodLabel(args.subject.match(/\b([A-Za-z]{3,9}[- ]\d{2,4})\b/i)?.[1]) ??
    (invoiceDate
      ? new Intl.DateTimeFormat("en-IN", {
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(`${invoiceDate}T00:00:00.000Z`))
      : null);
  const forItem =
    text
      .match(
        /\b(?:items?|material|raw material|particulars?)\b[\s:.-]*([A-Za-z][A-Za-z0-9 &.,()/+-]{2,80})/i
      )?.[1]
      ?.trim() ??
    extractSubjectOutlet(args.subject) ??
    "Raw material";
  const description = ["Purchase order · raw material", poNumber ? `PO ${poNumber}` : null]
    .filter(Boolean)
    .join(" · ");

  let confidence = 66;
  if (/horkiddan/i.test(subjectOrText)) confidence += 8;
  if (poNumber) confidence += 6;
  if (totalPaise > 0) confidence += 8;
  if (invoiceDate) confidence += 4;

  return {
    vendorName,
    amountPaise,
    taxPaise,
    invoiceDate,
    dueDate,
    description,
    confidence: Math.min(confidence, 88),
    periodLabel,
    forItem,
  };
}

function hasOpenAIInvoiceExtraction() {
  return Boolean(process.env.OPENAI_API_KEY);
}

async function callOpenAIForStructuredInvoice(args: {
  subject: string;
  sender: string;
  internalDate: string | null;
  fileName: string;
  mimeType: string | null;
  bodyText?: string | null;
  extractedText?: string | null;
  fileBuffer?: Buffer | null;
}): Promise<StructuredInvoiceResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const responseFormat = {
    type: "json_schema",
    json_schema: {
      name: "expense_invoice_extraction",
      strict: true,
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          vendor_name: { type: ["string", "null"] },
          amount_rupees: { type: ["number", "null"] },
          tax_rupees: { type: ["number", "null"] },
          invoice_date: { type: ["string", "null"] },
          due_date: { type: ["string", "null"] },
          period_label: { type: ["string", "null"] },
          for_item: { type: ["string", "null"] },
          description: { type: ["string", "null"] },
          confidence: { type: ["number", "null"] },
        },
        required: [
          "vendor_name",
          "amount_rupees",
          "tax_rupees",
          "invoice_date",
          "due_date",
          "period_label",
          "for_item",
          "description",
          "confidence",
        ],
      },
    },
  };

  const systemPrompt =
    "You extract structured expense invoice data for an accounting workflow. " +
    "Return only fields supported by the document or provided context. " +
    "Do not guess missing amounts or dates. " +
    "Confidence must be a number from 0 to 100. " +
    "Dates must be YYYY-MM-DD when explicit, else null. " +
    "If the bill is a utility or LPG/commercial gas invoice, prefer the net payable or final bill total. " +
    "If the document is a purchase order or PO for raw materials, extract it as a raw-material expense source document and include the PO number in the description when present.";

  const contextText =
    `Subject: ${args.subject || "Unknown"}\n` +
    `Sender: ${args.sender || "Unknown"}\n` +
    `Internal date: ${args.internalDate || "Unknown"}\n` +
    `File name: ${args.fileName}\n` +
    `Email body text: ${(args.bodyText || "").slice(0, 4000) || "None"}\n`;

  const userContent =
    args.extractedText && args.extractedText.trim().length > 0
      ? [
          {
            type: "text",
            text:
              `${contextText}\n` +
              "The following is OCR/text extracted from the invoice document. " +
              "Use it to identify vendor, billed period, amount, tax, due date, and a clean description.\n\n" +
              args.extractedText.slice(0, 12000),
          },
        ]
      : args.fileBuffer
        ? [
            {
              type: "text",
              text:
                `${contextText}\n` +
                "Extract the invoice fields from this image. Read visible text carefully like a bill OCR system.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${args.mimeType || "application/octet-stream"};base64,${args.fileBuffer.toString("base64")}`,
              },
            },
          ]
        : [
            {
              type: "text",
              text: `${contextText}\nNo OCR text or image content was available.`,
            },
          ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEFAULT_OCR_MODEL,
      temperature: 0,
      response_format: responseFormat,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: userContent,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI invoice extraction failed: ${response.status} ${errorText}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) return null;
  return JSON.parse(content) as StructuredInvoiceResult;
}

function fromStructuredInvoice(
  parsed: StructuredInvoiceResult,
  fallback: InvoiceExtraction
): InvoiceExtraction {
  const amountPaise =
    parsed.amount_rupees == null
      ? fallback.amountPaise
      : Math.max(0, Math.round(parsed.amount_rupees * 100));
  const taxPaise =
    parsed.tax_rupees == null
      ? fallback.taxPaise
      : Math.max(0, Math.round(parsed.tax_rupees * 100));
  return {
    vendorName: parsed.vendor_name || fallback.vendorName,
    amountPaise,
    taxPaise,
    invoiceDate: parsed.invoice_date || fallback.invoiceDate,
    dueDate: parsed.due_date || fallback.dueDate,
    description: parsed.description || fallback.description,
    confidence: Math.max(0, Math.min(100, Math.round(parsed.confidence ?? fallback.confidence))),
    periodLabel: parsed.period_label || fallback.periodLabel,
    forItem: parsed.for_item || fallback.forItem,
  };
}

function extractGenericInvoiceFromText(args: {
  text: string;
  subject: string;
  sender: string;
  internalDate: string | null;
}): InvoiceExtraction | null {
  const text = normalizeInvoiceText(args.text);
  if (!text) return null;

  const amountPaise =
    captureMoney(
      text.match(
        /\b(?:net payable amount|total payable|total amount due|amount due|payable amount|bill amount|invoice amount|total invoice value|amount payable)\b[\s:₹-]*([0-9,]+\.[0-9]{2}|[0-9,]+)/i
      )?.[1]
    ) ??
    captureMoney(
      text.match(
        /\b(?:total|amount)\b[\s\S]{0,24}?(?:₹|rs\.?|inr)\s*([0-9,]+\.[0-9]{2}|[0-9,]+)/i
      )?.[1]
    ) ??
    null;

  const taxPaise =
    captureMoney(text.match(/\b(?:gst|tax)\b[\s:₹-]*([0-9,]+\.[0-9]{2}|[0-9,]+)/i)?.[1]) ?? 0;

  const invoiceDate =
    parseInvoiceDate(
      text.match(
        /\b(?:invoice date|bill date|statement date|date)\b[\s:.-]*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i
      )?.[1]
    ) ??
    parseInvoiceDate(
      text.match(
        /\b(?:invoice date|bill date|statement date|date)\b[\s:.-]*([0-9]{1,2}[- ][A-Za-z]{3,9}[- ]\d{4})/i
      )?.[1]
    ) ??
    args.internalDate?.slice(0, 10) ??
    null;

  const dueDate =
    parseInvoiceDate(
      text.match(
        /\b(?:due date|payment due|pay by|last date)\b[\s:.-]*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i
      )?.[1]
    ) ??
    parseInvoiceDate(
      text.match(
        /\b(?:due date|payment due|pay by|last date)\b[\s:.-]*([0-9]{1,2}[- ][A-Za-z]{3,9}[- ]\d{4})/i
      )?.[1]
    ) ??
    null;

  const periodLabel =
    normalizePeriodLabel(
      text.match(
        /\b(?:billing period|bill period|period|month|invoice for)\b[\s:.-]*([A-Za-z]{3,9}[- ]\d{2,4})/i
      )?.[1]
    ) ??
    normalizePeriodLabel(args.subject.match(/\b([A-Za-z]{3,9}[- ]\d{2,4})\b/i)?.[1]) ??
    null;

  const senderEmail = extractSenderEmail(args.sender);
  const vendorName =
    args.sender.match(/^"?([^"<]+)"?\s*</)?.[1]?.trim() ||
    text.match(/\bfrom[:\s]+([A-Za-z][A-Za-z0-9 &.,()-]{2,60})/i)?.[1]?.trim() ||
    senderEmail?.split("@")[0]?.replace(/[._-]+/g, " ") ||
    null;

  if (!amountPaise || amountPaise <= 0) return null;

  return {
    vendorName,
    amountPaise,
    taxPaise,
    invoiceDate,
    dueDate,
    description: args.subject || "Gmail-scanned invoice",
    confidence: 72,
    periodLabel,
    forItem: extractSubjectOutlet(args.subject),
  };
}

export async function extractInvoiceFromAttachment(args: {
  subject: string;
  sender: string;
  internalDate: string | null;
  fileName: string;
  mimeType: string | null;
  fileBuffer: Buffer;
  bodyText?: string | null;
}): Promise<InvoiceExtraction> {
  const fallback = extractInvoiceFromMessage({
    subject: args.subject,
    sender: args.sender,
    internalDate: args.internalDate,
  });
  const mime = args.mimeType?.toLowerCase() ?? "";
  const isPdf = mime.includes("pdf") || args.fileName.toLowerCase().endsWith(".pdf");
  const isImage = mime.startsWith("image/") || /\.(png|jpe?g|webp|heic)$/i.test(args.fileName);

  let extractedText: string | null = null;
  if (isPdf) {
    try {
      extractedText = await extractPdfText(args.fileBuffer);
    } catch {
      extractedText = null;
    }
  }

  if (hasOpenAIInvoiceExtraction()) {
    try {
      const structured = await callOpenAIForStructuredInvoice({
        ...args,
        extractedText,
        fileBuffer: isImage ? args.fileBuffer : null,
      });
      if (structured) {
        return fromStructuredInvoice(structured, fallback);
      }
    } catch {
      // Fall through to heuristic extraction.
    }
  }

  if (extractedText) {
    const purchaseOrder = extractPurchaseOrder({
      text: extractedText,
      subject: args.subject,
      sender: args.sender,
      internalDate: args.internalDate,
    });
    if (purchaseOrder) {
      return {
        ...fallback,
        ...purchaseOrder,
        description: purchaseOrder.description || fallback.description,
        forItem: purchaseOrder.forItem || fallback.forItem,
        periodLabel: purchaseOrder.periodLabel || fallback.periodLabel,
      };
    }

    const rentInvoice = extractRentInvoice({
      text: extractedText,
      subject: args.subject,
      sender: args.sender,
      internalDate: args.internalDate,
    });
    if (rentInvoice) {
      return {
        ...fallback,
        ...rentInvoice,
        description: rentInvoice.description || fallback.description,
        forItem: rentInvoice.forItem || fallback.forItem,
        periodLabel: rentInvoice.periodLabel || fallback.periodLabel,
      };
    }

    const gasBill = extractGasBillInvoice({
      text: extractedText,
      subject: args.subject,
      sender: args.sender,
      internalDate: args.internalDate,
    });
    if (gasBill) {
      return {
        ...fallback,
        ...gasBill,
        description: gasBill.description || fallback.description,
        forItem: gasBill.forItem || fallback.forItem,
        periodLabel: gasBill.periodLabel || fallback.periodLabel,
      };
    }
  }

  const genericFromText = extractGenericInvoiceFromText({
    text: [args.bodyText, extractedText].filter(Boolean).join("\n\n"),
    subject: args.subject,
    sender: args.sender,
    internalDate: args.internalDate,
  });
  if (genericFromText) {
    return {
      ...fallback,
      ...genericFromText,
    };
  }

  if (INVOICE_SUBJECT_HINT.test(args.subject)) {
    return fallback;
  }

  return fallback;
}
