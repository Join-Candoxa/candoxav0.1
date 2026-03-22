// components/profile/PublicProfile.tsx — Public-facing profile, no auth needed
'use client'

import { useRouter } from 'next/navigation'

const platformColor: Record<string, string> = {
  YouTube: 'bg-red-600',
  'X (Twitter)': 'bg-black border border-white/20',
  Instagram: 'bg-pink-600',
  LinkedIn: 'bg-blue-700',
  GitHub: 'bg-gray-700',
  TikTok: 'bg-black border border-white/20',
  Medium: 'bg-green-700',
  Substack: 'bg-orange-600',
  Other: 'bg-blue-900',
}

type Props = {
  profile: any
  entries: any[]
  trackerCount: number
}

export default function PublicProfile({ profile, entries, trackerCount }: Props) {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-black">
      <div className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => router.push('/')}
        >
          <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center">
            <div className="w-3.5 h-3.5 rounded-full bg-black" />
          </div>
          <span className="text-white font-bold text-sm">Candoxa</span>
        </div>
        <button
          onClick={() => router.push('/onboarding')}
          className="bg-blue-600 hover:bg-blue-500 transition-colors text-white text-sm px-4 py-2 rounded-full"
        >
          Get Started
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="bg-[#0A0A0F] border border-white/8 rounded-2xl p-8 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                {profile.display_name?.[0]?.toUpperCase() || profile.username?.[0]?.toUpperCase()}
              </div>
              <div>
                <h1 className="text-white text-xl font-bold">
                  {profile.display_name || profile.username}
                </h1>
                <p className="text-white/40 text-sm">@{profile.username}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-blue-900/30 border border-blue-500/30 rounded-full px-3 py-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-blue-400 text-xs font-medium">Candoxa Verified</span>
            </div>
          </div>

          {profile.bio && (
            <p className="text-white/50 text-sm mb-6">{profile.bio}</p>
          )}

          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Secured Entries', value: entries.length },
              { label: 'Tracked by', value: trackerCount },
              { label: 'Profile Strength', value: profile.profile_strength || 0 },
            ].map((stat) => (
              <div key={stat.label} className="bg-black/30 rounded-xl p-4 text-center">
                <p className="text-white text-xl font-bold">{stat.value}</p>
                <p className="text-white/40 text-xs mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <h2 className="text-white font-bold text-lg mb-4">Secured Records</h2>

        {entries.length === 0 ? (
          <div className="bg-[#0A0A0F] border border-white/8 rounded-2xl p-10 text-center">
            <p className="text-white/30 text-sm">No public entries yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="bg-[#0A0A0F] border border-white/8 rounded-2xl p-5"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                      platformColor[entry.platform] || 'bg-blue-900'
                    }`}
                  >
                    {entry.platform?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm mb-1">{entry.title}</p>
                    {entry.description && (
                      <p className="text-white/40 text-xs mb-3 line-clamp-2">
                        {entry.description}
                      </p>
                    )}
                    {entry.screenshot_url && (
                      <img
                        src={entry.screenshot_url}
                        alt="screenshot"
                        className="w-full rounded-xl mb-3 max-h-48 object-cover"
                      />
                    )}
                    <div className="bg-black/30 border border-white/5 rounded-xl p-3 mb-3">
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: 'Platform', value: entry.platform },
                          {
                            label: 'Secured On',
                            value: new Date(entry.secured_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            }),
                          },
                          { label: 'Status', value: 'Secured · Indelible' },
                          {
                            label: 'Chain',
                            value: entry.chain
                              ? entry.chain + ' · #' + entry.block_number
                              : 'Base',
                          },
                        ].map((row) => (
                          <div key={row.label}>
                            <p className="text-white/30 text-xs">{row.label}</p>
                            <p className="text-white/60 text-xs font-medium">{row.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="bg-blue-900/30 text-blue-400 text-xs px-2 py-0.5 rounded-full border border-blue-500/20">
                        Secured
                      </span>
                      <a
                        href={entry.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/30 text-xs hover:text-white transition-colors"
                      >
                        identify
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 bg-gradient-to-r from-blue-900/20 to-blue-800/20 border border-blue-500/20 rounded-2xl p-8 text-center">
          <h3 className="text-white font-bold text-lg mb-2">Own Your Digital Identity</h3>
          <p className="text-white/40 text-sm mb-6">
            Create your permanent, blockchain-verified record of everything you have built.
          </p>
          <button
            onClick={() => router.push('/onboarding')}
            className="bg-blue-600 hover:bg-blue-500 transition-colors text-white font-medium px-8 py-3 rounded-full"
          >
            Secure Your Identity
          </button>
        </div>
      </div>
    </div>
  )
}