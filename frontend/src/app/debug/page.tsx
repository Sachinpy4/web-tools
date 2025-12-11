import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Server Debug - Environment Information',
  description: 'Debug page for server-side rendering environment variables',
}

export default async function DebugPage() {
  // Helper to test URL formation variations
  const testApiCall = async (baseUrl: string, path: string) => {
    const url = `${baseUrl}${path}`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(url, { 
        signal: controller.signal,
        next: { revalidate: 0 } 
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        return {
          url,
          status: response.status,
          ok: true,
          data: JSON.stringify(data).slice(0, 100) + (JSON.stringify(data).length > 100 ? '...' : '')
        };
      } else {
        return {
          url,
          status: response.status,
          ok: false,
          error: `Failed with status ${response.status}`
        };
      }
    } catch (error) {
      return {
        url,
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  };

  // Runtime config removed (deprecated in Next.js 15+)
  const serverRuntimeConfig = null;
  const publicRuntimeConfig = null;
  
  // Capture environment information
  const envInfo = {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'Not set',
    NODE_ENV: process.env.NODE_ENV || 'Not set',
    vercel: process.env.VERCEL === '1' ? 'Yes' : 'No',
    runtime: process.env.NEXT_RUNTIME || 'default',
    serverRuntimeConfig,
    publicRuntimeConfig
  }
  
  // Test various API URL formations
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  
  const testResults = [];
  
  if (baseUrl) {
    // Standard paths
    const standardUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    
    // Test health endpoint
    testResults.push({
      name: 'Health Endpoint (standard)',
      result: await testApiCall(standardUrl, '/health')
    });
    
    testResults.push({
      name: 'Health Endpoint (with /api)',
      result: await testApiCall(standardUrl, '/api/health')
    });
    
    // Test SEO endpoints
    testResults.push({
      name: 'SEO About Page (standard)',
      result: await testApiCall(standardUrl, '/seo/page/about')
    });
    
    testResults.push({
      name: 'SEO About Page (with /api)',
      result: await testApiCall(standardUrl, '/api/seo/page/about')
    });
    
    // Try alternate URL formations
    if (!standardUrl.endsWith('/api')) {
      testResults.push({
        name: 'SEO About Page (with explicit /api path)',
        result: await testApiCall(`${standardUrl}/api`, '/seo/page/about')
      });
    }
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Server Environment Information</h1>
      
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">Environment Variables</h2>
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
          <pre className="whitespace-pre-wrap">{JSON.stringify(envInfo, null, 2)}</pre>
        </div>
      </section>
      
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">API Connection Tests</h2>
        {testResults.length > 0 ? (
          <div className="space-y-4">
            {testResults.map((test, index) => (
              <div key={index} className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
                <h3 className="font-bold mb-2">{test.name}</h3>
                <div className="pl-4">
                  <p><strong>URL:</strong> {test.result.url}</p>
                  <p><strong>Status:</strong> {test.result.ok ? 
                    <span className="text-green-600">Success ({test.result.status})</span> : 
                    <span className="text-red-600">Failed ({test.result.error})</span>}
                  </p>
                  {test.result.ok && (
                    <p><strong>Data:</strong> {test.result.data}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
            <p>No API URL configured to run tests.</p>
          </div>
        )}
      </section>
      
      <section>
        <h2 className="text-xl font-bold mb-4">Server-Side Rendering Information</h2>
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
          <p className="mb-2"><strong>Timestamp:</strong> <span suppressHydrationWarning>{new Date().toISOString()}</span></p>
          <p className="mb-2"><strong>This page was rendered on the server at:</strong> <span suppressHydrationWarning>{new Date().toLocaleString()}</span></p>
        </div>
      </section>
    </div>
  )
} 