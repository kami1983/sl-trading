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