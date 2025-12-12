
'use client';

export default function TestPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Test des composants</h1>
      
      {/* Test 1: Simple div */}
      <div className="bg-blue-100 p-4 mb-4">
        <p>Test 1: Simple div avec fond bleu</p>
      </div>
      
      {/* Test 2: Card de shadcn */}
      <div className="bg-card border rounded-lg p-4 mb-4">
        <h2 className="text-lg font-semibold mb-2">Test 2: Style de card</h2>
        <p>Ceci devrait avoir un style de card</p>
      </div>
      
      {/* Test 3: Grid layout */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-green-100 p-4">Colonne 1</div>
        <div className="bg-red-100 p-4">Colonne 2</div>
      </div>
      
      {/* Test 4: Utilisation de hook useSchoolData */}
      <div className="bg-yellow-100 p-4">
        <h3 className="font-bold mb-2">Test 4: Hook useSchoolData</h3>
        <button 
          onClick={() => {
            import('@/hooks/use-school-data').then((module) => {
              console.log('useSchoolData hook:', module);
            }).catch(err => {
              console.error('Erreur import hook:', err);
            });
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Tester l'import du hook
        </button>
      </div>
    </div>
  );
}
