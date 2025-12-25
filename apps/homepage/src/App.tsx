import './App.css'

function App() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header */}
      <header className="bg-[#2b3e6b] text-white">
        <nav className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold">NullStack</span>
            </div>
            <div className="hidden md:flex space-x-6 text-sm">
              <a href="#features" className="hover:text-blue-300 transition">Features</a>
              <a href="#solutions" className="hover:text-blue-300 transition">Solutions</a>
              <a href="#pricing" className="hover:text-blue-300 transition">Pricing</a>
              <a href="#docs" className="hover:text-blue-300 transition">Documentation</a>
            </div>
          </div>
          <a href="http://localhost:3006" className="px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded text-sm font-semibold transition">
            SIGN UP
          </a>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="bg-[#2b3e6b] text-white py-32">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl">
            <h1 className="text-5xl font-bold mb-6 leading-tight">
              Open-source backend services for indie game developers
            </h1>
            <p className="text-xl mb-8 text-gray-200">
              Complete PlayFab alternative with no vendor lock-in
            </p>
            <a href="http://localhost:3006" className="inline-block px-8 py-4 bg-blue-500 hover:bg-blue-600 rounded font-semibold transition text-sm tracking-wide">
              SIGN UP FREE
            </a>
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold mb-16 text-center">Everything you need to build and operate a live game</h2>

          <div className="grid md:grid-cols-3 gap-16 max-w-6xl mx-auto">
            {/* Player Services */}
            <div className="text-left">
              <h3 className="text-xl font-bold mb-4">Player Services</h3>
              <p className="text-blue-600 mb-6 font-semibold cursor-pointer hover:underline">EXPLORE →</p>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-blue-600 mb-1">Authentication</h4>
                  <p className="text-sm text-gray-600">JWT tokens, secure passwords, developer and player authentication</p>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-600 mb-1">Player Profiles</h4>
                  <p className="text-sm text-gray-600">Manage player data, bans, and user management</p>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-600 mb-1">Matchmaking</h4>
                  <p className="text-sm text-gray-600">Player matching and lobby management systems</p>
                </div>
              </div>
            </div>

            {/* Game Operations */}
            <div className="text-left">
              <h3 className="text-xl font-bold mb-4">Game Operations</h3>
              <p className="text-blue-600 mb-6 font-semibold cursor-pointer hover:underline">EXPLORE →</p>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-blue-600 mb-1">Virtual Economy</h4>
                  <p className="text-sm text-gray-600">Currencies, items, inventories, and transactions</p>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-600 mb-1">CloudScript</h4>
                  <p className="text-sm text-gray-600">Serverless functions with isolated VM execution</p>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-600 mb-1">Leaderboards</h4>
                  <p className="text-sm text-gray-600">Rankings, scores, and seasonal competitions</p>
                </div>
              </div>
            </div>

            {/* Analytics & Insights */}
            <div className="text-left">
              <h3 className="text-xl font-bold mb-4">Analytics & Insights</h3>
              <p className="text-blue-600 mb-6 font-semibold cursor-pointer hover:underline">EXPLORE →</p>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-blue-600 mb-1">Real-Time Analytics</h4>
                  <p className="text-sm text-gray-600">Daily active users reports and event tracking</p>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-600 mb-1">Data Storage</h4>
                  <p className="text-sm text-gray-600">PostgreSQL and MongoDB for all your game data</p>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-600 mb-1">Full Control</h4>
                  <p className="text-sm text-gray-600">Self-host anywhere, no per-MAU fees, complete transparency</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-100 border-t border-gray-200 py-8">
        <div className="container mx-auto px-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">© 2025 NullStack - A product of Lunaractive</p>
            <div className="flex space-x-6 text-sm text-gray-600">
              <a href="http://localhost:3006" className="hover:text-blue-600">Developer Portal</a>
              <a href="#" className="hover:text-blue-600">Documentation</a>
              <a href="#" className="hover:text-blue-600">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
