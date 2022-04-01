import { ethers, providers, Wallet } from "ethers";
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


import { Controller__factory } from "../typechain/factories/Controller__factory";
import { IntegrationRegistry__factory } from "../typechain/factories/IntegrationRegistry__factory";
import { SetTokenCreator__factory } from "../typechain/factories/SetTokenCreator__factory";
import { BasicIssuanceModule__factory } from "../typechain/factories/BasicIssuanceModule__factory";
import { GeneralIndexModule__factory } from "../typechain/factories/GeneralIndexModule__factory";
import { StreamingFeeModule__factory } from "../typechain/factories/StreamingFeeModule__factory";
import { UniswapV2IndexExchangeAdapter__factory } from "../typechain/factories/UniswapV2IndexExchangeAdapter__factory";



/*
* PARAMS
* */
const governance = "0x09Cf6f6F3fbf124590CEbF69fdA329B7518e7B5c" // multisig
const controllerFeeRecipient = governance // governance currently
const protocolStreamingFee = new BN(500000000000000000) // currently set to 50 %. 1 % = 1e16, percentage protocol keeps from total streaming fee set by manager
const baseToken = "0xB12BFcA5A55806AaF64E99521918A4bf0fC40802"
const router = '0x2CB45Edb4517d5947aFdE3BEAbF95A582506858B'
const adapterName = 'UniswapV2IndexExchangeAdapter'

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}



/*
* SETUP
* */
class System {
    private _provider: providers.Web3Provider | providers.JsonRpcProvider;
    private _deployer: Wallet;

    public controller: Controller;
    public integrationRegistry: IntegrationRegistry;
    public factory: SetTokenCreator;

    public issuanceModule: BasicIssuanceModule;
    public streamingFeeModule: StreamingFeeModule;
    public generalIndexModule: GeneralIndexModule;

    public uniswapV2IndexExchangeAdapter: UniswapV2IndexExchangeAdapter;

    constructor(provider: providers.Web3Provider | providers.JsonRpcProvider, deployer: Wallet) {
        this._provider = provider;
        this._deployer = deployer
    }

    public async deployController(feeRecipient: Address): Promise<Controller> {
        this.controller = await new Controller__factory(this._deployer).deploy(feeRecipient);
        console.log(chalk.blue("Controller deployed at:", this.controller.address));
        return this.controller
    }

    public async deployIntegrationRegistry(): Promise<IntegrationRegistry> {
        this.integrationRegistry = await new IntegrationRegistry__factory(this._deployer).deploy(this.controller.address);
        console.log(chalk.blue("IntegrationRegistry deployed at:", this.integrationRegistry.address));
        return this.integrationRegistry
    }

    public async deployFactory(): Promise<SetTokenCreator> {
        this.factory = await new SetTokenCreator__factory(this._deployer).deploy(this.controller.address);
        console.log(chalk.blue("Factory deployed at:", this.factory.address));
        return this.factory
    }

    public async deployIssuanceModule(): Promise<BasicIssuanceModule> {
        this.issuanceModule = await new BasicIssuanceModule__factory(this._deployer).deploy(this.controller.address);
        console.log(chalk.blue("IssuanceModule deployed at:", this.issuanceModule.address));
        return this.issuanceModule
    }

    public async deployGeneralIndexModule(weth: Address): Promise<GeneralIndexModule> {
        this.generalIndexModule = await new GeneralIndexModule__factory(this._deployer).deploy(this.controller.address, weth);
        console.log(chalk.blue("GeneralIndexModule deployed at:", this.generalIndexModule.address));
        return this.generalIndexModule
    }

    public async deployStreamingFeeModule(): Promise<StreamingFeeModule> {
        this.streamingFeeModule = await new StreamingFeeModule__factory(this._deployer).deploy(this.controller.address);
        console.log(chalk.blue("StreamingFeeModule deployed at:", this.streamingFeeModule.address));
        return this.streamingFeeModule
    }

    public async deployUniswapV2IndexExchangeAdapter(router: Address): Promise<UniswapV2IndexExchangeAdapter> {
        this.uniswapV2IndexExchangeAdapter = await new UniswapV2IndexExchangeAdapter__factory(this._deployer).deploy(router);
        console.log(chalk.blue("UniswapV2IndexExchangeAdapter at:", this.uniswapV2IndexExchangeAdapter.address));
        return this.uniswapV2IndexExchangeAdapter
    }

    public async wireup(): Promise<void> {
        const modules = [this.issuanceModule.address, this.generalIndexModule.address, this.streamingFeeModule.address]

        await this.controller.initialize(
            [this.factory.address], // Factories
            modules, // Modules
            [this.integrationRegistry.address], // Resources
            [0]  // Resource IDs where IntegrationRegistry is 0, PriceOracle is 1, SetValuer is 2
        );
        console.log(chalk.blue("Controller initialized"));
        await delay(30000);

        await this.controller.addFee(
            this.streamingFeeModule.address,
            0,
            protocolStreamingFee.toFixed()
        )
        console.log(chalk.blue("StreamingFeeModule fee added to Controller"));
        await delay(30000);

        await this.integrationRegistry.addIntegration(
            this.generalIndexModule.address,
            adapterName,
            this.uniswapV2IndexExchangeAdapter.address
        )
        console.log(chalk.blue("UniswapV2IndexExchangeAdapter linked to Controller"));
        await delay(30000);

    }

    public async handover(): Promise<void> {
        await this.controller.transferOwnership(governance)
        console.log(chalk.blue("Controller ownership transferred"));
        await delay(30000);

        await this.integrationRegistry.transferOwnership(governance)
        console.log(chalk.blue("IntegrationRegistry ownership transferred"));

    }

}


async function main() {
    /*
    * SETUP
    * */
    const provider = hre.ethers.provider;
    const deployerWallet = new hre.ethers.Wallet(process.env.AURORA_PRIVATE_KEY, provider);
    const system = new System(provider, deployerWallet)


    /*
    * DEPLOY CONTRACTS
    * */
    await system.deployController(controllerFeeRecipient)
    await delay(30000);

    await system.deployIntegrationRegistry()
    await delay(30000);

    await system.deployFactory()
    await delay(30000);

    await system.deployIssuanceModule()
    await delay(30000);

    await system.deployGeneralIndexModule(baseToken)
    await delay(30000);

    await system.deployStreamingFeeModule()
    await delay(30000);

    await system.deployUniswapV2IndexExchangeAdapter(router)
    await delay(30000);


    /*
    * WIREUP
    * */
    await system.wireup()

    /*
    * HANDOVER
    * */
    await system.handover()


}


main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
