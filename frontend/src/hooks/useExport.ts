import { useCallback } from 'react';
import { unparse } from 'papaparse'; // FIXED: unparse, not parse
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from './useToast';

interface ExportOptions {
  filename: string;
  data: Record<string, unknown>[];
  columns?: { header: string; accessor: string }[];
}

export function useExport() {
  const { addToast } = useToast();

  const exportToCSV = useCallback(({ filename, data }: ExportOptions) => {
    try {
      if (!data || data.length === 0) {
        addToast({
          title: 'Export Failed',
          message: 'No data available to export.',
          type: 'error',
          duration: 3000,
        });
        return;
      }

      // FIXED: Use unparse() to convert objects → CSV string
      const csvString = unparse(data, {
        header: true,
        skipEmptyLines: true,
      });

      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);

      addToast({
        title: 'Export Complete',
        message: `${filename}.csv has been downloaded.`,
        type: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('CSV export error:', error);
      addToast({
        title: 'Export Failed',
        message: 'Could not generate CSV file. Please try again.',
        type: 'error',
        duration: 5000,
      });
    }
  }, [addToast]);

  const exportToPDF = useCallback(({ filename, data, columns }: ExportOptions) => {
    try {
      if (!data || data.length === 0) {
        addToast({
          title: 'Export Failed',
          message: 'No data available to export.',
          type: 'error',
          duration: 3000,
        });
        return;
      }

      const doc = new jsPDF();
      const headers = columns?.map(c => c.header) || Object.keys(data[0] || {});
      const accessors = columns?.map(c => c.accessor) || headers;
      
      const rows = data.map(row => 
        accessors.map(acc => String(row[acc] ?? '-'))
      );

      autoTable(doc, {
        head: [headers],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [122, 28, 44] },
        styles: { fontSize: 8, cellPadding: 2 },
        margin: { top: 20 },
      });

      doc.text(`KNUST Library - ${filename}`, 14, 15);
      doc.save(`${filename}.pdf`);

      addToast({
        title: 'Export Complete',
        message: `${filename}.pdf has been downloaded.`,
        type: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('PDF export error:', error);
      addToast({
        title: 'Export Failed',
        message: 'Could not generate PDF file. Please try again.',
        type: 'error',
        duration: 5000,
      });
    }
  }, [addToast]);

  return { exportToCSV, exportToPDF };
}