'use client';

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { FC, useState } from 'react';
import * as anchor from '@project-serum/anchor';
import { Program, AnchorProvider, Idl } from '@project-serum/anchor';
import { PublicKey } from '@solana/web3.js';

// 这里需要替换为你的程序 ID
const PROGRAM_ID = new PublicKey('19g7kgLjp6TKgtHCgs5rZseG4eeKNqhXf3AhAmRJrtW');

export const TradeForm: FC = () => {
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
      
      // 获取 IDL
      const idl = await Program.fetchIdl(PROGRAM_ID, provider);
      if (!idl) {
        throw new Error('无法获取 IDL');
      }

      const program = new Program(idl, PROGRAM_ID, provider);
      
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
      
      // 清空表单
      setFormData({
        id: '',
        userId: '',
        fundId: '',
        tradeType: 'BUY',
        amount: '',
        price: '',
      });
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
    <div className="bg-white/10 rounded-lg p-6 backdrop-blur-sm">
      <h2 className="text-xl font-semibold text-white mb-6">提交交易</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-200">交易ID</label>
          <input
            type="text"
            name="id"
            value={formData.id}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700/50 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-200">用户ID</label>
          <input
            type="text"
            name="userId"
            value={formData.userId}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700/50 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-200">基金ID</label>
          <input
            type="text"
            name="fundId"
            value={formData.fundId}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700/50 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-200">交易类型</label>
          <select
            name="tradeType"
            value={formData.tradeType}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700/50 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="BUY">买入</option>
            <option value="SELL">卖出</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-200">数量</label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700/50 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-200">价格</label>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700/50 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={!publicKey}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {publicKey ? '提交交易' : '请先连接钱包'}
        </button>
      </form>
    </div>
  );
}; 