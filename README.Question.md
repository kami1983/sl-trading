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