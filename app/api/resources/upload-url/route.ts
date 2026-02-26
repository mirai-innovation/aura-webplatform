import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const ALLOWED_TYPES = [
  'application/pdf',
  'video/mp4',
  'video/webm',
  'video/quicktime',
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

/** POST body: { fileName, contentType } — returns presigned PUT URL and s3Key for client-side upload (works in serverless/deployment). Your S3 bucket must allow CORS PUT from your app origin. */
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

    const body = await request.json()
    const { fileName, contentType } = body
    if (!fileName || !contentType) {
      return NextResponse.json(
        { error: 'fileName and contentType are required' },
        { status: 400 }
      )
    }
    if (!ALLOWED_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: PDF, MP4, WebM, MOV' },
        { status: 400 }
      )
    }

    const safeName = sanitizeFileName(fileName)
    const s3Key = `resources/${Date.now()}_${safeName}`

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: s3Key,
      ContentType: contentType,
    })
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 }) // 15 min

    return NextResponse.json({ uploadUrl, s3Key })
  } catch (error: unknown) {
    console.error('Upload URL error:', error)
    return NextResponse.json(
      { error: 'Failed to get upload URL' },
      { status: 500 }
    )
  }
}
