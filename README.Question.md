## 解释Solana的PDA和ATA概念
* PDA：Program Derived Address，程序派生地址，是Solana中的一种地址类型，用于表示程序的派生地址。
* ATA：Associated Token Account，关联代币账户，是Solana中的一种账户类型，用于表示代币的关联账户。
* 二者关系 ATA 是一个 PDA（Program Derived Address）
* 比如 spl-token accounts --owner KamiWWM3Tt8KwzoXXdaipy8ZigY2fj9M3JpZz9ZTZFN --verbose 返回的token的地址是4E6yYXp364ya2tdkY6gpy18n7afPGmiksQnqZxoSDyEh，那么这个地址就是 ATA的PDA地址，这个地址根据Token地址、账户地址（Kami...）等生成计算出来的：
```
find_program_address(
  [
    wallet_address,              // 你的钱包地址
    TOKEN_PROGRAM_ID,            // Token program 固定值
    mint_address                 // 你要存的 token 的 mint 地址
  ],
  ASSOCIATED_TOKEN_PROGRAM_ID   // 用这个 program 来派生
)
```

### 解释一下创建SPL token
* spl-token create-token 是在官方 SPL Token Program（固定 program ID）控制下创建了一个 Mint 账户（不是用来存余额的，但的确是存储数据的）。这个账号，是一个状态账户（数据结构）存的是该 Token 的元信息（如总供应量、decimals、小数精度、mint authority 等）这个 Mint 账户的地址，就是我们平时说的“token 地址”
* 接着，spl-token create-account <token_address> 是为某个钱包地址创建一个 Associated Token Account（ATA），这个账户是由 PDA 派生出来的专属地址，专门用于存储该钱包对该 Token 的余额。


### @https://explorer.solana.com/  和 @https://solscan.io/  的区别和关系
```
开发调试时：优先使用 Solana Explorer，因为它是官方工具，与开发环境集成更好
数据分析时：使用 Solscan，因为它提供更多数据维度和分析工具
查看 NFT 和 Token：Solscan 的展示更友好
简单交易查询：两者都可以，看个人习惯
程序部署后查看：使用 Solana Explorer
Token 发行后追踪：使用 Solscan
交易调试：使用 Solana Explorer
生态数据分析：使用 Solscan
```

### SDK构造 Transaction Message 的构造顺序

* 步骤 1️⃣：初始化交易消息
createTransactionMessage({ version: "legacy" })
创建一个 空的 Legacy 格式交易消息，不携带签名者、区块哈希或指令数据

* 步骤 2️⃣：设定手续费支付者和签名者
setTransactionMessageFeePayerSigner(signer, tx)
为该交易消息设定 fee payer 和签名者信息。此步骤必需先完成，以便后续 instruction 的签名认证生效

* 步骤 3️⃣：绑定交易有效期（Blockhash + 最后有效高度）
setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx)
设定区块哈希与有效高度（lastValidBlockHeight），确保交易在链上有生命期限制

* 步骤 4️⃣：追加一组业务指令（Instructions）
appendTransactionMessageInstructions([...], tx)
把 Memo、Compute Unit 设置等指令追加到交易消息中.

```
举例：
const transaction = pipe(
  createTransactionMessage({ version: "legacy" }),
  (tx) => setTransactionMessageFeePayerSigner(signer, tx),
  (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
  (tx) =>
    appendTransactionMessageInstructions(
      [
        getAddMemoInstruction({ memo: "gm world!" }),
        getSetComputeUnitLimitInstruction({ units: 5000 }),
        getSetComputeUnitPriceInstruction({ microLamports: 1000 }),
      ],
      tx,
    ),
);

```