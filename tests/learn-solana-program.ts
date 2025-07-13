import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { LearnSolanaProgram } from "../target/types/learn_solana_program";
import { PublicKey } from '@solana/web3.js';
import { assert } from "chai";

describe("learn-solana-program", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.LearnSolanaProgram as Program<LearnSolanaProgram>;

  it("Is initialized!", async () => {
    console.log("Is initialized!", "signer:", provider.wallet.publicKey.toBase58());
    const tx = await program.methods
      .initialize()
      .accounts({
        signer: provider.wallet.publicKey,
      })
      .rpc();
    console.log("Your transaction signature", tx);
  });

  it("Can log a trade event", async () => {
    // 准备测试数据
    const testData = {
      id: "test-trade-001",
      userId: "user-001",
      fundId: "fund-001",
      tradeType: { buy: {} }, // 使用 buy 类型
      amount: new anchor.BN(1000000), // 10 USDC (假设精度为 6)
      price: new anchor.BN(2000000),  // 20 USDC/SOL
      timestamp: new anchor.BN(Date.now()),
    };

    try {
      // 发送交易
      const tx = await program.methods
        .logTrade(
          testData.id,
          testData.userId,
          testData.fundId,
          testData.tradeType,
          testData.amount,
          testData.price,
          testData.timestamp
        )
        .accounts({
          signer: provider.wallet.publicKey,
        })
        .rpc();

      console.log("Trade event transaction signature", tx);

      // 获取交易信息
      const txInfo = await provider.connection.getTransaction(tx, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });

      if (!txInfo) {
        throw new Error("Transaction info not found");
      }

      // 打印事件日志
      console.log("Transaction logs:", txInfo.meta?.logMessages);

    } catch (error) {
      console.error("Error:", error);
      throw error;
    }
  });
});

