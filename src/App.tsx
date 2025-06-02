import { Toaster } from 'react-hot-toast';
import TransactionForm from './components/TransactionForm';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
      
      {/* Header */}
      <header className="gradient-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4">
              Ethereum Link Generator v2
            </h1>
            <p className="text-xl text-white opacity-90 max-w-2xl mx-auto">
              Generate EIP-681 compliant URLs for EVM chains.
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="card">
          <TransactionForm />
        </div>
      </main>
    </div>
  );
}

export default App; 