export const IDL = {
  "version": "0.1.0",
  "name": "learn_solana_program",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        {
          "name": "signer",
          "isMut": true,
          "isSigner": true
        }
      ],
      "args": []
    },
    {
      "name": "logTrade",
      "accounts": [
        {
          "name": "signer",
          "isMut": true,
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
  "accounts": [],
  "types": [
    {
      "name": "TradeType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "BUY"
          },
          {
            "name": "SELL"
          }
        ]
      }
    }
  ],
  "events": [
    {
      "name": "TradeEvent",
      "fields": [
        {
          "name": "id",
          "type": "string",
          "index": false
        },
        {
          "name": "userId",
          "type": "string",
          "index": false
        },
        {
          "name": "fundId",
          "type": "string",
          "index": false
        },
        {
          "name": "tradeType",
          "type": {
            "defined": "TradeType"
          },
          "index": false
        },
        {
          "name": "amount",
          "type": "u64",
          "index": false
        },
        {
          "name": "price",
          "type": "u64",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    }
  ],
  "errors": [],
  "metadata": {
    "address": "19g7kgLjp6TKgtHCgs5rZseG4eeKNqhXf3AhAmRJrtW"
  }
}; 