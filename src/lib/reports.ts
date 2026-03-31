import jsPDF from "jspdf";
import "jspdf-autotable";

interface ReportOptions {
  title: string;
  subtitle?: string;
  filename: string;
  columns: string[];
  data: any[][];
  tenantName: string;
  userName: string;
}

export const generatePDFReport = ({
  title,
  subtitle,
  filename,
  columns,
  data,
  tenantName,
  userName
}: ReportOptions) => {
  const doc = new jsPDF() as any;
  const timestamp = new Date().toLocaleString();

  // Color Palette (matching theme)
  const colors = {
    primary: [5, 150, 105], // emerald-600
    dark: [15, 23, 42],     // slate-900
    light: [248, 250, 252], // slate-50
    slate: [100, 116, 139]  // slate-500
  };

  // Header Background
  doc.setFillColor(...colors.primary);
  doc.rect(0, 0, 210, 40, "F");

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(title, 20, 25);

  // Subtitle
  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(subtitle, 20, 32);
  }

  // Tenant Info (Right aligned)
  doc.setFontSize(8);
  doc.text(tenantName.toUpperCase(), 190, 20, { align: "right" });
  doc.text(`Generado por: ${userName}`, 190, 25, { align: "right" });
  doc.text(timestamp, 190, 30, { align: "right" });

  // Table
  doc.autoTable({
    startY: 50,
    head: [columns],
    body: data,
    theme: "grid",
    headStyles: {
      fillColor: colors.primary,
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: "bold",
      halign: "center",
      cellPadding: 4
    },
    bodyStyles: {
      fontSize: 9,
      textColor: colors.dark,
      cellPadding: 3
    },
    alternateRowStyles: {
      fillColor: colors.light
    },
    margin: { left: 20, right: 20 },
    didDrawPage: (data: any) => {
      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(...colors.slate);
      doc.text(
        `Pagina ${pageCount} de ${pageCount} - Generado por Velora POS SaaS`,
        105,
        290,
        { align: "center" }
      );
    }
  });

  // Save PDF
  doc.save(`${filename}_${new Date().getTime()}.pdf`);
};
