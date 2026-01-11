import { NextRequest, NextResponse } from 'next/server';
import * as xlsx from 'xlsx';

// Helper to extract text from PDF buffer using pdfjs-dist (Legacy build for Node)
async function extractPdfText(buffer: Buffer): Promise<string> {
    try {
        // Dynamic import to avoid build issues
        // @ts-ignore
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.js');

        // Disable worker for Node environment
        pdfjs.GlobalWorkerOptions.workerSrc = '';

        const data = new Uint8Array(buffer);
        const loadingTask = pdfjs.getDocument({
            data,
            useSystemFonts: true,
            disableFontFace: true,
        });

        const doc = await loadingTask.promise;
        let fullText = '';

        for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');

            fullText += pageText + '\n';
        }

        return fullText;
    } catch (error) {
        console.error("PDF Extraction Error:", error);
        throw new Error("Impossible de lire le fichier PDF.");
    }
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        let extractedText = '';

        if (file.type === 'application/pdf') {
            extractedText = await extractPdfText(buffer);
        } else if (
            file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.type === 'application/vnd.ms-excel'
        ) {
            const workbook = xlsx.read(buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            extractedText = xlsx.utils.sheet_to_txt(worksheet);
        } else {
            return NextResponse.json({ error: 'Format de fichier non supporté. PDF ou Excel uniquement.' }, { status: 400 });
        }

        return NextResponse.json({
            text: extractedText,
            filename: file.name
        });

    } catch (error: any) {
        console.error('Erreur lors du parsing du document:', error);
        return NextResponse.json({ error: 'Erreur lors de l\'analyse du document' }, { status: 500 });
    }
}
