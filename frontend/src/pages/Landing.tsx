import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="bg-gradient-to-b from-primary-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          <h1 className="text-5xl font-extrabold text-gray-900 sm:text-6xl md:text-7xl">
            <span className="block">Fund Community Projects</span>
            <span className="block text-primary-600">with AI & Blockchain</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-xl text-gray-500">
            Espacio Bosques empowers communities to create, fund, and monitor impactful projects
            using AI-assisted planning and transparent on-chain escrow.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link
              to="/dashboard"
              className="px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 md:py-4 md:text-lg md:px-10"
            >
              Explore Projects
            </Link>
            <Link
              to="/create"
              className="px-8 py-3 border border-transparent text-base font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 md:py-4 md:text-lg md:px-10"
            >
              Create with AI
            </Link>
          </div>
        </div>

        <div className="mt-24 grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-bold mb-2">AI-Assisted Creation</h3>
            <p className="text-gray-600">
              Transform your idea into a structured project with milestones using Claude AI.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-bold mb-2">On-Chain Escrow</h3>
            <p className="text-gray-600">
              Funds are securely held in smart contracts and released based on milestone completion.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-bold mb-2">AI Monitoring</h3>
            <p className="text-gray-600">
              Automated reports analyze project progress and detect anomalies in real-time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
