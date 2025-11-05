import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    try {
      const response = await axios.get(`/api/projects/${id}`);
      setProject(response.data.project);
    } catch (error) {
      console.error('Failed to fetch project:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: string) => {
    try {
      return (Number(BigInt(amount)) / 1e18).toLocaleString();
    } catch {
      return '0';
    }
  };

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-12">Loading...</div>;
  if (!project) return <div className="max-w-7xl mx-auto px-4 py-12">Project not found</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <Link to="/dashboard" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
          ← Back to Dashboard
        </Link>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">{project.title}</h1>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
          project.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {project.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">About</h2>
            <p className="text-gray-700">{project.summary}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">Milestones</h2>
            <div className="space-y-4">
              {project.milestones.map((milestone: any, index: number) => (
                <div key={milestone.id} className="border-l-4 border-primary-500 pl-4">
                  <h3 className="font-semibold text-lg">{milestone.title}</h3>
                  <p className="text-gray-600 text-sm mt-1">{milestone.description}</p>
                  <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                    <span>{milestone.fundingPercentage}% of funding</span>
                    <span>{milestone.durationDays} days</span>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      milestone.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                      milestone.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {milestone.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-lg mb-4">Funding</h3>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary-600">
                {formatAmount(project.fundingRaised)} BOSQUES
              </div>
              <div className="text-sm text-gray-500">
                of {formatAmount(project.fundingGoal)} goal
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                <div
                  className="bg-primary-600 h-2 rounded-full"
                  style={{ width: `${(Number(BigInt(project.fundingRaised)) / Number(BigInt(project.fundingGoal)) * 100)}%` }}
                />
              </div>
            </div>
            <button className="w-full mt-6 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md font-medium">
              Fund This Project
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-lg mb-4">Recent Activity</h3>
            <div className="space-y-3 text-sm">
              {project.investments.slice(0, 5).map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between">
                  <span className="text-gray-600">
                    {inv.investor.walletAddress.substring(0, 6)}...{inv.investor.walletAddress.substring(38)}
                  </span>
                  <span className="font-semibold">{formatAmount(inv.amount)}</span>
                </div>
              ))}
            </div>
          </div>

          {project.telemetry.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-bold text-lg mb-4">Latest Telemetry</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Uptime</span>
                  <span className="font-semibold">{project.telemetry[0].data.uptimePercent?.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Battery</span>
                  <span className="font-semibold">{project.telemetry[0].data.batteryPercent?.toFixed(0)}%</span>
                </div>
              </div>
              <Link
                to={`/reports/${project.id}`}
                className="block mt-4 text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                View AI Reports →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
