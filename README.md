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
yarn forge:verify scripts/deploy/deploy-fiat-token.s.sol --rpc-url <testnet_alias> --account  <owner_address>
```

Make sure you have import your wallet into foundry keystore, or you will meet
the error:

```
No associated wallet for addresses: [<owner_address>]. Unlocked wallets: []
```

To import the owner address as a wallet, you could use below command
([ref.](https://book.getfoundry.sh/reference/cast/cast-wallet-import)):

```shell
$ cast wallet import <owner_address> --private-key <owner_private_key>
```

## Setting

### Set the minter

1. Set the masterMinter

```
Caller: owner (0x8Fc8ecf8A75877E51aa595Bb1a02CF3804b24613)
Function: updateMasterMinter(address _newMasterMinter)

MethodID: 0xaa20e1e4
[0]:  0xEC42a0817A89bB41Be4184FB5c3Bb146fd625f84
```

2. Configure the minter

```
Caller: masterMinter (0xEC42a0817A89bB41Be4184FB5c3Bb146fd625f84)
Function: configureMinter(address minter,uint256 minterAllowedAmount)

MethodID: 0x4e44d956
[0]:  0xEC42a0817A89bB41Be4184FB5c3Bb146fd625f84
[1]:  115792089237316195423570985008687907853269984665640564039457584007913129639935
```

3. Mint (for example, mint to the vault address with 7 token)

```
Caller minter (0xEC42a0817A89bB41Be4184FB5c3Bb146fd625f84)
Function: mint(address _to,uint256 _amount)

MethodID: 0x40c10f19
[0]:  0000000000000000000000007ae55bae02e18b4f0ef69e846d6922dfeb99727d
[1]:  0000000000000000000000000000000000000000000000000000000000000007
```

### Set the vault

```
Caller: owner (0x8Fc8ecf8A75877E51aa595Bb1a02CF3804b24613)
Function: setVault(address _vault)

MethodID: 0x6817031b
[0]:  0000000000000000000000007ae55bae02e18b4f0ef69e846d6922dfeb99727d
```
