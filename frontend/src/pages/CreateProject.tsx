import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function CreateProject() {
  const [step, setStep] = useState(1);
  const [aiPrompt, setAiPrompt] = useState('');
  const [blueprint, setBlueprint] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setLoading(true);
    try {
      const response = await axios.post('/api/ai/create-project', { prompt: aiPrompt });
      setBlueprint(response.data.blueprint);
      setStep(2);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to generate project');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    setLoading(true);
    try {
      // In real implementation, would need user wallet
      const plannerId = 'user-id-from-auth';
      await axios.post('/api/projects', {
        plannerId,
        title: blueprint.title,
        summary: blueprint.summary,
        category: blueprint.category,
        fundingGoal: '10000000000000000000000', // 10,000 BOSQUES
        metadataURI: 'ipfs://generated',
        aiGenerated: true,
        aiBlueprint: blueprint,
        milestones: blueprint.milestones,
      });
      navigate('/dashboard');
    } catch (error) {
      alert('Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Create Project with AI</h1>

      {step === 1 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Step 1: Describe Your Idea</h2>
          <p className="text-gray-600 mb-6">
            Tell us about your community project idea. Be as detailed as possible - include goals,
            expected outcomes, and any specific requirements.
          </p>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            className="w-full h-40 p-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Example: I want to create a community garden in our neighborhood that provides fresh vegetables for 50 families. We need to build raised beds, install irrigation, and provide training workshops..."
          />
          <button
            onClick={handleAIGenerate}
            disabled={loading || !aiPrompt.trim()}
            className="mt-4 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-md font-medium disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Generate Project Blueprint'}
          </button>
        </div>
      )}

      {step === 2 && blueprint && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Step 2: Review AI Blueprint</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={blueprint.title}
                  readOnly
                  className="w-full p-2 border border-gray-300 rounded-md bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input
                  type="text"
                  value={blueprint.category}
                  readOnly
                  className="w-full p-2 border border-gray-300 rounded-md bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
                <textarea
                  value={blueprint.summary}
                  readOnly
                  className="w-full h-24 p-2 border border-gray-300 rounded-md bg-gray-50"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Milestones</h3>
            <div className="space-y-4">
              {blueprint.milestones.map((milestone: any, index: number) => (
                <div key={index} className="border-l-4 border-primary-500 pl-4">
                  <h4 className="font-semibold">{milestone.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                  <div className="mt-2 flex gap-4 text-sm text-gray-500">
                    <span>{milestone.fundingPercentage}% funding</span>
                    <span>{milestone.durationDays} days</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-3 border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleCreateProject}
              disabled={loading}
              className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-md font-medium disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
