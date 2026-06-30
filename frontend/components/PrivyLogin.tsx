'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useState } from 'react';
import { useLocalStellarWallet } from '@/hooks/useLocalStellarWallet';

export default function PrivyLogin() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const [fundingStatus, setFundingStatus] = useState<string>('');
  
  const { publicKey } = useLocalStellarWallet();

  const requestFunding = async () => {
    if (!publicKey) return;
    
    setFundingStatus('Solicitando fundos...');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/funding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: publicKey }),
      });
      
      if (response.ok) {
        setFundingStatus('Fundos enviados com sucesso! Carteira ativada na Testnet.');
      } else {
        setFundingStatus('Erro ao solicitar fundos.');
      }
    } catch (error) {
      console.error(error);
      setFundingStatus('Erro de conexão ao solicitar fundos.');
    }
  };

  if (!ready) return <div className="p-4">Carregando Privy...</div>;

  return (
    <div className="p-6 bg-white rounded-xl shadow-md flex flex-col gap-4">
      <h2 className="text-xl font-bold">Autenticação (Privy)</h2>
      
      {!authenticated ? (
        <button 
          onClick={login}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Entrar (E-mail/Social)
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm">Logado como: <strong>{user?.email?.address || 'Usuário'}</strong></p>
          
          {publicKey ? (
            <div className="p-3 bg-gray-50 rounded border text-sm break-all">
              <strong>Endereço Stellar Local:</strong><br />
              {publicKey}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">Gerando carteira Stellar local...</p>
          )}

          {publicKey && (
            <button 
              onClick={requestFunding}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition mt-2"
            >
              Solicitar Fundos (Friendbot)
            </button>
          )}

          {fundingStatus && <p className="text-sm text-blue-600">{fundingStatus}</p>}

          <button 
            onClick={logout}
            className="px-4 py-2 mt-4 border border-red-200 text-red-600 rounded hover:bg-red-50 transition"
          >
            Sair
          </button>
        </div>
      )}
    </div>
  );
}

