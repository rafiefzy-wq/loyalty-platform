export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-2 text-2xl font-bold text-gray-900">
            <span className="text-3xl">🎫</span> StampPass
          </a>
          <p className="mt-1 text-sm text-gray-500">Loyalty cards your customers actually keep</p>
        </div>
        {children}
      </div>
    </div>
  )
}
