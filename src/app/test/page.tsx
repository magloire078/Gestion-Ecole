export default function TestPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-24">
            <h1 className="text-4xl font-bold">Page de Test</h1>
            <p className="mt-4 text-xl">Si vous voyez ceci, le routing fonctionne !</p>
            <p className="mt-2 text-sm text-gray-500">Généré le: {new Date().toISOString()}</p>
        </div>
    );
}
