
import Image from 'next/image';
import placeholderImages from '@/lib/placeholder-images.json';

interface RoleSelectorProps {
  onSelectRole: (role: 'super-admin' | 'school-member') => void;
}

export default function RoleSelector({ onSelectRole }: RoleSelectorProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-6 p-8 bg-white rounded-lg shadow">
        <div className="text-center">
            <Image src={placeholderImages.mainAppLogo} alt="GèreEcole Logo" width={64} height={64} className="mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900">GèreEcole</h1>
          <p className="mt-2 text-gray-600">Sélectionnez votre rôle</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <button
            onClick={() => onSelectRole('super-admin')}
            className="group relative flex flex-col items-center p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <div className="flex items-center justify-center w-12 h-12 mb-4 bg-blue-100 rounded-full">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Super Administrateur</h3>
            <p className="mt-2 text-sm text-gray-500 text-center">
              Accès au système complet, gestion des écoles, logs système
            </p>
            <div className="mt-4 px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
              Accès restreint
            </div>
          </button>

          <button
            onClick={() => onSelectRole('school-member')}
            className="group relative flex flex-col items-center p-6 border-2 border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
          >
            <div className="flex items-center justify-center w-12 h-12 mb-4 bg-green-100 rounded-full">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Membre d'École</h3>
            <p className="mt-2 text-sm text-gray-500 text-center">
              Personnel, enseignants, administrateurs d'école
            </p>
            <div className="mt-4 px-3 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
              Accès à une ou plusieurs écoles
            </div>
          </button>
        </div>

        <div className="text-center text-sm text-gray-500 mt-8">
          <p>Vos permissions seront vérifiées après authentification</p>
        </div>
      </div>
    </div>
  );
}
