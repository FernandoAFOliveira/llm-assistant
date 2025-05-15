import { useState, useEffect } from 'react';

type ServiceStatus = 'checking' | 'running' | 'down' | 'starting';

export default function ServiceControl() {
  const [status, setStatus] = useState<ServiceStatus>('checking');
  const [output, setOutput] = useState<string>('');

  const checkStatus = async () => {
    try {
      const res = await fetch('http://localhost:5000/health');
      setStatus(res.ok ? 'running' : 'down');
    } catch {
      setStatus('down');
    }
  };

  const startServices = async () => {
    setStatus('starting');
    setOutput('Starting services...\n');
    
    try {
      const response = await fetch('http://localhost:5000/api/start-services', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        setOutput(prev => prev + 'Launch script executed successfully\n');
        // Poll until services are up
        const poll = setInterval(async () => {
          await checkStatus();
          if (status === 'running') {
            clearInterval(poll);
            setOutput(prev => prev + 'All services ready!\n');
          }
        }, 1000);
      } else {
        setStatus('down');
        setOutput(prev => prev + `Error: ${data.error}\n`);
      }
    } catch (error) {
      setStatus('down');
      setOutput(prev => prev + `Connection error: ${error}\n`);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <div className="mb-6 p-4 rounded-lg bg-gray-800 border border-gray-700">
      <h3 className="text-lg font-medium mb-3">Service Management</h3>
      
      <div className="flex items-center gap-4 mb-3">
        <div className={`w-3 h-3 rounded-full ${
          status === 'running' ? 'bg-green-500' :
          status === 'down' ? 'bg-red-500' : 'bg-yellow-500'
        }`}></div>
        <span>Backend: {status}</span>
      </div>

      <button
        onClick={startServices}
        disabled={status === 'running' || status === 'starting'}
        className={`px-4 py-2 rounded-md ${
          status === 'running' ? 'bg-gray-600 cursor-not-allowed' :
          status === 'starting' ? 'bg-yellow-600 cursor-wait' :
          'bg-blue-600 hover:bg-blue-700'
        } text-white transition-colors mb-3`}
      >
        {status === 'starting' ? 'Starting...' : 'Start All Services'}
      </button>

      {output && (
        <div className="mt-3 p-3 bg-gray-900 rounded-md font-mono text-sm whitespace-pre-wrap overflow-auto max-h-40">
          {output}
        </div>
      )}
    </div>
  );
}