import { ethers, providers, Wallet, BigNumberish, ContractTransaction } from "ethers";
import { BigNumber as BN } from "bignumber.js";
import chalk from "chalk";

import { SetToken, SetTokenCreator, BasicIssuanceModule, StreamingFeeModule, GeneralIndexModule } from '../utils/contracts'
import { SetToken__factory } from "../typechain/factories/SetToken__factory";
import { SetTokenCreator__factory } from "../typechain/factories/SetTokenCreator__factory";
import { BasicIssuanceModule__factory } from "../typechain/factories/BasicIssuanceModule__factory";
import { GeneralIndexModule__factory } from "../typechain/factories/GeneralIndexModule__factory";
import { StreamingFeeModule__factory } from "../typechain/factories/StreamingFeeModule__factory";

import {
    ether,
    ProtocolUtils,
} from "../utils/common";
import {
    Address,
} from "../utils/types";

require('dotenv').config();
const hre = require("hardhat");

import { FeeStateStruct } from '../typechain/StreamingFeeModule'

/*
* PARAMS
*/

const streamingFeeRecipient = '0x09Cf6f6F3fbf124590CEbF69fdA329B7518e7B5c'
const dev = '0x76F828E072F9E1c148Ffb1806421eD3472f84eaD'

const manager = '0x09Cf6f6F3fbf124590CEbF69fdA329B7518e7B5c'

const factory = '0xb95AA04cb101C341a3B1CD2317d8215EA005A085'
const issuance = '0x1Aa35A9c1e942A9bf8f9C83Adb36b83355Fef5b0'
const streaming = '0xEa6fFFd7e4ea0b07C10C85d87D392Ef76C0A2A24'
const index = '0x4970C5b5420BdE396c63607927bd6F6cEbE26f21'

const modules = [
    issuance,
    streaming,
    index,
]

const components = [
    '0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd',
    '0x60781c2586d68229fde47564546784ab3faca982',
    '0x8729438eb15e2c8b576fcc6aecda6a148776c0f5',
    '0x59414b3089ce2af0010e7523dea7e2b35d776ec7',
    '0xb54f16fb19478766a268f172c9480f8da1a7c9c3',
]

const units = [
    (new BN(168067226890756000)).toFixed(),
    (new BN(535237351003303000)).toFixed(),
    (new BN(3230287172529640000)).toFixed(),
    (new BN(81533481724270)).toFixed(),
    (new BN(612764)).toFixed()
]



const feeState = [streamingFeeRecipient, (new BN(2e16)).toFixed(), (new BN(1e16)).toFixed(), 0]

const name = 'TEST TOKEN'

const symbol = 'TEST'


function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/*
* SETUP
* */

class System {
    private _provider: providers.Web3Provider | providers.JsonRpcProvider;
    private _deployer: Wallet;

    public setToken: SetToken;
    public factory: SetTokenCreator;

    public issuanceModule: BasicIssuanceModule;
    public streamingFeeModule: StreamingFeeModule;
    public generalIndexModule: GeneralIndexModule;


    constructor(provider: providers.Web3Provider | providers.JsonRpcProvider, deployer: Wallet) {
        this._provider = provider;
        this._deployer = deployer
    }

    public async createSetToken(
        components: Address[],
        units: BigNumberish[],
        modules: Address[],
        manager: Address,
        name: string,
        symbol: string,
        factory: Address
    ): Promise<any> {
        this.factory = await new SetTokenCreator__factory(this._deployer).attach(factory)

        const txHash: ContractTransaction = await this.factory.create(
            components,
            units,
            modules,
            manager,
            name,
            symbol,
        );

        const retrievedSetAddress = await new ProtocolUtils(this._provider).getCreatedSetTokenAddress(txHash.hash);
        this.setToken = await new SetToken__factory(this._deployer).attach(retrievedSetAddress)
        console.log('set token deployed at:', this.setToken.address)
        await delay(30000);
    }

    public async wireup(): Promise<void> {
        const zeroAddress = '0x0000000000000000000000000000000000000000'

        // initialize token on issuance
        this.issuanceModule = await new BasicIssuanceModule__factory(this._deployer).attach(issuance)
        let issuanceTxHash: ContractTransaction = await this.issuanceModule.initialize(
            this.setToken.address,
            zeroAddress,
        );
        console.log('set token initialized in issuance at:', issuanceTxHash.hash)
        await delay(30000);

        // initialize token on streaming
        this.streamingFeeModule = await new StreamingFeeModule__factory(this._deployer).attach(streaming)
        let streamingTxHash: ContractTransaction = await this.streamingFeeModule.initialize(
            this.setToken.address,
            feeState as unknown as FeeStateStruct,
        );
        console.log('set token initialized in streaming at:', streamingTxHash.hash)
        await delay(30000);


        //  general index module initalize
        this.generalIndexModule = await new GeneralIndexModule__factory(this._deployer).attach(index)
        let indexTxHash: ContractTransaction = await this.generalIndexModule.initialize(
            this.setToken.address,
        );
        console.log('set token initialized in general index at:', indexTxHash.hash)
    }

    public async handover(manager: Address): Promise<void> {
        // handover token
        let handoverTxHash: ContractTransaction = await this.setToken.setManager(manager);
        console.log('set token handed over to new manager at:', handoverTxHash.hash)
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
    await system.createSetToken(components, units, modules, dev, name, symbol, factory)
    await delay(30000);
    await system.wireup()
    await delay(30000);
    await system.handover(manager)
}


main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
