import { NextRequest, NextResponse } from 'next/server';
import pdf from 'pdf-parse';
import * as xlsx from 'xlsx';

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
            const data = await pdf(buffer);
            extractedText = data.text;
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
