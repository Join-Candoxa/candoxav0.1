// components/onboarding/StepLoading.tsx — Wallet setup loading screen
export default function StepLoading() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="bg-[#0D0D1A] border border-white/10 rounded-2xl p-10 flex flex-col items-center gap-4">
        {/* Spinning ring */}
        <div className="w-16 h-16 rounded-full border-4 border-white/20 border-t-white animate-spin" />
        <h2 className="text-white font-bold text-xl">Setting up your permanent identity...</h2>
        <p className="text-white/40 text-sm">Securing your foundation.</p>
      </div>
    </div>
  )
}