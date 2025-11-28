import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logo from "../../assets/logo.png";

// ========== INVOICE PDF (DYNAMIC) ==========
export const generateInvoicePDF = (quotation, settings) => {
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
    bank_name,
    bank_account_name,
    bank_account_number,
    payment_terms,
    footer_note,
    watermark_text,
    signature_footer_text
  } = settings;

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

  /* ================= WATERMARK ================= */
  doc.setFontSize(60);
  doc.setTextColor(240, 200, 200);
  doc.text(
    watermark_text || "INVOICE",
    pageWidth / 2,
    pageHeight / 2,
    { align: "center" }
  );
  doc.setTextColor(0, 0, 0);

  /* ================= TITLE ================= */
  doc.setFillColor(235, 235, 235);
  doc.rect(10, 48, pageWidth - 20, 12, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("INVOICE", pageWidth / 2, 56, { align: "center" });

  let y = 70;

  /* ================= PROJECT ================= */
  doc.setFont("helvetica", "bold");
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

  /* ================= CUSTOMER ================= */
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.text("Bill To:", 10, y);

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(quotation.customer_name || "-", 10, y);
  y += 5;
  doc.text(quotation.customer_phone || "-", 10, y);
  y += 5;
  doc.text(quotation.customer_address || "-", 10, y);

  /* ================= ITEMS TABLE ================= */
  autoTable(doc, {
    startY: y + 10,
    headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
    styles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    head: [["#", "Item", "Qty", "Unit Price (₦)", "Total (₦)"]],
    body: quotation.items?.map((row, idx) => [
      idx + 1,
      row.item_name || row.material_name || "",
      row.quantity,
      Number(row.unit_price || 0).toLocaleString(),
      Number(row.total_price || 0).toLocaleString(),
    ]),
  });

  /* ================= PAYMENT SUMMARY ================= */
  const sy = doc.lastAutoTable.finalY + 15;

  doc.setFont("helvetica", "bold");
  doc.text("Payment Summary", 10, sy);

  doc.setFont("helvetica", "normal");
  doc.text(`Subtotal: ₦${Number(quotation.subtotal).toLocaleString()}`, 10, sy + 8);
  doc.text(`Discount: ₦${Number(quotation.discount_amount).toLocaleString()}`, 10, sy + 16);
  doc.text(`VAT: ₦${Number(quotation.vat_amount).toLocaleString()}`, 10, sy + 24);

  doc.setFont("helvetica", "bold");
  doc.text(`TOTAL DUE: ₦${Number(quotation.total).toLocaleString()}`, 10, sy + 40);

  /* ================= BANK DETAILS ================= */
  const bankY = sy + 55;

  doc.setFont("helvetica", "bold");
  doc.text("Bank Details", 10, bankY);

  doc.setFont("helvetica", "normal");
  doc.text(`Bank: ${bank_name || "-"}`, 10, bankY + 7);
  doc.text(`Account Name: ${bank_account_name || "-"}`, 10, bankY + 14);
  doc.text(`Account Number: ${bank_account_number || "-"}`, 10, bankY + 21);

  /* ================= PAYMENT TERMS ================= */
  const termsY = bankY + 32;

  doc.setFont("helvetica", "bold");
  doc.text("Payment Terms", 10, termsY);

  doc.setFont("helvetica", "normal");
  const splitPayTerms = doc.splitTextToSize(payment_terms || "—", pageWidth - 20);
  doc.text(splitPayTerms, 10, termsY + 7);

  /* ================= SIGNATURE FOOTER ================= */
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(
    signature_footer_text || footer_note || "",
    pageWidth / 2,
    290,
    { align: "center" }
  );

  doc.save(`Invoice-${quotation.ref_no || "SFV"}.pdf`);
};

export default generateInvoicePDF;
