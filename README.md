# Chargeable and Refundable stablecoin

> Modified from
> [circlefin/stablecoin-evm](https://github.com/circlefin/stablecoin-evm).

## Setup

### Development Environment

Requirements:

- Node 16.14.0
- Yarn 1.22.19

```sh
$ git clone https://github.com/ChiHaoLu/chargeable-and-refundable-stablecoin.git
$ cd stablecoin-evm
$ git checkout implement-features
$ nvm use
$ npm i -g yarn@1.22.19 # Install yarn if you don't already have it
$ yarn install          # Install npm packages and other dependencies listed in setup.sh
```

## Development

### Types

Types are automatically generated as a part of contract compilation:

```shell
$ yarn compile
$ yarn hardhat typechain
```

### Testing

Run all tests:

```sh
$ yarn test test/v2/FiatTokenV2_2.test.ts
```

## Deployment

1. Create a copy of the file `.env.example`, and name it `.env`. Fill in
   appropriate values in the `.env` file. This file must not be checked into the
   repository.

```sh
cp .env.example .env
```

2. Create a `blacklist.remote.json` file and populate it with a list of
   addresses to be blacklisted. This file must not be checked into the
   repository.

```sh
echo "[]" > blacklist.remote.json
```

3. Simulate a deployment by running the following command

```sh
yarn forge:simulate scripts/deploy/deploy-fiat-token.s.sol --rpc-url <testnet_alias>
```

4. Validate that all transactions to be broadcasted are filled in with the
   correct values
5. Deploy the contracts by running the following command

```sh
yarn forge:broadcast scripts/deploy/deploy-fiat-token.s.sol --rpc-url <testnet_alias>
```

6. Verify the contracts on an Etherscan flavored block explorer by running the
   following command. Ensure that `ETHERSCAN_KEY` is set in the `.env` file.

```sh
yarn forge:verify scripts/deploy/deploy-fiat-token.s.sol --rpc-url <testnet_alias>
```

7. Set the burner and vault!

## Setting

If needed, set the master minter:

```
Caller: owner (0x8Fc8ecf8A75877E51aa595Bb1a02CF3804b24613)
Function: updateMasterMinter(address _newMasterMinter)

MethodID: 0xaa20e1e4
[0]:  000000000000000000000000ec42a0817a89bb41be4184fb5c3bb146fd625f84
```
