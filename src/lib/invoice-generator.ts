import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { supabase } from './supabase';

interface InvoiceData {
    businessName: string;
    invoiceNumber: string;
    date: string;
    items: { description: string; amount: number }[];
    total: number;
}

/**
 * Generates a professional PDF invoice for a business.
 */
export async function generateInvoicePDF(data: InvoiceData) {
    const doc = new jsPDF();
    const margin = 20;

    // Header
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229); // Indigo-600
    doc.text('SASIC POS PLATFORM', margin, 25);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Official Subscription Invoice', margin, 32);

    // Business Info
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO:', margin, 50);
    doc.setFont('helvetica', 'normal');
    doc.text(data.businessName, margin, 57);

    // Invoice Meta
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE #:', 140, 50);
    doc.text('DATE:', 140, 57);
    doc.setFont('helvetica', 'normal');
    doc.text(data.invoiceNumber, 170, 50);
    doc.text(data.date, 170, 57);

    // Table
    (doc as any).autoTable({
        startY: 70,
        head: [['Description', 'Amount']],
        body: data.items.map(i => [i.description, `GHS ${i.amount.toFixed(2)}`]),
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        margin: { left: margin, right: margin }
    });

    // Total
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', 140, finalY);
    doc.text(`GHS ${data.total.toFixed(2)}`, 170, finalY);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Thank you for choosing SASIC. This is a computer-generated invoice.', margin, 280);

    return doc;
}

/**
 * Creates an invoice record and returns the PDF object.
 */
export async function createAndSaveInvoice(businessId: string, amount: number, description: string) {
    const invoiceNumber = `INV-${Math.floor(100000 + Math.random() * 900000)}`;
    
    // 1. Save to DB
    const { data, error } = await supabase.from('invoices').insert({
        business_id: businessId,
        invoice_number: invoiceNumber,
        amount,
        status: 'paid', // Assuming manual generation is usually for successful payments
        created_at: new Date().toISOString()
    }).select().single();

    if (error) throw error;

    // 2. Return PDF 
    const pdf = await generateInvoicePDF({
        businessName: 'Business Owner', // Could fetch actual name
        invoiceNumber,
        date: new Date().toLocaleDateString(),
        items: [{ description, amount }],
        total: amount
    });

    return { invoice: data, pdf };
}
