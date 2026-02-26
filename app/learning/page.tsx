'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import { useAuthStore } from '@/store/authStore'
import { FiPlay, FiDownload, FiClock, FiBookOpen, FiExternalLink } from 'react-icons/fi'

interface Resource {
  id: string
  title: string
  description: string
  type: 'video' | 'pdf' | 'link'
  url?: string
  s3Key?: string
  duration?: string
  size?: string
  level?: string
  order: number
  visible: boolean
}

export default function LearningPage() {
  const router = useRouter()
  const { isAuthenticated, hydrated, initialize } = useAuthStore()
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (!hydrated) return
    if (!isAuthenticated) router.push('/login')
  }, [hydrated, isAuthenticated, router])

  useEffect(() => {
    if (!isAuthenticated) return
    const fetchResources = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/resources')
        if (res.ok) {
          const data = await res.json()
          setResources(data.resources || [])
        }
      } catch (e) {
        console.error('Resources fetch:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchResources()
  }, [isAuthenticated])

  const videos = resources.filter((r) => r.type === 'video').sort((a, b) => a.order - b.order)
  const pdfs = resources.filter((r) => r.type === 'pdf').sort((a, b) => a.order - b.order)
  const links = resources.filter((r) => r.type === 'link').sort((a, b) => a.order - b.order)

  const getResourceUrl = async (r: Resource): Promise<string | null> => {
    if (r.s3Key) {
      try {
        const res = await fetch(`/api/resources/${r.id}/download`)
        if (!res.ok) return null
        const data = await res.json()
        return data.downloadUrl || null
      } catch {
        return null
      }
    }
    return r.url || null
  }

  const handlePlayVideo = async (r: Resource) => {
    const url = await getResourceUrl(r)
    if (url) window.open(url, '_blank')
    else alert(`Video: ${r.title}`)
  }

  const handleDownloadGuide = async (r: Resource) => {
    const url = await getResourceUrl(r)
    if (url) window.open(url, '_blank')
    else alert(`Download: ${r.title}`)
  }

  const handleOpenLink = async (r: Resource) => {
    const url = await getResourceUrl(r)
    if (url) window.open(url, '_blank')
  }

  if (!hydrated || !isAuthenticated) return null

  return (
    <Layout>
      <div>
        <div className="mb-8">
          <h1 className="text-4xl font-display font-bold mb-2">
            Learning <span className="text-gradient">Center</span>
          </h1>
          <p className="text-white/60">
            Video masterclasses and downloadable guides (from database)
          </p>
        </div>

        {loading ? (
          <div className="glass-card-hover p-12 text-center">
            <p className="text-white/60">Loading resources...</p>
          </div>
        ) : (
          <>
            {/* Video Masterclasses */}
            <div className="mb-12">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <FiPlay className="text-electric-cyan" />
                Video Masterclasses
              </h2>
              {videos.length === 0 ? (
                <div className="glass-card-hover p-8 text-center">
                  <p className="text-white/60">No video content available yet. Check back later.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {videos.map((r) => (
                    <div
                      key={r.id}
                      className={`glass-card-hover overflow-hidden group ${(r.url || r.s3Key) ? 'cursor-pointer' : 'cursor-default opacity-90'}`}
                      onClick={() => (r.url || r.s3Key) && handlePlayVideo(r)}
                    >
                      <div className="relative aspect-video bg-gradient-to-br from-electric-cyan/20 to-neon-violet/20 flex items-center justify-center">
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all flex items-center justify-center">
                          <div className="w-16 h-16 rounded-full bg-electric-cyan/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <FiPlay className="text-deep-space text-2xl ml-1" />
                          </div>
                        </div>
                        {r.level && (
                          <span className="absolute top-2 right-2 px-2 py-1 text-xs bg-neon-violet/80 rounded">
                            {r.level}
                          </span>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold mb-2 line-clamp-2">{r.title}</h3>
                        <p className="text-sm text-white/60 mb-3 line-clamp-2">{r.description}</p>
                        {r.duration && (
                          <div className="flex items-center gap-2 text-xs text-white/40">
                            <FiClock />
                            <span>{r.duration}</span>
                          </div>
                        )}
                        {!r.url && !r.s3Key && (
                          <p className="text-xs text-white/50 mt-2">Link not configured</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PDF Guides */}
            <div className="mb-12">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <FiDownload className="text-electric-cyan" />
                Downloadable PDF Guides
              </h2>
              {pdfs.length === 0 ? (
                <div className="glass-card-hover p-8 text-center">
                  <p className="text-white/60">No PDF content available yet. Check back later.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {pdfs.map((r) => (
                    <div key={r.id} className="glass-card-hover p-6 flex items-start gap-4">
                      <div className="p-3 bg-electric-cyan/20 rounded-lg">
                        <FiBookOpen className="text-2xl text-electric-cyan" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-2">{r.title}</h3>
                        <p className="text-sm text-white/60 mb-4">{r.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-xs text-white/40">
                            <span>PDF</span>
                            {r.size && <span>•</span>}
                            {r.size && <span>{r.size}</span>}
                          </div>
                          {(r.url || r.s3Key) ? (
                            <button
                              onClick={() => handleDownloadGuide(r)}
                              className="btn-secondary text-sm px-4 py-2 flex items-center gap-2"
                            >
                              <FiDownload />
                              Open / Download
                            </button>
                          ) : (
                            <span className="text-xs text-white/50">Link not configured</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Links */}
            {links.length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                  <FiExternalLink className="text-electric-cyan" />
                  External Links
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {links.map((r) => (
                    <div key={r.id} className="glass-card-hover p-6 flex items-start gap-4">
                      <div className="p-3 bg-neon-violet/20 rounded-lg">
                        <FiExternalLink className="text-2xl text-neon-violet" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-2">{r.title}</h3>
                        <p className="text-sm text-white/60 mb-4">{r.description}</p>
                        {(r.url || r.s3Key) ? (
                          <button
                            onClick={() => handleOpenLink(r)}
                            className="btn-secondary text-sm px-4 py-2 flex items-center gap-2"
                          >
                            <FiExternalLink />
                            Open link
                          </button>
                        ) : (
                          <span className="text-xs text-white/50">Link not configured</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
