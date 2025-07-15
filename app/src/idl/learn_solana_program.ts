export type LearnSolanaProgram = {
  "version": "0.1.0",
  "name": "learn_solana_program",
  "instructions": [
    {
      "name": "logTrade",
      "accounts": [
        {
          "name": "signer",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "id",
          "type": "string"
        },
        {
          "name": "userId",
          "type": "string"
        },
        {
          "name": "fundId",
          "type": "string"
        },
        {
          "name": "tradeType",
          "type": {
            "defined": "TradeType"
          }
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "price",
          "type": "u64"
        },
        {
          "name": "timestamp",
          "type": "i64"
        }
      ]
    }
  ],
  "types": [
    {
      "name": "TradeType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Buy"
          },
          {
            "name": "Sell"
          }
        ]
      }
    }
  ]
};

export const IDL: LearnSolanaProgram = {
  "version": "0.1.0",
  "name": "learn_solana_program",
  "instructions": [
    {
      "name": "logTrade",
      "accounts": [
        {
          "name": "signer",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "id",
          "type": "string"
        },
        {
          "name": "userId",
          "type": "string"
        },
        {
          "name": "fundId",
          "type": "string"
        },
        {
          "name": "tradeType",
          "type": {
            "defined": "TradeType"
          }
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "price",
          "type": "u64"
        },
        {
          "name": "timestamp",
          "type": "i64"
        }
      ]
    }
  ],
  "types": [
    {
      "name": "TradeType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Buy"
          },
          {
            "name": "Sell"
          }
        ]
      }
    }
  ]
}; 