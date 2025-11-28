// utils/GenerateInvoicePDF.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logo from "../assets/logo.png";

export const generateInvoicePDF = (quotation) => {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  /* HEADER */
  doc.addImage(logo, "PNG", 12, 8, 28, 28);

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(18);
  doc.text("SFV TECHNOLOGY", 50, 18);

  doc.setFontSize(10);
  doc.setFont("Helvetica", "normal");
  doc.text("No. 14, Old Jebba Road, Ilorin, Kwara State, Nigeria.", 50, 25);
  doc.text("Tel: +234-903-535-xxxx  | Email: sfvtech@gmail.com", 50, 30);
  doc.text("RC: 2245789 | TIN: 14895209-0001", 50, 35);

  /* APPROVED WATERMARK */
  if (quotation.status === "Approved") {
    doc.setTextColor(200, 0, 0);
    doc.setFontSize(60);
    doc.text("APPROVED", pageWidth / 2, pageHeight / 2, {
      align: "center",
      opacity: 0.1,
    });
    doc.setTextColor(0);
  }

  /* TITLE */
  doc.setFillColor(230, 230, 230);
  doc.roundedRect(10, 45, pageWidth - 20, 18, 3, 3, "F");
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(15);
  doc.text("INVOICE", pageWidth / 2, 57, { align: "center" });

  let y = 75;

  /* PROJECT TITLE */
  doc.setFont("Helvetica", "bold");
  doc.text("Project Title:", 10, y);
  doc.setFont("Helvetica", "normal");
  doc.text(quotation.project_title || quotation.quote_for, 45, y);

  y += 7;
  doc.setFont("Helvetica", "bold");
  doc.text("Invoice No:", 10, y);
  doc.setFont("Helvetica", "normal");
  doc.text(quotation.ref_no, 45, y);

  y += 7;
  doc.setFont("Helvetica", "bold");
  doc.text("Date:", 10, y);
  doc.text(new Date(quotation.created_at).toLocaleDateString(), 45, y);

  /* CUSTOMER INFO */
  y += 12;
  doc.setFont("Helvetica", "bold");
  doc.text("Bill To:", 10, y);

  doc.setFont("Helvetica", "normal");
  y += 7;
  doc.text(quotation.customer_name, 10, y);
  y += 6;
  doc.text(quotation.customer_phone, 10, y);
  y += 6;
  doc.text(quotation.customer_address, 10, y);

  /* ITEMS TABLE */
  autoTable(doc, {
    startY: y + 10,
    headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    styles: { fontSize: 10 },
    head: [["#", "Description", "Qty", "Unit Price (₦)", "Total (₦)"]],
    body: quotation.items.map((it, i) => [
      i + 1,
      it.material_name,
      it.quantity,
      Number(it.unit_price).toLocaleString(),
      Number(it.total_price).toLocaleString(),
    ]),
  });

  /* PAYMENT SUMMARY */
  const sy = doc.lastAutoTable.finalY + 15;
  doc.setFont("Helvetica", "bold");
  doc.text("PAYMENT SUMMARY", 10, sy);

  doc.setFont("Helvetica", "normal");
  doc.text(`Subtotal: ₦${Number(quotation.subtotal).toLocaleString()}`, 10, sy + 8);
  doc.text(`Discount: ₦${Number(quotation.discount_amount).toLocaleString()}`, 10, sy + 16);
  doc.text(`VAT: ₦${Number(quotation.vat_amount).toLocaleString()}`, 10, sy + 24);

  doc.setFont("Helvetica", "bold");
  doc.text(`TOTAL DUE: ₦${Number(quotation.total).toLocaleString()}`, 10, sy + 40);

  /* SIGNATURE */
  doc.setFont("Helvetica", "normal");
  doc.text("______________________________", 10, sy + 70);
  doc.text("Authorized Signature", 10, sy + 75);

  /* FOOTER */
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text("Powered by SFV Technology  |  www.sfvtech.com.ng", pageWidth / 2, 290, {
    align: "center",
  });

  doc.save(`Invoice-${quotation.ref_no}.pdf`);
};
