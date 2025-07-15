import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useEffect, useState } from 'react';

export const NetworkInfo = () => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [network, setNetwork] = useState<string>('');

  useEffect(() => {
    // 获取当前网络
    const endpoint = connection.rpcEndpoint;
    if (endpoint.includes('devnet')) {
      setNetwork('Devnet');
    } else if (endpoint.includes('testnet')) {
      setNetwork('Testnet');
    } else if (endpoint.includes('mainnet')) {
      setNetwork('Mainnet');
    } else {
      setNetwork('Local');
    }

    // 获取账户余额
    const getBalance = async () => {
      if (!publicKey) {
        setBalance(null);
        return;
      }

      try {
        const balance = await connection.getBalance(publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      } catch (e) {
        console.error('获取余额失败:', e);
        setBalance(null);
      }
    };

    getBalance();
    // 设置余额自动更新
    const intervalId = setInterval(getBalance, 5000);

    return () => clearInterval(intervalId);
  }, [connection, publicKey]);

  return (
    <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
      <div className="text-sm text-gray-200">
        <p>当前网络: <span className="font-semibold">{network}</span></p>
        <p>
          账户余额: {' '}
          {publicKey ? (
            <span className="font-semibold">
              {balance !== null ? `${balance.toFixed(4)} SOL` : '加载中...'}
            </span>
          ) : (
            <span className="text-gray-400">请连接钱包</span>
          )}
        </p>
      </div>
    </div>
  );
}; 