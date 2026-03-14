import { renderToBuffer } from '@react-pdf/renderer';
import { NextRequest, NextResponse } from 'next/server';
import { buildDocx } from '@/backend/export/docx-builder';
import { createExportPdfDocument } from '@/backend/export/pdf-document';
import { getAuthUser } from '@/backend/lib/auth';
import { createClient } from '@/backend/lib/supabase/server';
import type { Generation } from '@/shared/types';

function sanitizeSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-_]+/g, '-');
}

function fileBaseName(generation: Generation) {
  const tool = sanitizeSegment(generation.tool);
  return `civic-pulse-${tool}-${generation.id.slice(0, 8)}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const format = request.nextUrl.searchParams.get('format');

  if (format !== 'pdf' && format !== 'docx') {
    return NextResponse.json({ error: 'Invalid format. Use pdf or docx.' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('generations')
    .select('*')
    .eq('id', id)
    .eq('profile_id', user.id)
    .single<Generation>();

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const headerLocale = request.headers.get('x-locale');
  const locale = headerLocale && headerLocale.trim().length > 0
    ? headerLocale
    : data.locale;

  const baseName = fileBaseName(data);

  if (format === 'pdf') {
    const buffer = await renderToBuffer(
      createExportPdfDocument({ generation: data, locale }),
    );

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${baseName}.pdf"`,
      },
    });
  }

  const docxBuffer = await buildDocx(data, locale);

  return new NextResponse(new Uint8Array(docxBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${baseName}.docx"`,
    },
  });
}
