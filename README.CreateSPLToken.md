## 通过spl-token创建token
```
(base) kami-m1@Kami-M1-3 learn-solana-program % spl-token create-token --decimals 9
Creating token EPMPPKuBWDtvtVa3FVDtGSLLoZ73Ytc6ASumbye3a6JP under program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA

Address:  EPMPPKuBWDtvtVa3FVDtGSLLoZ73Ytc6ASumbye3a6JP
Decimals:  9

Signature: 2eL5sntLjfDep3gQTRgKC8QZdjSMHeJUzKfUDPg4EtEkujbVj4svRQeAJzkNSHzocuXXZVKfrm7x5sutU88yu9V

```

## 创建代币账户：spl-token create-account EPMPPKuBWDtvtVa3FVDtGSLLoZ73Ytc6ASumbye3a6JP
```
kami-m1@Kami-M1-3 learn-solana-program % spl-token create-account EPMPPKuBWDtvtVa3FVDtGSLLoZ73Ytc6ASumbye3a6JP                                       

Creating account CmRmra51u3ygL9ZCKNrh4diCQbiviF1FmrWZkZjwmWxN

Signature: 5ooGcVtZwinRikWKEtA7q2kWNe2WkogMM2Uy5RA8MdfbF64PTTSNwhmj85TVNJWmL22f5FKAp4E6Ri9TMqtQd1YE

(base) kami-m1@Kami-M1-3 learn-solana-program % 
```

## 铸造代币：spl-token mint EPMPPKuBWDtvtVa3FVDtGSLLoZ73Ytc6ASumbye3a6JP 1000000
```
EPMPPKuBWDtvtVa3FVDtGSLLoZ73Ytc6ASumbye3a6JP
1000000
```

## 查看代币：spl-token balance EPMPPKuBWDtvtVa3FVDtGSLLoZ73Ytc6ASumbye3a6JP
```
1000000
```

## 查看代币账户 spl-token accounts

## 综述
* 实际上SPL有一些天生的特别特性，铸币权（Mint Authority）、冻结权（Freeze Authority）、之后可以放弃，禁用权限是永久性的，不能撤销，只有当前权限持有者才能修改权限。

## 问题
### 为什么 create token 生成了一个地址：EPMPPKuBWDtvtVa3FVDtGSLLoZ73Ytc6ASumbye3a6JP，然后创建一个代币账户 CmRmra51u3ygL9ZCKNrh4diCQbiviF1FmrWZkZjwmWxN 是干什么用，不创建可以么？用我钱包里的已有账户是否可以。
```
代币账户，这是用来存储代币余额的账户，mint 代币只能直接 mint 到代币账户，不能直接 mint 到钱包账户。
```

## 那么我之后要将token转入钱包应该如何操作


* spl-token transfer EPMPPKuBWDtvtVa3FVDtGSLLoZ73Ytc6ASumbye3a6JP 50000 KamiWWM3Tt8KwzoXXdaipy8ZigY2fj9M3JpZz9ZTZFN

直接运行可能会报错提示 `Error: "Error: The recipient address is not funded. Add --allow-unfunded-recipient to complete the transfer."` 这是因为这个账户地址不存在，那么添加 --fund-recipient --allow-unfunded-recipient 参数

## --fund-recipient --allow-unfunded-recipient 参数作用
```
--fund-recipient
自动为接收方创建代币账户
支付创建账户所需的 SOL（租金）
如果不使用这个参数，接收方必须自己先创建代币账户
相当于一站式服务，帮接收方完成账户创建

--allow-unfunded-recipient
允许向没有 SOL 的钱包地址转账
正常情况下，接收方钱包需要有一些 SOL 来支付交易费用
使用这个参数，发送方将承担所有费用
适用于接收方钱包是全新的情况
```

* 查询代币余额：`spl-token accounts --owner KamiWWM3Tt8KwzoXXdaipy8ZigY2fj9M3JpZz9ZTZFN --verbose` --verbose 参数用于显示更详细的信息输出，这不仅会显示代币余额，还会显示代币账户关联的详细信息。