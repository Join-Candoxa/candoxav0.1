// app/api/metadata/route.ts — Fetches title, description, image from any URL
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'No URL provided' }, { status: 400 })

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Candoxa/1.0)' },
    })
    const html = await res.text()

    const getTag = (name: string) => {
      const match =
        html.match(new RegExp(`<meta[^>]*property=["']og:${name}["'][^>]*content=["']([^"']+)["']`, 'i')) ||
        html.match(new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i')) ||
        html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:${name}["']`, 'i'))
      return match?.[1] || null
    }

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)

    const platform = detectPlatform(url)

    return NextResponse.json({
      title: getTag('title') || titleMatch?.[1]?.trim() || '',
      description: getTag('description') || '',
      image: getTag('image') || '',
      platform,
      url,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch metadata' }, { status: 500 })
  }
}

function detectPlatform(url: string): string {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube'
  if (url.includes('twitter.com') || url.includes('x.com')) return 'X (Twitter)'
  if (url.includes('instagram.com')) return 'Instagram'
  if (url.includes('linkedin.com')) return 'LinkedIn'
  if (url.includes('github.com')) return 'GitHub'
  if (url.includes('tiktok.com')) return 'TikTok'
  if (url.includes('medium.com')) return 'Medium'
  if (url.includes('substack.com')) return 'Substack'
  return 'Other'
}