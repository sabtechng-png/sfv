import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logo from "../../assets/logo.png";

/* ============================================================
   NUMBER → WORDS CONVERTER (NAIRA + KOBO)
============================================================ */
const numberToWords = (num) => {
  if (!num || isNaN(num)) return "Zero Naira Only";

  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen",
    "Sixteen", "Seventeen", "Eighteen", "Nineteen",
  ];

  const b = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty",
    "Sixty", "Seventy", "Eighty", "Ninety",
  ];

  const inWords = (n) => {
    if (n < 20) return a[n];
    if (n < 100)
      return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
    if (n < 1000)
      return (
        a[Math.floor(n / 100)] +
        " Hundred" +
        (n % 100 ? " and " + inWords(n % 100) : "")
      );
    if (n < 1000000)
      return (
        inWords(Math.floor(n / 1000)) +
        " Thousand" +
        (n % 1000 ? " " + inWords(n % 1000) : "")
      );
    if (n < 1000000000)
      return (
        inWords(Math.floor(n / 1000000)) +
        " Million" +
        (n % 1000000 ? " " + inWords(n % 1000000) : "")
      );
    return (
      inWords(Math.floor(n / 1000000000)) +
      " Billion" +
      (n % 1000000000 ? " " + inWords(n % 1000000000) : "")
    );
  };

  const naira = Math.floor(num);
  const kobo = Math.round((num - naira) * 100);

  let result = inWords(naira) + " Naira";
  if (kobo > 0) result += " and " + inWords(kobo) + " Kobo";

  return result + " Only";
};

/* ============================================================
   DRAW WATERMARK BEHIND PAGE CONTENT
============================================================ */
const drawWatermark = (doc, watermark_text, pageWidth, pageHeight) => {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(235, 235, 235);

  const wmText = (watermark_text || "SFV TECH").toUpperCase();
  const stepX = 120;
  const stepY = 80;

  // Repeating diagonal pattern
  for (let x = 0; x < pageWidth + 100; x += stepX) {
    for (let y = 0; y < pageHeight + 100; y += stepY) {
      doc.text(wmText, x, y, { angle: -40 });
    }
  }

  doc.setTextColor(0, 0, 0); // reset to black
};

/* ============================================================
   SIMPLE PAGE BREAK HELPER
============================================================ */
const checkPageBreak = (
  doc,
  currentY,
  pageHeight,
  pageWidth,
  watermark_text,
  margin = 20
) => {
  if (currentY > pageHeight - margin) {
    doc.addPage();
    drawWatermark(doc, watermark_text, pageWidth, pageHeight);
    return 20; // new top margin
  }
  return currentY;
};

/* ============================================================
   QUOTATION PDF GENERATOR
============================================================ */
export const generateQuotationPDF = (quotation, settings) => {
  if (!quotation || !settings) return;

  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const {
    company_name,
    company_address,
    company_phone,
    company_email,
    company_website,
    company_rc,
    terms,
    footer_note,
    watermark_text,
    signature_footer_text,
  } = settings;

  /* ================= DRAW WATERMARK ON PAGE 1 ================= */
  drawWatermark(doc, watermark_text, pageWidth, pageHeight);

  /* ================= HEADER ================= */
  doc.addImage(logo, "PNG", 12, 10, 28, 28);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(company_name || "Company Name", 45, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(company_address || "", 45, 23);
  doc.text(`Phone: ${company_phone || "-"}`, 45, 28);
  doc.text(`Email: ${company_email || "-"}`, 45, 33);
  if (company_website) doc.text(company_website, 45, 38);
  if (company_rc) doc.text(`RC: ${company_rc}`, 45, 43);

  /* ================= TITLE BAR ================= */
  doc.setFillColor(240, 240, 240);
  doc.rect(10, 48, pageWidth - 20, 12, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("QUOTATION", pageWidth / 2, 56, { align: "center" });

  /* ================= PROJECT & META ================= */
  let y = 70;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Project Title:", 10, y);
  doc.setFont("helvetica", "normal");
  doc.text(quotation.project_title || quotation.quote_for || "-", 45, y);

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Ref No:", 10, y);
  doc.setFont("helvetica", "normal");
  doc.text(quotation.ref_no || "-", 45, y);

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Date:", 10, y);
  doc.setFont("helvetica", "normal");
  doc.text(
    quotation.created_at
      ? new Date(quotation.created_at).toLocaleDateString()
      : "-",
    45,
    y
  );

  /* ================= CUSTOMER INFO ================= */
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.text("Customer Information", 10, y);

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(`Name: ${quotation.customer_name || "-"}`, 10, y);
  y += 5;
  doc.text(`Phone: ${quotation.customer_phone || "-"}`, 10, y);
  y += 5;
  doc.text(`Address: ${quotation.customer_address || "-"}`, 10, y);

  /* ================= ITEMS TABLE ================= */
  autoTable(doc, {
    startY: y + 8,
    headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
    styles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    head: [["#", "Item", "Qty", "Unit Price (N)", "Total (N)"]],
    body: (quotation.items || []).map((row, idx) => [
      idx + 1,
      row.item_name || row.material_name || "",
      row.quantity,
      Number(row.unit_price || 0).toLocaleString(),
      Number(row.total_price || 0).toLocaleString(),
    ]),
  });

  /* ================= FINANCIAL SUMMARY ================= */
  let sy = doc.lastAutoTable.finalY + 10;
  sy = checkPageBreak(doc, sy, pageHeight, pageWidth, watermark_text);

  doc.setFont("helvetica", "bold");
  doc.text("Financial Summary", pageWidth - 70, sy);

  doc.setFont("helvetica", "normal");
  doc.text(`Subtotal: N${Number(quotation.subtotal || 0).toLocaleString()}`, pageWidth - 70, sy + 7);
  doc.text(`Discount: N${Number(quotation.discount_amount || 0).toLocaleString()}`, pageWidth - 70, sy + 14);
  doc.text(`VAT: N${Number(quotation.vat_amount || 0).toLocaleString()}`, pageWidth - 70, sy + 21);

  doc.setFont("helvetica", "bold");
  doc.text(`Grand Total: N${Number(quotation.total || 0).toLocaleString()}`, pageWidth - 70, sy + 32);

  /* ================= AMOUNT IN WORDS ================= */
  let wordsY = sy + 40;
  wordsY = checkPageBreak(doc, wordsY, pageHeight, pageWidth, watermark_text);

  // Background box
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(10, wordsY, pageWidth - 20, 20, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("AMOUNT IN WORDS:", 14, wordsY + 7);

  const amountWords = numberToWords(Number(quotation.total || 0)).toUpperCase();
  const wrappedWords = doc.splitTextToSize(amountWords, pageWidth - 28);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(wrappedWords, 14, wordsY + 13);

/* ================= TERMS & CONDITIONS ================= */
let termsY = wordsY + 35;
termsY = checkPageBreak(
  doc,
  termsY,
  pageHeight,
  pageWidth,
  watermark_text
);

// Title
doc.setFont("helvetica", "bold");
doc.setFontSize(11);
doc.text("Terms & Conditions", 10, termsY);

// Terms text
let tcY = termsY + 8;
doc.setFont("helvetica", "normal");
doc.setFontSize(9);   // ← FIXED FONT SIZE

const termsText =
  terms ||
  "This quotation is valid for 1 week. Prices and availability may change.";

const termsLines = doc.splitTextToSize(termsText, pageWidth - 20);

// Render each line
termsLines.forEach((line) => {
  tcY = checkPageBreak(
    doc,
    tcY,
    pageHeight,
    pageWidth,
    watermark_text
  );

  // Always reset font after page break (IMPORTANT)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  doc.text(line, 10, tcY);
  tcY += 4; // proper spacing
});


/* ================= CLOSING SECTION ================= */
tcY = checkPageBreak(doc, tcY + 10, pageHeight, pageWidth, watermark_text);

doc.setFont("helvetica", "bold");
doc.setFontSize(11);
doc.text("Closing Statement", 10, tcY);

tcY += 6;
doc.setFont("helvetica", "normal");
doc.setFontSize(9);

const closingText =
  "We appreciate your interest in our services. For further clarifications, modifications or negotiations regarding this quotation, please feel free to contact us at any time. Thank you.";

const closingLines = doc.splitTextToSize(closingText, pageWidth - 20);

closingLines.forEach((line) => {
  tcY = checkPageBreak(doc, tcY, pageHeight, pageWidth, watermark_text);
  doc.text(line, 10, tcY);
  tcY += 4;   // tighter spacing
});

/* Optional signature footer */
tcY = checkPageBreak(doc, tcY + 10, pageHeight, pageWidth, watermark_text);

doc.setFont("helvetica", "bold");
doc.setFontSize(10);
doc.text("Signed:", 10, tcY + 10);

doc.setFont("helvetica", "normal");
doc.text(settings.signature_footer_text || "For SFV TECH", 10, tcY + 20);

  /* ============================================================
     STYLED PAGE NUMBERS & FOOTER FOR ALL PAGES
============================================================ */
  const totalPages = doc.internal.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // FOOTER LINE
    doc.setDrawColor(150);
    doc.setLineWidth(0.1);
    doc.line(10, pageHeight - 12, pageWidth - 10, pageHeight - 12);

    // Page number + branding
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80);

    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth / 2 - 20,
      pageHeight - 5
    );

    doc.text(
      signature_footer_text || "Generated by SFV",
      pageWidth / 2 + 25,
      pageHeight - 5
    );
  }

  /* ================= SAVE PDF ================= */
  doc.save(`Quotation-${quotation.ref_no || "SFV"}.pdf`);
};

export default generateQuotationPDF;
