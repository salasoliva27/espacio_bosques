import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

interface Project {
  id: string;
  title: string;
  summary: string;
  category: string;
  status: string;
  fundingGoal: string;
  fundingRaised: string;
  planner: {
    walletAddress: string;
  };
  milestones: any[];
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await axios.get('/api/projects');
      setProjects(response.data.projects);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: string) => {
    try {
      const bn = BigInt(amount);
      return (Number(bn) / 1e18).toLocaleString();
    } catch {
      return '0';
    }
  };

  const getFundingProgress = (raised: string, goal: string) => {
    try {
      const raisedBn = BigInt(raised);
      const goalBn = BigInt(goal);
      if (goalBn === BigInt(0)) return 0;
      return Number((raisedBn * BigInt(100)) / goalBn);
    } catch {
      return 0;
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Community Projects</h1>
        <p className="mt-2 text-gray-600">Browse and fund impactful community initiatives</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => {
          const progress = getFundingProgress(project.fundingRaised, project.fundingGoal);
          return (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
                    {project.category}
                  </span>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded ${
                      project.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-800'
                        : project.status === 'APPROVED'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {project.status}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{project.title}</h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">{project.summary}</p>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Funding Progress</span>
                    <span className="font-semibold">{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{formatAmount(project.fundingRaised)} BOSQUES</span>
                    <span>Goal: {formatAmount(project.fundingGoal)}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>{project.milestones.length} milestones</span>
                    <span className="text-xs truncate">
                      {project.planner.walletAddress.substring(0, 6)}...
                      {project.planner.walletAddress.substring(38)}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No projects found</p>
        </div>
      )}
    </div>
  );
}
