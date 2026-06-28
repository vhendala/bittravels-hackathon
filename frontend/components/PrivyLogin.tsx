'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useCreateWallet } from '@privy-io/react-auth/extended-chains';
import { useEffect, useState } from 'react';

export default function PrivyLogin() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { createWallet } = useCreateWallet();
  const [fundingStatus, setFundingStatus] = useState<string>('');
  
  // Encontra a carteira Stellar, se houver
  const stellarWallet: any = user?.linkedAccounts.find(
    (account) => account.type === 'wallet' && (account as any).chainType === 'stellar'
  );

  useEffect(() => {
    // Se está logado, mas não tem carteira Stellar criada, cria uma automaticamente
    if (ready && authenticated && user && !stellarWallet) {
      createWallet({ chainType: 'stellar' as any }).catch((err) => {
        console.error('Erro ao criar carteira Stellar:', err);
      });
    }
  }, [ready, authenticated, user, stellarWallet, createWallet]);

  const requestFunding = async () => {
    if (!stellarWallet) return;
    
    setFundingStatus('Solicitando fundos...');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/funding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: stellarWallet.address }),
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
          <p className="text-sm">Logado como: <strong>{user?.email?.address}</strong></p>
          
          {stellarWallet ? (
            <div className="p-3 bg-gray-50 rounded border text-sm break-all">
              <strong>Endereço Stellar:</strong><br />
              {stellarWallet.address}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">Gerando carteira Stellar...</p>
          )}

          {stellarWallet && (
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
