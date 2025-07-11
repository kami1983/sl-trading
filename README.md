## 学习Solana程序开发，这个项目用于试验测试

## 参考文档
* https://solana.com/zh/docs/intro/installation

## 创建项目
* anchor init learn-solana-program

## 构建程序 
* anchor build

## 测试程序
* anchor test

## 部署程序
* anchor deploy

## 创建solana钱包
### 生成 key pair
* mkdir /coding/git-files/solana-key-pair
* cd /coding/git-files/solana-key-pair
* solana-keygen grind --starts-with Lin:1

### 配置钱包
* `solana config set -ud -k /Users/kami-m1/work-files/coding/git-files/sol-dev-key-pair/LincR97JvGscu9DDwLLUuZK196ENLSyF9Xc3Ehmhm2Y.json` -ud 表示使用devnet网络，-k 表示使用指定钱包
* `solana config get` 查看配置
* `solana address` 查看配置中的钱包地址

### 水龙头领取测试币
* `https://faucet.solana.com/` 选择 devnet
* 查看是否领取成功 `solana balance`

### 配置项目 Anchor.toml 以便让其部署到dev网络
```
[toolchain]
package_manager = "yarn"

[features]
resolution = true
skip-lint = false

[programs.devnet]
learn_solana_program = "AYSiAKC8KwsEznPuN2BBYJzdmmgm5kDmzNNsDo2QpD3G"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "devnet"
wallet = "/Users/kami-m1/work-files/coding/git-files/sol-dev-key-pair/LincR97JvGscu9DDwLLUuZK196ENLSyF9Xc3Ehmhm2Y.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

### 此时运行 anchor deploy 会将程序部署到dev网络
* 通过 `https://explorer.solana.com/?cluster=devnet` 查看程序是否部署成功
* 通过查询 Signature `3iKBBnNGooLvakz66WkTsF78nD4xbSS69fZskTbFTqc3wusaFxTPmtJzeswxrEA73TmCh8a1qFugCLeUTbGUNKCn` 可以看到 LincR97JvGscu9DDwLLUuZK196ENLSyF9Xc3Ehmhm2Y 发起了交易

### 部署后返回的数据
```
1	
LincR97JvGscu9DDwLLUuZK196ENLSyF9Xc3Ehmhm2Y
-◎0.00115144	◎3.670843	Fee PayerSignerWritable
2	
AYSiAKC8KwsEznPuN2BBYJzdmmgm5kDmzNNsDo2QpD3G
+◎0.00114144	◎0.00114144	SignerWritable
3	
8DMc5CDhyuLGrUgM8JLoHGk2hKpaSkFaducyvVo8WitM
-◎1.32700056	◎0	Writable
4	
DgATQCdBgUy5RChjFD2ywzG1faLrHSBaphK7FrQm6Ght
+◎1.32700056	◎1.32700056	Writable
5	
System Program
0	◎0.000000001	Program
6	
BPF Upgradeable Loader
0	◎0.000000001	Program
7	
Compute Budget Program
0	◎0.000000001	Program
8	
Sysvar: Clock
0	◎0.00116928	
9	
Sysvar: Rent
0	◎0.0010092
```
* 解释：
```
让我为您解释这些交易信息：
LincR97JvGscu9DDwLLUuZK196ENLSyF9Xc3Ehmhm2Y
这是您的钱包地址
-◎0.00115144：支付的交易费用
◎3.670843：账户当前余额
Fee PayerSignerWritable：表示这个账户是交易费用支付者，同时具有签名权限和写入权限
AYSiAKC8KwsEznPuN2BBYJzdmmgm5kDmzNNsDo2QpD3G
这是您部署的程序ID
+◎0.00114144：收到的SOL（用于支付程序存储租金）
SignerWritable：表示这个账户在此交易中可以被写入
8DMc5CDhyuLGrUgM8JLoHGk2hKpaSkFaducyvVo8WitM
这是程序数据账户的旧地址
-◎1.32700056：转出的SOL
余额变为0，说明这是一个被关闭的旧程序账户
DgATQCdBgUy5RChjFD2ywzG1faLrHSBaphK7FrQm6Ght
这是程序数据账户的新地址
+◎1.32700056：收到的SOL（用于存储程序数据）
Writable：表示这个账户可以被写入
System Program
Solana的系统程序
用于创建账户和转移SOL
BPF Upgradeable Loader
Solana的可升级程序加载器
用于部署和管理可升级的程序
Compute Budget Program
计算预算程序
用于设置交易的计算限制
Sysvar: Clock
系统变量：时钟
提供区块链的时间信息
Sysvar: Rent
系统变量：租金
提供账户租金相关的信息
总结这笔交易：
您的钱包支付了部署费用
创建了新的程序账户
旧的程序数据被清理
新的程序数据被写入
所有必要的系统程序都参与其中
交易涉及了SOL的转移，主要用于支付存储租金和交易费用
这是一个典型的程序部署交易，显示您的程序已经成功部署到了devnet网络。
```

## 注销部署的合约
* `solana program close AYSiAKC8KwsEznPuN2BBYJzdmmgm5kDmzNNsDo2QpD3G --bypass-warning` 
* 此时 `anchor deploy` 会报错，因为合约已经注销了
```
Deploying program "learn_solana_program"...
Program path: /Users/kami-m1/work-files/coding/git-files/kami-self/learn-solana-program/target/deploy/learn_solana_program.so...
Error: Program AYSiAKC8KwsEznPuN2BBYJzdmmgm5kDmzNNsDo2QpD3G has been closed, use a new Program Id
There was a problem deploying: Output { status: ExitStatus(unix_wait_status(256)), stdout: "", stderr: "" }.
```
* 需要一个新的程序id，可以运行 `anchor build` 但是要注意如果 target 目录存在，那么可能生成的id是相同的，需要删除 target 目录，或者：
```
这里需要注意，这样删除会变更程序id
rm target/deploy/learn_solana_program-keypair.json && anchor build
```
* 现在让我们查看新生成的程序ID：`solana address -k target/deploy/learn_solana_program-keypair.json`
* 现在我们需要更新两个地方：
```
programs/learn-solana-program/src/lib.rs 中的 declare_id!()
Anchor.toml 中的程序ID
```

* 最新部署的合约 VHkKqWysSfP5K8vAnHST1VHeVyueZEv4o2PQNUG5jWzoAg79Cxsfzfr2wY897jPS1wSR6gTGP5NYJkSFSQCqLer

* `solana balance -k target/deploy/learn_solana_program-keypair.json` 查看程序的余额，如果部署过那么就可以看到余额，注意这个私钥要保存好，有了这个私钥任何人都可以修改程序。除非：
```
就是通过将程序标记为"不可升级"（Immutable）。
有两种方式可以实现：
部署时直接设置为不可升级
   solana program deploy --final target/deploy/learn_solana_program.so
或者使用 Anchor：
   anchor deploy --program-name learn_solana_program --final
--final 标志会让程序在部署时就被标记为不可升级
部署后将程序设置为不可升级
   solana program set-upgrade-authority <PROGRAM_ID> --final
一旦程序被标记为不可升级：
即使有程序的密钥对也无法修改程序
这个操作是不可逆的
程序将永远保持当前的逻辑
```
