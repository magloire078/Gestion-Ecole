'use client';

import { useCallback } from 'react';

/**
 * Hook to handle printing a specific HTML content in a new window.
 * @param documentTitle The title of the printed document.
 */
export const usePrint = (documentTitle: string) => {
  const handlePrint = useCallback((printContent: string) => {
    if (printContent) {
      const printWindow = window.open('', '', 'height=800,width=800');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>${documentTitle}</title>
              <style>
                /* Basic print styles */
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                    line-height: 1.5;
                    color: #333;
                    -webkit-print-color-adjust: exact; 
                    print-color-adjust: exact; 
                }
                .printable-card { 
                    border: none !important; 
                    box-shadow: none !important; 
                    padding: 0 !important; 
                    margin: 0 auto;
                }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                img { max-width: 100%; height: auto; }
                .page-break { page-break-after: always; }
                @page { 
                    size: A4; 
                    margin: 20mm; 
                }
              </style>
            </head>
            <body>
        `);
        printWindow.document.write(printContent);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        // Use a timeout to ensure styles are loaded before printing
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
      }
    }
  }, [documentTitle]);

  return handlePrint;
};
