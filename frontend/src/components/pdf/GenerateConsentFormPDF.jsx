import jsPDF from "jspdf";

export const generateConsentFormPDF = (quotation, settings) => {
  const doc = new jsPDF("p", "mm", "a4");

  const pageWidth = doc.internal.pageSize.getWidth();

  /* ------------ HEADER ------------- */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(settings.company_name || "SFV TECH", pageWidth / 2, 15, {
    align: "center",
  });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  if (settings.company_address)
    doc.text(settings.company_address, pageWidth / 2, 22, { align: "center" });

  if (settings.company_phone)
    doc.text(`Phone: ${settings.company_phone}`, pageWidth / 2, 28, {
      align: "center",
    });

  if (settings.company_email)
    doc.text(`Email: ${settings.company_email}`, pageWidth / 2, 34, {
      align: "center",
    });

  /* ------------ TITLE ------------- */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("CUSTOMER CONSENT & SATISFACTION FORM", pageWidth / 2, 50, {
    align: "center",
  });

  let y = 65;

  /* ------------ PROJECT INFO ------------- */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Project Title:", 10, y);
  doc.setFont("helvetica", "normal");
  doc.text(quotation.project_title || quotation.quote_for || "-", 45, y);

  y += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Job Ref:", 10, y);
  doc.setFont("helvetica", "normal");
  doc.text(quotation.ref_no || "-", 45, y);

  y += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Customer Name:", 10, y);
  doc.setFont("helvetica", "normal");
  doc.text(quotation.customer_name || "-", 45, y);

  y += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Customer Address:", 10, y);
  doc.setFont("helvetica", "normal");
  doc.text(quotation.customer_address || "-", 45, y);

  y += 15;

  /* ------------ CONSENT PARAGRAPH ------------- */
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  const paragraph = `
I, ______________________________________________, hereby testify and confirm that the work titled 
"${quotation.project_title || quotation.quote_for}" carried out at my premises by 
${settings.company_name || "SFV TECH"} has been satisfactorily completed.

I certify that:

• All materials used for the project meet acceptable standards.
• The installation/workmanship has been executed professionally.
• I have inspected the completed work and I am satisfied with the outcome.
• Any additional wiring, electrical load reconnection, or civil work requested will attract separate charges.
• I acknowledge that the company shall not be held liable for misuse, overloading, or unauthorized modifications after handover.

By signing below, I accept full responsibility for the system/work as installed.
`;

  const textLines = doc.splitTextToSize(paragraph, pageWidth - 20);
  doc.text(textLines, 10, y);

  y += textLines.length * 6 + 20;

  /* ------------ SIGNATURE AREA ------------- */
  doc.setFont("helvetica", "bold");
  doc.text("Customer Signature:", 10, y);
  doc.line(60, y, pageWidth - 20, y);

  y += 15;
  doc.text("Date:", 10, y);
  doc.line(25, y, 80, y);

  /* ------------ SAVE FILE ------------- */
  doc.save(`ConsentForm-${quotation.ref_no || "SFV"}.pdf`);
};

export default generateConsentFormPDF;
