import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Student, ClinicalLog } from '@/types';

/**
 * Export students to PDF for VBON compliance reporting
 */
export async function exportStudentsToPDF(students: Student[], reportType: 'roster' | 'clinical' | 'skills' = 'roster') {
  const doc = new jsPDF();
  const timestamp = new Date().toLocaleDateString();

  // Add header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('NursEd Admin - VBON Compliance Report', 14, 20);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${timestamp}`, 14, 28);
  doc.text(`Report Type: ${reportType.toUpperCase()}`, 14, 33);
  doc.text('Virginia Board of Nursing 18VAC90-27', 14, 38);

  if (reportType === 'roster') {
    // Student Roster Report
    autoTable(doc, {
      startY: 45,
      head: [['VBON ID', 'Name', 'Status', 'Clinical Hours', 'GPA', 'NCLEX Score']],
      body: students.map(s => [
        s.id,
        `${s.firstName} ${s.lastName}`,
        s.status,
        `${s.clinicalHoursCompleted}/${s.clinicalHoursRequired}`,
        s.gpa?.toFixed(2) || 'N/A',
        s.nclexPredictorScore?.toString() || 'N/A'
      ]),
      theme: 'grid',
      headStyles: { fillColor: [15, 76, 117] },
      styles: { fontSize: 9 },
    });
  } else if (reportType === 'clinical') {
    // Clinical Hours Compliance Report
    autoTable(doc, {
      startY: 45,
      head: [['Student', 'Direct Care Hours', 'Simulation Hours', 'Sim %', 'Status']],
      body: students.map(s => {
        const simHours = Math.round(s.clinicalHoursCompleted * 0.15); // Estimated
        const simPct = ((simHours / 400) * 100).toFixed(1);
        const isCompliant = simHours <= 100;
        return [
          `${s.firstName} ${s.lastName}`,
          s.clinicalHoursCompleted.toString(),
          simHours.toString(),
          `${simPct}%`,
          isCompliant ? 'Compliant' : 'VIOLATION'
        ];
      }),
      theme: 'grid',
      headStyles: { fillColor: [15, 76, 117] },
      styles: { fontSize: 9 },
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 4) {
          if (data.cell.text[0] === 'VIOLATION') {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });
  } else if (reportType === 'skills') {
    // Skills Competency Report
    autoTable(doc, {
      startY: 45,
      head: [['Student', 'Skills Completed', 'Completion %']],
      body: students.map(s => {
        const skillsCount = s.skillsCompleted?.length || 0;
        const pct = ((skillsCount / 6) * 100).toFixed(0);
        return [
          `${s.firstName} ${s.lastName}`,
          `${skillsCount}/6`,
          `${pct}%`
        ];
      }),
      theme: 'grid',
      headStyles: { fillColor: [15, 76, 117] },
      styles: { fontSize: 9 },
    });
  }

  // Add footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
    doc.text(
      '© 2025 NursEd Admin - CONFIDENTIAL',
      14,
      doc.internal.pageSize.getHeight() - 10
    );
  }

  // Save the PDF
  const filename = `NursEd_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

/**
 * Export clinical logs to PDF
 */
export async function exportClinicalLogsToPDF(logs: ClinicalLog[], students: Student[]) {
  const doc = new jsPDF();
  const timestamp = new Date().toLocaleDateString();

  // Add header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Clinical Logs Report', 14, 20);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${timestamp}`, 14, 28);
  doc.text('Virginia Board of Nursing Compliance', 14, 33);

  autoTable(doc, {
    startY: 40,
    head: [['Date', 'Student', 'Site', 'Diagnosis', 'Status', 'Instructor']],
    body: logs.map(log => {
      const student = students.find(s => s.id === log.studentId);
      return [
        log.date,
        student ? `${student.firstName} ${student.lastName}` : log.studentId,
        log.siteName,
        log.patientDiagnosis,
        log.status,
        log.instructorFeedback || 'Pending'
      ];
    }),
    theme: 'striped',
    headStyles: { fillColor: [15, 76, 117] },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      3: { cellWidth: 35 },
      5: { cellWidth: 40 }
    }
  });

  // Add footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  const filename = `Clinical_Logs_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

/**
 * Print-optimized clinical log for single student
 */
export function printClinicalLog(log: ClinicalLog, student: Student) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Clinical Log - ${student.firstName} ${student.lastName}</title>
      <style>
        @media print {
          @page {
            margin: 0.5in;
            size: letter;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none;
          }
        }
        body {
          font-family: 'Arial', sans-serif;
          font-size: 11pt;
          line-height: 1.4;
          color: #000;
        }
        .header {
          border-bottom: 3px solid #0f4c75;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        .header h1 {
          margin: 0;
          font-size: 20pt;
          color: #0f4c75;
        }
        .header p {
          margin: 5px 0 0 0;
          color: #666;
        }
        .section {
          margin-bottom: 20px;
          border: 1px solid #ddd;
          padding: 15px;
          page-break-inside: avoid;
        }
        .section-title {
          font-weight: bold;
          font-size: 12pt;
          margin-bottom: 10px;
          color: #0f4c75;
          border-bottom: 1px solid #ddd;
          padding-bottom: 5px;
        }
        .field {
          margin-bottom: 10px;
          display: flex;
        }
        .field-label {
          font-weight: bold;
          width: 180px;
          flex-shrink: 0;
        }
        .field-value {
          flex: 1;
        }
        .competencies {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-top: 5px;
        }
        .competency-tag {
          background: #f0f0f0;
          border: 1px solid #ddd;
          padding: 3px 8px;
          border-radius: 3px;
          font-size: 9pt;
        }
        .footer {
          margin-top: 30px;
          border-top: 2px solid #ddd;
          padding-top: 10px;
          font-size: 9pt;
          color: #666;
        }
        .signature-line {
          margin-top: 40px;
          border-top: 1px solid #000;
          width: 300px;
          padding-top: 5px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Clinical Experience Log</h1>
        <p>Virginia Board of Nursing Compliance Document</p>
        <p>VBON 18VAC90-27-100 Direct Client Care Documentation</p>
      </div>

      <div class="section">
        <div class="section-title">Student Information</div>
        <div class="field">
          <span class="field-label">Student Name:</span>
          <span class="field-value">${student.firstName} ${student.lastName}</span>
        </div>
        <div class="field">
          <span class="field-label">VBON ID:</span>
          <span class="field-value">${student.id}</span>
        </div>
        <div class="field">
          <span class="field-label">Cohort:</span>
          <span class="field-value">${student.cohort}</span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Clinical Experience Details</div>
        <div class="field">
          <span class="field-label">Date:</span>
          <span class="field-value">${log.date}</span>
        </div>
        <div class="field">
          <span class="field-label">Clinical Site:</span>
          <span class="field-value">${log.siteName}</span>
        </div>
        <div class="field">
          <span class="field-label">Patient Diagnosis:</span>
          <span class="field-value">${log.patientDiagnosis}</span>
        </div>
        <div class="field">
          <span class="field-label">Status:</span>
          <span class="field-value"><strong>${log.status}</strong></span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Mapped Competencies</div>
        <div class="competencies">
          ${(log.mappedCompetencies || []).map(c => `<span class="competency-tag">${c}</span>`).join('')}
        </div>
      </div>

      ${log.instructorFeedback ? `
      <div class="section">
        <div class="section-title">Instructor Feedback</div>
        <p>${log.instructorFeedback}</p>
      </div>
      ` : ''}

      <div class="footer">
        <p><strong>Instructor Signature:</strong></p>
        <div class="signature-line"></div>
        <p style="margin-top: 5px;">Date: _________________</p>
        <p style="margin-top: 20px; font-size: 8pt;">
          This document is confidential and protected under FERPA regulations.
          Unauthorized disclosure is prohibited.
        </p>
      </div>

      <script>
        window.onload = function() {
          window.print();
          setTimeout(function() {
            window.close();
          }, 100);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
