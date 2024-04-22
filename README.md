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

### Testing

Run all tests:

```sh
$ yarn test # or yarn test [path/to/file]
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
yarn forge:simulate scripts/deploy/deploy-fiat-token.s.sol --rpc-url <testnet OR mainnet>
```

4. Validate that all transactions to be broadcasted are filled in with the
   correct values
5. Deploy the contracts by running the following command

```sh
yarn forge:broadcast scripts/deploy/deploy-fiat-token.s.sol --rpc-url <testnet OR mainnet>
```

6. Verify the contracts on an Etherscan flavored block explorer by running the
   following command. Ensure that `ETHERSCAN_KEY` is set in the `.env` file.

```sh
yarn forge:verify scripts/deploy/deploy-fiat-token.s.sol --rpc-url <testnet OR mainnet>
```
