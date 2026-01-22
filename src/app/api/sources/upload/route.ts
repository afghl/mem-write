import { NextRequest } from 'next/server';
import { enqueueSourceUpload } from '@/server/services/sourceUploadService';
import { getYouTubeVideoId } from '@/server/domain/etl/steps/load';

const isValidHttpUrl = (value: string) => {
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
};

export async function POST(request: NextRequest) {
    const formData = await request.formData();
    const file = formData.get('file');
    const url = formData.get('url');
    const projectId = formData.get('project_id');
    const uploadFile = file instanceof File ? file : null;

    if (!projectId || typeof projectId !== 'string' || !projectId.trim()) {
        return new Response(JSON.stringify({ error: 'Project id is required.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    if (!file && !url) {
        return new Response(JSON.stringify({ error: 'File or URL is required.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    if (file && !uploadFile) {
        return new Response(JSON.stringify({ error: 'Invalid file payload.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    if (
        uploadFile &&
        uploadFile.type !== 'application/pdf' &&
        !uploadFile.name.toLowerCase().endsWith('.pdf')
    ) {
        return new Response(JSON.stringify({ error: 'Only PDF files are supported.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    if (url && typeof url !== 'string') {
        return new Response(JSON.stringify({ error: 'Invalid URL payload.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const trimmedUrl = typeof url === 'string' ? url.trim() : '';
    if (!uploadFile && trimmedUrl && !isValidHttpUrl(trimmedUrl)) {
        return new Response(JSON.stringify({ error: 'Invalid URL format.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    if (!uploadFile && trimmedUrl && !getYouTubeVideoId(trimmedUrl)) {
        return new Response(JSON.stringify({ error: 'Only YouTube URLs are supported.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    if (uploadFile) {
        const buffer = Buffer.from(await uploadFile.arrayBuffer());
        void enqueueSourceUpload({
            projectId: projectId.trim(),
            file: {
                filename: uploadFile.name,
                data: buffer,
            },
        }).catch((error) => {
            console.error('Source upload ETL failed:', error);
        });
    } else if (trimmedUrl) {
        void enqueueSourceUpload({ projectId: projectId.trim(), url: trimmedUrl }).catch((error) => {
            console.error('Source upload ETL failed:', error);
        });
    }

    return new Response(JSON.stringify({ status: 'accepted' }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
    });
}
