'use client';

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { FC, useState } from 'react';
import * as anchor from '@project-serum/anchor';
import { Program, AnchorProvider, Idl } from '@project-serum/anchor';
import { PublicKey } from '@solana/web3.js';
import { IDL } from '../idl/learn_solana_program';
import '@solana/wallet-adapter-react-ui/styles.css';

const PROGRAM_ID = new PublicKey('19g7kgLjp6TKgtHCgs5rZseG4eeKNqhXf3AhAmRJrtW');

const TradeForm: FC = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  
  const [formData, setFormData] = useState({
    id: '',
    userId: '',
    fundId: '',
    tradeType: 'BUY',
    amount: '',
    price: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey) {
      alert('请先连接钱包');
      return;
    }

    try {
      // 创建交易指令
      const provider = new AnchorProvider(
        connection,
        window.solana,
        { commitment: 'processed' }
      );
      
      const program = new Program(IDL as Idl, PROGRAM_ID, provider);
      
      const tx = await program.methods.logTrade(
        formData.id,
        formData.userId,
        formData.fundId,
        formData.tradeType === 'BUY' ? { buy: {} } : { sell: {} },
        new anchor.BN(formData.amount),
        new anchor.BN(formData.price),
        new anchor.BN(Date.now())
      )
      .accounts({
        signer: publicKey,
      })
      .rpc();

      alert(`交易成功！交易签名: ${tx}`);
    } catch (error: any) {
      console.error('交易失败:', error);
      alert(`交易失败: ${error.message}`);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">交易ID</label>
        <input
          type="text"
          name="id"
          value={formData.id}
          onChange={handleInputChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">用户ID</label>
        <input
          type="text"
          name="userId"
          value={formData.userId}
          onChange={handleInputChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">基金ID</label>
        <input
          type="text"
          name="fundId"
          value={formData.fundId}
          onChange={handleInputChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">交易类型</label>
        <select
          name="tradeType"
          value={formData.tradeType}
          onChange={handleInputChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        >
          <option value="BUY">买入</option>
          <option value="SELL">卖出</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">数量</label>
        <input
          type="number"
          name="amount"
          value={formData.amount}
          onChange={handleInputChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">价格</label>
        <input
          type="number"
          name="price"
          value={formData.price}
          onChange={handleInputChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          required
        />
      </div>
      
      <button
        type="submit"
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        提交交易
      </button>
    </form>
  );
};

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Solana 交易日志测试</h1>
          <WalletMultiButton />
        </div>
        <TradeForm />
      </div>
    </main>
  );
}
