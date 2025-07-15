'use client';

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { FC, useState } from 'react';
import * as anchor from '@project-serum/anchor';
import { Program, AnchorProvider } from '@project-serum/anchor';
import { PublicKey } from '@solana/web3.js';
import { IDL } from '../idl/learn_solana_program';

// 这里需要替换为你的程序 ID
const PROGRAM_ID = new PublicKey('19g7kgLjp6TKgtHCgs5rZseG4eeKNqhXf3AhAmRJrtW');

// 生成随机ID
const generateRandomId = () => {
  return Math.random().toString(36).substring(2, 15);
};

export const TradeForm: FC = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  
  const [formData, setFormData] = useState({
    id: generateRandomId(),
    userId: 'USER_' + generateRandomId(),
    fundId: 'FUND_001',
    tradeType: 'BUY',
    amount: '100',
    price: '10',
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
      
      const program = new Program(IDL, PROGRAM_ID, provider);
      
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
      
      // 重置表单，生成新的随机ID
      setFormData({
        id: generateRandomId(),
        userId: 'USER_' + generateRandomId(),
        fundId: 'FUND_001',
        tradeType: 'BUY',
        amount: '100',
        price: '10',
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

  // 重置表单到默认值
  const handleReset = () => {
    setFormData({
      id: generateRandomId(),
      userId: 'USER_' + generateRandomId(),
      fundId: 'FUND_001',
      tradeType: 'BUY',
      amount: '100',
      price: '10',
    });
  };

  return (
    <div className="bg-white/10 rounded-lg p-6 backdrop-blur-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-white">提交交易</h2>
        <button
          type="button"
          onClick={handleReset}
          className="px-3 py-1 text-sm text-gray-300 hover:text-white border border-gray-600 rounded-md hover:border-gray-500"
        >
          重置表单
        </button>
      </div>
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