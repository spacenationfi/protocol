
# Orbit

## Usage

Spin up a mainnet-fork node locally with:
```ssh
npx hardhat node --fork https://mainnet.aurora.dev
```

Deploy contracts on mainnet-fork with:
```ssh
yarn hardhat run scripts/deploy.ts --network hardhat
```

Tip: Use a HH account private key when using mainnet fork.

## Contracts
Bundle crypto assets into baskets represented by ERC20 tokens. Launch Indecies, structured products, and leveraged tokens on AURORA.

## Development

To use console.log during Solidity development, follow the [guides](https://hardhat.org/guides/hardhat-console.html).

## Available Functionality

### Run Hardhat EVM

`yarn chain`

### Build Contracts

`yarn compile`

To speed up compilation, install solc 0.6.10 natively with the following command.
```
brew install https://raw.githubusercontent.com/ethereum/homebrew-ethereum/06d13a8499801dc3ea4f19b2d24ed2eeb3072ebb/solidity.rb
```

### Generate TypeChain Typings

`yarn build`

### Run Contract Tests

`yarn test` to run compiled contracts

OR `yarn test:clean` if contracts have been typings need to be updated

### Run Coverage Report for Tests

`yarn coverage`

## Installing from `npm`

```
npm install
```

## Contributing
We highly encourage participation from the community to help shape the development of Orbit. If you are interested in developing on top of Orbit Protocol or have any questions, please ping us on [Discord](https://discord.gg/5M6ZBjXdan).

## Security

### Code Coverage

All smart contracts are tested and have 100% line and branch coverage.

