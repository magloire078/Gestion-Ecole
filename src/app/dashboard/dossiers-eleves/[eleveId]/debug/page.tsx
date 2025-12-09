
'use client';

import { useParams } from 'next/navigation';

export default function DebugPage() {
  const params = useParams();
  
  return (
    <div>
      <h1>Debug Page</h1>
      <pre>{JSON.stringify(params, null, 2)}</pre>
      <p>Paramètres: {Object.keys(params).join(', ')}</p>
    </div>
  );
}
