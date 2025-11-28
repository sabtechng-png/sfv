import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logo from "../../assets/logo.png";

// ========== QUOTATION PDF (DYNAMIC) ==========
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
  doc.setTextColor(230, 230, 230);
  doc.text(
    watermark_text || "SFV TECH",
    pageWidth / 2,
    pageHeight / 2,
    { align: "center" }
  );
  doc.setTextColor(0, 0, 0);

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

  /* ================= CUSTOMER ================= */
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
    head: [["#", "Item", "Qty", "Unit Price (₦)", "Total (₦)"]],
    body: quotation.items?.map((row, idx) => [
      idx + 1,
      row.item_name || row.material_name || "",
      row.quantity,
      Number(row.unit_price || 0).toLocaleString(),
      Number(row.total_price || 0).toLocaleString(),
    ]),
  });

  /* ================= FINANCIAL SUMMARY ================= */
  const sy = doc.lastAutoTable.finalY + 10;

  doc.setFont("helvetica", "bold");
  doc.text("Financial Summary", pageWidth - 70, sy);

  doc.setFont("helvetica", "normal");
  doc.text(`Subtotal: ₦${Number(quotation.subtotal).toLocaleString()}`, pageWidth - 70, sy + 7);
  doc.text(`Discount: ₦${Number(quotation.discount_amount).toLocaleString()}`, pageWidth - 70, sy + 14);
  doc.text(`VAT: ₦${Number(quotation.vat_amount).toLocaleString()}`, pageWidth - 70, sy + 21);

  doc.setFont("helvetica", "bold");
  doc.text(
    `Grand Total: ₦${Number(quotation.total).toLocaleString()}`,
    pageWidth - 70,
    sy + 32
  );

  /* ================= TERMS & FOOTER ================= */
  const termsY = sy + 45;

  doc.setFont("helvetica", "bold");
  doc.text("Terms & Conditions", 10, termsY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const termsText = terms || "—";
  const splitTerms = doc.splitTextToSize(termsText, pageWidth - 20);
  doc.text(splitTerms, 10, termsY + 7);

  /* ================= SIGNATURE FOOTER ================= */
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(
    signature_footer_text || footer_note || "",
    pageWidth / 2,
    290,
    { align: "center" }
  );

  doc.save(`Quotation-${quotation.ref_no || "SFV"}.pdf`);
};

export default generateQuotationPDF;
