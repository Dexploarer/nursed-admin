import { jsPDF } from 'jspdf';

/**
 * Export lab content to PDF
 */
export async function exportLabContentToPDF(content: string, title: string = 'Lab Content') {
  const doc = new jsPDF();
  const timestamp = new Date().toLocaleDateString();

  // Add header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('NursEd Admin - Lab Content', 14, 20);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${timestamp}`, 14, 28);
  doc.text(`Title: ${title}`, 14, 33);

  // Convert HTML content to plain text (simplified)
  // Remove HTML tags and extract text
  const textContent = content
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();

  // Split text into lines that fit the page width
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const maxWidth = pageWidth - (margin * 2);
  const lineHeight = 7;
  let y = 45;

  // Simple text wrapping
  const words = textContent.split(/\s+/);
  let line = '';

  for (const word of words) {
    const testLine = line + (line ? ' ' : '') + word;
    const textWidth = doc.getTextWidth(testLine);

    if (textWidth > maxWidth && line) {
      doc.text(line, margin, y);
      y += lineHeight;
      line = word;

      // New page if needed
      if (y > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        y = 20;
      }
    } else {
      line = testLine;
    }
  }

  if (line) {
    doc.text(line, margin, y);
  }

  // Save the PDF
  doc.save(`${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.pdf`);
}
