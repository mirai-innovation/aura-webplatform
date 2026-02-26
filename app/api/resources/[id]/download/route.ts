import { NextRequest, NextResponse } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import connectDB from '@/lib/mongodb'
import Resource from '@/models/Resource'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = getAuthUser(request)
    if (!authUser?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!process.env.AWS_BUCKET_NAME) {
      return NextResponse.json(
        { error: 'AWS configuration missing' },
        { status: 500 }
      )
    }

    const { id } = await params
    await connectDB()
    const resource = await Resource.findById(id)
    if (!resource?.s3Key) {
      return NextResponse.json(
        { error: 'Resource has no file to download' },
        { status: 404 }
      )
    }

    const fileName = resource.s3Key.split('/').pop() || 'download'
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: resource.s3Key,
      ResponseContentDisposition: `attachment; filename="${fileName}"`,
    })
    const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

    return NextResponse.json({ downloadUrl, fileName })
  } catch (error: unknown) {
    console.error('Resource download URL error:', error)
    return NextResponse.json(
      { error: 'Failed to get download URL' },
      { status: 500 }
    )
  }
}
