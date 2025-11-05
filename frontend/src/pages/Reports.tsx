import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

export default function Reports() {
  const { projectId } = useParams();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchReports();
  }, [projectId]);

  const fetchReports = async () => {
    try {
      const response = await axios.get(`/api/reports/${projectId}`);
      setReports(response.data.reports);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      // In real implementation, would use actual user ID
      await axios.post(`/api/ai/generate-report/${projectId}`, { generatorId: 'system' });
      fetchReports();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-12">Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <Link to={`/projects/${projectId}`} className="text-primary-600 hover:text-primary-700 mb-2 inline-block">
            ← Back to Project
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">AI Reports</h1>
        </div>
        <button
          onClick={handleGenerateReport}
          disabled={generating}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md font-medium disabled:opacity-50"
        >
          {generating ? 'Generating...' : 'Generate New Report'}
        </button>
      </div>

      <div className="space-y-6">
        {reports.map((report) => {
          const content = typeof report.content === 'string' ? JSON.parse(report.content) : report.content;
          return (
            <div key={report.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">{content.title}</h2>
                <span className="text-sm text-gray-500">
                  {new Date(report.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-gray-700 mb-4">{content.summary}</p>

              {content.anomalies && content.anomalies.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Anomalies Detected</h3>
                  <div className="space-y-2">
                    {content.anomalies.map((anomaly: any, index: number) => (
                      <div
                        key={index}
                        className={`p-3 rounded border-l-4 ${
                          anomaly.severity === 'critical'
                            ? 'bg-red-50 border-red-500'
                            : anomaly.severity === 'high'
                            ? 'bg-orange-50 border-orange-500'
                            : 'bg-yellow-50 border-yellow-500'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm">{anomaly.type}</span>
                          <span className="text-xs uppercase font-semibold">{anomaly.severity}</span>
                        </div>
                        <p className="text-sm text-gray-700">{anomaly.description}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          <strong>Recommendation:</strong> {anomaly.recommendation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {content.fundingStatus && (
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Funding Status</h3>
                  <div className="bg-gray-50 p-4 rounded">
                    <div className="flex justify-between mb-2">
                      <span>Progress</span>
                      <span className="font-semibold">{content.fundingStatus.percentComplete}%</span>
                    </div>
                    <p className="text-sm text-gray-600">{content.fundingStatus.assessment}</p>
                  </div>
                </div>
              )}

              {content.recommendations && content.recommendations.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Recommendations</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                    {content.recommendations.map((rec: string, index: number) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}

        {reports.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 mb-4">No reports generated yet</p>
            <button
              onClick={handleGenerateReport}
              className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-md font-medium"
            >
              Generate First Report
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
