import { Download } from 'lucide-react';
import { TimeEntry, User } from '../types';
import { utils, writeFile } from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';

interface ExportButtonProps {
  data: TimeEntry[];
  users: User[];
  type: 'excel' | 'pdf';
  filename: string;
}

const ExportButton = ({ data, users, type, filename }: ExportButtonProps) => {
  const formatTimeEntry = (entry: TimeEntry) => {
    const user = users.find(u => u.id === entry.userId);
    const totalBreakTime = entry.breaks.reduce((total, breakItem) => {
      return total + (breakItem.duration || 0);
    }, 0);
    
    return {
      'Date': format(parseISO(entry.date), 'MM/dd/yyyy'),
      'Staff Name': user?.name || 'Unknown',
      'Clock In': entry.clockIn,
      'Clock Out': entry.clockOut || '-',
      'Break Time (minutes)': totalBreakTime,
      'Total Hours': entry.totalHours?.toFixed(2) || '-',
      'Status': entry.status
    };
  };

  const handleExport = () => {
    const formattedData = data.map(formatTimeEntry);

    if (type === 'excel') {
      const worksheet = utils.json_to_sheet(formattedData);
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, 'Time Entries');
      writeFile(workbook, `${filename}.xlsx`);
    } else {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(16);
      doc.text('Time Entries Report', 14, 15);
      doc.setFontSize(10);
      doc.text(`Generated on ${format(new Date(), 'MM/dd/yyyy HH:mm')}`, 14, 22);
      
      autoTable(doc, {
        head: [Object.keys(formattedData[0] || {})],
        body: formattedData.map(Object.values),
        startY: 30,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [37, 99, 235] }
      });
      
      doc.save(`${filename}.pdf`);
    }
  };

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
    >
      <Download className="h-4 w-4 mr-1" />
      Export {type.toUpperCase()}
    </button>
  );
};

export default ExportButton;