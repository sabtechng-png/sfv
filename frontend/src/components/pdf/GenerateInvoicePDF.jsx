import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logo from "../../assets/logo.png";

/* ============================================================
   SCATTER WATERMARK (OPTION A, BEHIND CONTENT)
============================================================ */
const drawWatermark = (doc, text, pageWidth, pageHeight) => {
  const wm = ("INVOICE").toUpperCase();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(235, 235, 235);

  for (let x = -20; x < pageWidth + 60; x += 90) {
    for (let y = -20; y < pageHeight + 80; y += 65) {
      doc.text(wm, x, y, { angle: -40 });
    }
  }

  doc.setTextColor(0, 0, 0);
};

/* ============================================================
   PAGE BREAK (draw watermark on new page)
============================================================ */
const checkPageBreak = (doc, y, pageHeight, pageWidth, watermark) => {
  if (y > pageHeight - 25) {
    doc.addPage();
    drawWatermark(doc, watermark, pageWidth, pageHeight);
    return 20;
  }
  return y;
};

/* ============================================================
   MAIN INVOICE GENERATOR
============================================================ */
export const generateInvoicePDF = (quotation, settings) => {
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
    bank_name,
    bank_account_name,
    bank_account_number,
    footer_note,
    watermark_text,
    signature_footer_text,
  } = settings;

  /* =======================================
     PAGE 1 WATERMARK (BEHIND CONTENT)
  ======================================= */
  drawWatermark(doc, watermark_text, pageWidth, pageHeight);

  /* =======================================
     HEADER
  ======================================= */
  doc.addImage(logo, "PNG", 12, 10, 30, 30);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(company_name || "Company Name", 48, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(company_address || "", 48, 25);
  doc.text(`Phone: ${company_phone || "-"}`, 48, 30);
  doc.text(`Email: ${company_email || "-"}`, 48, 35);
  if (company_website) doc.text(company_website, 48, 40);
  if (company_rc) doc.text(`RC: ${company_rc}`, 48, 45);

  /* =======================================
     TITLE BAR
  ======================================= */
  doc.setFillColor(240, 240, 240);
  doc.rect(10, 50, pageWidth - 20, 12, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("INVOICE", pageWidth / 2, 58, { align: "center" });

  let y = 70;

  /* =======================================
     PROJECT INFO
  ======================================= */
  doc.setFontSize(11);
  doc.text("Project Title:", 10, y);
  doc.setFont("helvetica", "normal");
  doc.text(quotation.project_title || quotation.quote_for || "-", 45, y);

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Invoice No:", 10, y);
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

  /* =======================================
     CUSTOMER INFO
  ======================================= */
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.text("Bill To:", 10, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  y += 6;
  doc.text(quotation.customer_name || "-", 10, y);

  y += 5;
  doc.text(quotation.customer_phone || "-", 10, y);

  y += 5;
  doc.text(quotation.customer_address || "-", 10, y);

  /* =======================================
     ITEMS TABLE
  ======================================= */
  autoTable(doc, {
    startY: y + 10,
    headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
    styles: { fontSize: 9, cellPadding: 2 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    head: [["#", "Item", "Qty", "Unit Price (N)", "Total (N)"]],
    body: quotation.items?.map((it, i) => [
      i + 1,
      it.item_name || it.material_name,
      it.quantity,
      Number(it.unit_price).toLocaleString(),
      Number(it.total_price).toLocaleString(),
    ]),
  });

  /* =======================================
     SIDE-BY-SIDE BLOCK: BANK DETAILS (LEFT)
     + PAYMENT SUMMARY (RIGHT)
  ======================================= */
  let boxY = doc.lastAutoTable.finalY + 12;
  boxY = checkPageBreak(doc, boxY, pageHeight, pageWidth, watermark_text);

  /* LEFT SIDE (Bank Details) */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Bank Details", 10, boxY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  let leftY = boxY + 7;
  leftY = checkPageBreak(doc, leftY, pageHeight, pageWidth, watermark_text);

  doc.text(`Bank: ${bank_name || "-"}`, 10, leftY);
  leftY += 6;
  doc.text(`Account Name: ${bank_account_name || "-"}`, 10, leftY);
  leftY += 6;
  doc.text(`Account Number: ${bank_account_number || "-"}`, 10, leftY);

  /* RIGHT SIDE (Payment Summary) */
  let rightX = pageWidth / 2 + 5;
  let rightY = boxY;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Payment Summary", rightX, rightY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  rightY += 7;
  doc.text(`Subtotal: N${Number(quotation.subtotal || 0).toLocaleString()}`, rightX, rightY);

  rightY += 6;
  doc.text(`Discount: N${Number(quotation.discount_amount || 0).toLocaleString()}`, rightX, rightY);

  rightY += 6;
  doc.text(`VAT: N${Number(quotation.vat_amount || 0).toLocaleString()}`, rightX, rightY);

  rightY += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`TOTAL DUE: N${Number(quotation.total || 0).toLocaleString()}`, rightX, rightY);

  /* =======================================
     NO PAYMENT TERMS — REMOVED COMPLETELY
  ======================================= */
/* ============================================================
   PAYMENT TERMS — ALWAYS ON NEW PAGE (PAGE 2)
============================================================ */
doc.addPage(); // FORCE NEW PAGE
drawWatermark(doc, watermark_text, pageWidth, pageHeight); // watermark behind content

let ty = 20; // fresh top spacing for clean layout

doc.setFont("helvetica", "bold");
doc.setFontSize(12);
doc.text("Payment Terms", 10, ty);

ty += 8;
doc.setFont("helvetica", "normal");
doc.setFontSize(9);

// Full merged terms – clean multi-line
const termsText = doc.splitTextToSize(
`
1. This quotation is valid for 1 week from the date of issue. Prices may change thereafter due to market fluctuations.
2. The quotation covers only the items and services listed. Any additional requests, changes, or upgrades will attract extra charges.
3. Payment Terms: A minimum of 70% advance payment is required before project commencement, with the balance payable immediately after completion.
4. Delivery and installation will commence 3–7 working days after confirmation of payment, subject to material availability.
5. All equipment carries manufacturer warranty as stated. Installation workmanship carries a limited warranty of 6–12 months, depending on project type.
6. All supplied materials remain the property of the company until full payment is completed.
7. The client is responsible for providing safe access to the site, necessary permits, and a suitable working environment.
8. Any variation arising from site conditions, client requests, or unforeseen issues will be treated as a change order and billed separately.
9. System performance values are estimates. Actual performance may vary based on load pattern, weather conditions, shading, and installation environment.
10. The company is not liable for damage caused by grid instability, power surges, lightning strikes, improper use, or unauthorized modifications.
11. After-sales support is provided within the warranty period. Services outside warranty will attract standard service charges.
12. Cancellation after material procurement may attract a 15–25% restocking fee, depending on supplier policy.
13. Electrician Services: The services of a certified electrician may be required for load reconnection. This cost is not included in the installation workmanship fee.
14. Client Consent: Payment of the advance deposit automatically signifies that the client has read, understood, and agreed to all items, prices, terms, and conditions in this quotation.
15. All pricing and technical details in this quotation are confidential and intended solely for the client.
`
, pageWidth - 20);

termsText.forEach(line => {
  ty += 5;
  if (ty > pageHeight - 20) {
    doc.addPage();
    drawWatermark(doc, watermark_text, pageWidth, pageHeight);
    ty = 20;
  }
  doc.text(line, 10, ty);
});



  /* =======================================
     FOOTER (PAGE NUMBERING ON ALL PAGES)
  ======================================= */
  const totalPages = doc.internal.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    doc.setFontSize(8);
    doc.setTextColor(100);

    doc.line(10, pageHeight - 12, pageWidth - 10, pageHeight - 12);

    doc.text(
      `Page ${i} of ${totalPages}`,
      12,
      pageHeight - 5
    );

    doc.text(
      signature_footer_text || footer_note || "Generated by SFV",
      pageWidth - 60,
      pageHeight - 5
    );
  }

  doc.save(`Invoice-${quotation.ref_no || "SFV"}.pdf`);
};

export default generateInvoicePDF;
