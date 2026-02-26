import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB
const ALLOWED_TYPES = [
  'application/pdf',
  'video/mp4',
  'video/webm',
  'video/quicktime', // .mov
]

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
})

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
}

export async function POST(request: NextRequest) {
  try {
    const authUser = getAuthUser(request)
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!process.env.AWS_BUCKET_NAME) {
      return NextResponse.json(
        { error: 'AWS S3 is not configured' },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large (max 50 MB)' },
        { status: 400 }
      )
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: PDF, MP4, WebM, MOV' },
        { status: 400 }
      )
    }

    const safeName = sanitizeFileName(file.name)
    const s3Key = `resources/${Date.now()}_${safeName}`

    const bytes = await file.arrayBuffer()
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: s3Key,
      Body: new Uint8Array(bytes),
      ContentType: file.type,
    })
    await s3Client.send(command)

    return NextResponse.json({ s3Key })
  } catch (error: unknown) {
    console.error('Resource upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}
