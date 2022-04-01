import { ethers, providers } from "ethers";
import { ContractTransaction, Signer } from "ethers";
import { BigNumber as BN } from "bignumber.js";
import chalk from "chalk";


import { Controller, IntegrationRegistry, SetTokenCreator, BasicIssuanceModule, GeneralIndexModule, StreamingFeeModule, UniswapV2IndexExchangeAdapter } from '../utils/contracts'

import DeployHelper from "../utils/deploys";
import {
    Address,
} from "../utils/types";
require('dotenv').config();
const hre = require("hardhat");


// deployment parameters
const governance = "0x09Cf6f6F3fbf124590CEbF69fdA329B7518e7B5c" // multisig
const controllerFeeRecipient = governance // governance currently
const protocolStreamingFee = new BN(500000000000000000) // currently set to 50 %. 1 % = 1e16, percentage protocol keeps from total streaming fee set by manager
const baseToken = "0xB12BFcA5A55806AaF64E99521918A4bf0fC40802"
const router = '0x2CB45Edb4517d5947aFdE3BEAbF95A582506858B'
const adapterName = 'UniswapV2IndexExchangeAdapter'

class System {
    private _provider: providers.Web3Provider | providers.JsonRpcProvider;
    private _ownerAddress: Address;
    private _ownerSigner: Signer;
    private _deployer: DeployHelper;

    public feeRecipient: Address;

    public controller: Controller;
    public integrationRegistry: IntegrationRegistry;
    public factory: SetTokenCreator;

    public issuanceModule: BasicIssuanceModule;
    public streamingFeeModule: StreamingFeeModule;
    public generalIndexModule: GeneralIndexModule;

    public uniswapV2IndexExchangeAdapter: UniswapV2IndexExchangeAdapter;

    constructor(provider: providers.Web3Provider | providers.JsonRpcProvider, ownerAddress: Address) {
        this._provider = provider;
        this._ownerAddress = ownerAddress;
        this._ownerSigner = provider.getSigner(ownerAddress);
        this._deployer = new DeployHelper(this._ownerSigner);
    }

    // deploy
    public async deploy(): Promise<void> {
        this.feeRecipient = controllerFeeRecipient

        this.controller = await this._deployer.core.deployController(this.feeRecipient);
        console.log(chalk.blue("Controller deployed at:", this.controller.address));
        this.integrationRegistry = await this._deployer.core.deployIntegrationRegistry(this.controller.address);
        console.log(chalk.blue("IntegrationRegistry deployed at:", this.integrationRegistry.address));
        this.factory = await this._deployer.core.deploySetTokenCreator(this.controller.address);
        console.log(chalk.blue("Factory deployed at:", this.factory.address));


        this.issuanceModule = await this._deployer.modules.deployBasicIssuanceModule(this.controller.address);
        console.log(chalk.blue("IssuanceModule deployed at:", this.issuanceModule.address));
        this.streamingFeeModule = await this._deployer.modules.deployStreamingFeeModule(this.controller.address);
        console.log(chalk.blue("StreamingFeeModule deployed at:", this.streamingFeeModule.address));
        this.generalIndexModule = await this._deployer.modules.deployGeneralIndexModule(this.controller.address, baseToken);
        console.log(chalk.blue("GeneralIndexModule deployed at:", this.generalIndexModule.address));

        this.uniswapV2IndexExchangeAdapter = await this._deployer.adapters.deployUniswapV2IndexExchangeAdapter(router);
        console.log(chalk.blue("UniswapV2IndexExchangeAdapter deployed at:", this.uniswapV2IndexExchangeAdapter.address));

    }

    // wireup
    public async wireup(): Promise<void> {
        const modules = [this.issuanceModule.address, this.generalIndexModule.address, this.streamingFeeModule.address]

        await this.controller.initialize(
            [this.factory.address], // Factories
            modules, // Modules
            [this.integrationRegistry.address], // Resources
            [0]  // Resource IDs where IntegrationRegistry is 0, PriceOracle is 1, SetValuer is 2
        );
        console.log(chalk.blue("Controller initialized"));
        await this.controller.addFee(
            this.streamingFeeModule.address,
            0,
            protocolStreamingFee.toFixed()
        )
        console.log(chalk.blue("StreamingFeeModule fee added to Controller"));
        await this.integrationRegistry.addIntegration(
            this.generalIndexModule.address,
            adapterName,
            this.uniswapV2IndexExchangeAdapter.address
        )
        console.log(chalk.blue("UniswapV2IndexExchangeAdapter linked to Controller"));
    }

    // handover
    public async handover(): Promise<void> {
        await this.controller.transferOwnership(governance)
        console.log(chalk.blue("Controller ownership transferred"));
        await this.integrationRegistry.transferOwnership(governance)
        console.log(chalk.blue("Controller ownership transferred"));

    }
}

async function main() {

    //  setup
    console.log(chalk.green("'---------------------[ Setup Start ]---------------------------'"));
    let provider = new ethers.providers.JsonRpcProvider('https://mainnet.aurora.dev');
    // let provider = hre.ethers.provider
    // const deployerWallet = new hre.ethers.Wallet(`df57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e`, provider);
    const deployerWallet = new ethers.Wallet(`${process.env.AURORA_PRIVATE_KEY}`, provider);
    const system = new System(provider, deployerWallet.address)
    // console.log(chalk.blue(`Deploying with wallet ${deployerWallet.address} (bal: ${await deployerWallet.getBalance().toString()})`));
    console.log(chalk.green("'---------------------[ Setup End ]---------------------------'"));

    // deploy contracts
    console.log(chalk.green("'---------------------[ Deploy Start ]---------------------------'"));
    await system.deploy()
    console.log(chalk.green("'---------------------[ Deploy End ]---------------------------'"));

    // wireup
    console.log(chalk.green("'---------------------[ Wireup Start ]---------------------------'"));
    await system.wireup()
    console.log(chalk.green("'---------------------[ Wireup End ]---------------------------'"));

    // handover
    console.log(chalk.green("'---------------------[ Handover Start ]---------------------------'"));
    await system.handover()
    console.log(chalk.green("'---------------------[ Handover End ]---------------------------'"));

    // print table

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });