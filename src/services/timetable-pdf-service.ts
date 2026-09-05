import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { class_type, timetableEntry, staff } from '@/lib/data-types';

export class TimetablePDFService {
    static generateTimetablePDF(
        schoolData: { name: string; mainLogoUrl?: string; academicYear?: string },
        classData: class_type,
        entries: timetableEntry[],
        teachers: staff[]
    ) {
        // Format A4 Paysage
        const doc = new jsPDF('landscape', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();

        // 1. En-tête
        let startY = 15;
        
        if (schoolData.mainLogoUrl) {
            try {
                doc.addImage(schoolData.mainLogoUrl, 'PNG', 14, 10, 20, 20);
            } catch (e) {
                console.error("Erreur d'intégration du logo:", e);
            }
        }

        doc.setFontSize(22);
        doc.setTextColor(15, 23, 42); // slate-900
        doc.setFont('helvetica', 'bold');
        doc.text(`Emploi du Temps : ${classData.name}`, 40, startY + 5);

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.setFont('helvetica', 'normal');
        doc.text(schoolData.name, 40, startY + 11);
        doc.text(`Année scolaire: ${schoolData.academicYear || classData.academicYear}`, 40, startY + 16);

        // 2. Préparation des données du tableau
        const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
        const timeSlots = [
            { label: '08:00 - 09:00', start: '08:00', end: '09:00' },
            { label: '09:00 - 10:00', start: '09:00', end: '10:00' },
            { label: '10:00 - 10:15', type: 'Pause', name: 'RÉCRÉATION' },
            { label: '10:15 - 11:15', start: '10:15', end: '11:15' },
            { label: '11:15 - 12:15', start: '11:15', end: '12:15' },
            { label: '12:15 - 14:00', type: 'Pause', name: 'PAUSE MÉRIDIENNE' },
            { label: '14:00 - 15:00', start: '14:00', end: '15:00' },
            { label: '15:00 - 16:00', start: '15:00', end: '16:00' }
        ];

        // Hex to RGB parser for jsPDF
        const hexToRgb = (hex: string) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? [
                parseInt(result[1], 16),
                parseInt(result[2], 16),
                parseInt(result[3], 16)
            ] as [number, number, number] : [241, 245, 249] as [number, number, number];
        };

        const tableBody = timeSlots.map(slot => {
            if (slot.type === 'Pause') {
                return [slot.label, { content: slot.name, colSpan: 6, styles: { halign: 'center', fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [100, 116, 139] } }];
            }

            const row = [slot.label];
            days.forEach(day => {
                const course = entries.find(e => e.day === day && e.startTime <= slot.start! && e.endTime >= slot.end!);
                if (course) {
                    const teacher = teachers.find(t => t.id === course.teacherId);
                    const teacherName = teacher ? `${teacher.firstName[0]}. ${teacher.lastName}` : '';
                    const text = `${course.subject.toUpperCase()}\n${teacherName}${course.classroom ? `\nSalle: ${course.classroom}` : ''}`;
                    row.push({ 
                        content: text, 
                        styles: { 
                            fillColor: hexToRgb(course.color || '#e2e8f0'),
                            textColor: [255, 255, 255],
                            fontStyle: 'bold'
                        }
                    } as any);
                } else {
                    row.push(''); // Vide
                }
            });
            return row;
        });

        autoTable(doc, {
            startY: 40,
            head: [['Horaires', ...days]],
            body: tableBody as any,
            theme: 'grid',
            headStyles: {
                fillColor: [15, 23, 42],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'center',
                fontSize: 10
            },
            bodyStyles: {
                halign: 'center',
                valign: 'middle',
                fontSize: 9,
                cellPadding: 4,
            },
            columnStyles: {
                0: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105], cellWidth: 35 }
            },
            styles: {
                lineColor: [226, 232, 240],
                lineWidth: 0.1
            }
        });

        doc.save(`Emploi_du_Temps_${classData.name}.pdf`);
    }
}
