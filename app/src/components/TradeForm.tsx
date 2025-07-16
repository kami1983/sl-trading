'use client';

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { FC, useState } from 'react';
import * as anchor from '@project-serum/anchor';
import { Program, AnchorProvider } from '@project-serum/anchor';
import { PublicKey, Transaction } from '@solana/web3.js';
import { IDL } from '../idl/learn_solana_program';

// 这里需要替换为你的程序 ID
const PROGRAM_ID = new PublicKey('19g7kgLjp6TKgtHCgs5rZseG4eeKNqhXf3AhAmRJrtW');

// 生成唯一ID
const generateRandomId = () => {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${timestamp.toString(36)}_${randomStr}`;
};

export const TradeForm: FC = () => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey } = wallet;
  
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    id: generateRandomId(),
    userId: 'USER_' + generateRandomId(),
    fundId: 'FUND_001',
    tradeType: 'BUY',
    amount: '100',
    price: '10',
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('交易哈希已复制到剪贴板！');
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
      alert('请先连接钱包');
      return;
    }

    if (isSubmitting) {
      alert('交易正在处理中，请稍候...');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const provider = new AnchorProvider(
        connection,
        {
          publicKey,
          signTransaction: async (tx: Transaction) => {
            if (!wallet.signTransaction) throw new Error('Wallet does not support signTransaction');
            return wallet.signTransaction(tx as Transaction) as Promise<Transaction>;
          },
          signAllTransactions: async (txs: Transaction[]) => {
            if (!wallet.signAllTransactions) throw new Error('Wallet does not support signAllTransactions');
            return wallet.signAllTransactions(txs) as Promise<Transaction[]>;
          },
        },
        { commitment: 'processed' }
      );
      
      const program = new Program(IDL, PROGRAM_ID, provider);
      
      // 生成新的交易ID
      const newTradeId = generateRandomId();
      
      const tx = await program.methods.logTrade(
        newTradeId,
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

      setLastTxHash(tx);
      
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
      let errorMessage = '交易失败';
      
      // 处理常见错误
      if (error.message.includes('already been processed')) {
        errorMessage = '请重新提交交易';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = '余额不足';
      } else if (error.message.includes('Simulation failed')) {
        errorMessage = '交易模拟失败，请检查参数后重试';
      }
      
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
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
    <div className="space-y-6">
      {lastTxHash && (
        <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-200 mb-1">最近交易哈希</h3>
              <p className="text-xs text-gray-400 break-all">{lastTxHash}</p>
            </div>
            <button
              onClick={() => copyToClipboard(lastTxHash)}
              className="ml-4 px-3 py-1 text-sm text-gray-300 hover:text-white border border-gray-600 rounded-md hover:border-gray-500"
            >
              复制
            </button>
          </div>
        </div>
      )}
      
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
            disabled={!publicKey || isSubmitting}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {!publicKey 
              ? '请先连接钱包' 
              : isSubmitting 
                ? '交易处理中...' 
                : '提交交易'
            }
          </button>
        </form>
      </div>
    </div>
  );
}; 