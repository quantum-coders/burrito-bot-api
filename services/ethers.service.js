import {ethers} from 'ethers';
import {pangolinRouter, sushiRouter, traderJoeRouterv1} from '../data/abis/routers.js';
import {joeABI, pangolinPairABI, sushiPairABI} from '../data/abis/dexes.js';
import {erc20Abi} from '../data/abis/erc20.js';

const provider = new ethers.providers.JsonRpcProvider(process.env.MAINNET_RPC_PROVIDER);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const traderJoePair = new ethers.Contract(process.env.TRADER_JOE_PAIR_WETH_WAVAX_MAINNET, joeABI, provider);
const sushiPair = new ethers.Contract(process.env.SUSHISWAP_PAIR_WETH_WAVAX_MAINNET, sushiPairABI, provider);
const pangolinPair = new ethers.Contract(process.env.PANGOLIN_PAIR_WETH_WAVAX_MAINNET, pangolinPairABI, provider);

class EthersService {
    static routerAbi;
    static routerAddress;
    static swapFunctionName;

    static async getBalanceAtBlock(address, blockNumber) {
        const balance = await provider.getBalance(address, blockNumber);
        return ethers.utils.formatEther(balance);
    }

    static async getBlockNumber() {
        const provider = new ethers.providers.JsonRpcProvider(process.env.MAINNET_RPC_PROVIDER);
        return await provider.getBlockNumber();
    }

    static async getAmountsOut(tokenInAddress, tokenOutAddress, amountIn, exchange) {
        switch (exchange) {
            case 'sushi':
                this.routerAddress = process.env.SUSHISWAP_ROUTER_ADDRESS;
                this.routerAbi = sushiRouter;
                this.swapFunctionName = 'getAmountsOut';
                break;
            case 'trader-joe':
                this.routerAddress = process.env.TRADER_JOE_ROUTER_ADDRESS_V1;
                this.routerAbi = traderJoeRouterv1;
                this.swapFunctionName = 'getAmountsOut';
                break;
            case 'pangolin':
                this.routerAddress = process.env.PANGOLIN_ROUTER_ADDRESS;
                this.routerAbi = pangolinRouter;
                this.swapFunctionName = 'getAmountsOut';
                break;
            default:
                return;
        }

        const contractRouter = new ethers.Contract(this.routerAddress, this.routerAbi, provider);
        const path = [tokenInAddress, tokenOutAddress];
        const amountInParsed = ethers.utils.parseEther(amountIn.toString());
        let amounts;
        try {
            amounts = await contractRouter[this.swapFunctionName](amountInParsed, path);
            console.log(`Amounts out: ${ethers.utils.formatEther(amounts[1])}`);
            return amounts;
        } catch (error) {
            console.log('Error in getAmountsOut');
            console.log(error);
            throw error;
        }

    }

    static async getBalance(address = null) {
        if (address) {
            const tokenContract = new ethers.Contract(address, erc20Abi, wallet);
            const balance = await tokenContract.balanceOf(wallet.address);
            return ethers.utils.formatEther(balance);
        }
        const balance = await wallet.getBalance();
        console.log('\x1b[31m%s\x1b[0m', `Hora: ${new Date().getHours()}:${new Date().getMinutes()} :${new Date().getSeconds()}`);
        console.log('\x1b[32m%s\x1b[0m', `Balance: ${ethers.utils.formatEther(balance)}`);
        return ethers.utils.formatEther(balance);

    }

    static async increaseAllowance(tokenAddress, spenderAddress) {
        console.log(`Token address: ${tokenAddress}, spender address: ${spenderAddress}`);
        const token = new ethers.Contract(tokenAddress, erc20Abi, wallet);
        const tokenBalance = await token.balanceOf(wallet.address);
        const txApprove = await token.approve(spenderAddress, tokenBalance);
        const tx1 = await txApprove.wait();
        const allowance = await token.allowance(wallet.address, spenderAddress);
        return {tx1, allowance};
    }

    static toFixedDecimalString(number, maxDecimals = 18) {
        let numberStr = number.toString();
        let [integerPart, decimalPart = ''] = numberStr.split('.');
        decimalPart = decimalPart.slice(0, maxDecimals);  // Cut off after maxDecimals
        return decimalPart.length > 0 ? `${integerPart}.${decimalPart}` : integerPart;
    }

    static async performSwap({
                                 tokenInAddress,
                                 tokenOutAddress,
                                 amountIn,
                                 amountOut,
                                 isNativeIn = true,
                                 isNativeOut = false,
                                 exchange,
                                 slippage = 0.001,
                             }) {
        switch (exchange) {
            case 'sushi':
                this.routerAddress = process.env.SUSHISWAP_ROUTER_ADDRESS;
                this.routerAbi = sushiRouter;
                this.swapFunctionName = isNativeIn ? 'swapExactETHForTokens' : 'swapTokensForExactETH';
                break;
            case 'trader-joe':
                this.routerAddress = process.env.TRADER_JOE_ROUTER_ADDRESS_V1;
                this.routerAbi = traderJoeRouterv1;
                this.swapFunctionName = isNativeIn ? 'swapExactAVAXForTokens' : 'swapTokensForExactAVAX';
                break;
            case 'pangolin':
                this.routerAddress = process.env.PANGOLIN_ROUTER_ADDRESS;
                this.routerAbi = pangolinRouter;
                this.swapFunctionName = isNativeIn ? 'swapExactAVAXForTokens' : 'swapExactTokensForAVAX';
                break;
            default:
                return;
        }
        const contractRouter = new ethers.Contract(this.routerAddress, this.routerAbi, wallet);
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
        const path = [tokenInAddress, tokenOutAddress];
        amountOut = ethers.utils.parseEther(amountOut.toString());
        amountIn = ethers.utils.parseEther(amountIn.toString());
        let tx;
        let receipt;
        let gasLimit;
        if (!Array.isArray(path)) {
            throw new Error('Invalid path hdtppppp');
        }

        if (!path.every(ethers.utils.isAddress)) {
            throw new Error('Invalid path: contains invalid Ethereum addresses');
        }

        try {
            if (!isNativeIn) {
                /// agrag

                const {tx1} = await this.increaseAllowance(tokenInAddress, this.routerAddress, amountIn);
                console.log(`
                WETH-AVAX
                    amountOut: ${amountOut.toString()},
                    amountIn: ${amountIn.toString()},
                    path: ${path},
                    wallet.address: ${wallet.address},
                    deadline: ${deadline},
                    value: ${amountIn.toString()},
                    gasLimit: ${ethers.utils.hexlify(250000)}
                `,
                );

                const estimatedGasLimit = await contractRouter.estimateGas[this.swapFunctionName](
                    amountOut,
                    amountIn,
                    path,
                    wallet.address,
                    deadline,
                );

                gasLimit = estimatedGasLimit.add(estimatedGasLimit.mul(10).div(100));

                /*                tx = await contractRouter[this.swapFunctionName].call(
                                    amountOut,
                                    amountIn,
                                    path,
                                    wallet.address,
                                    deadline,
                                    {
                                        gasLimit: gasLimit
                                    }
                                );*/

                console.log('Before call....');
                console.log(`
                WETH-AVAX
                    amountOut: ${amountOut.toString()},
                    amountIn: ${amountIn.toString()},
                    path: ${path},
                    wallet.address: ${wallet.address},
                    deadline: ${deadline},
                    value: ${amountIn.toString()},
                    gasLimit: ${ethers.utils.hexlify(250000)}
                `,
                );

                tx = await contractRouter[this.swapFunctionName](
                    amountOut,
                    amountIn,
                    path,
                    wallet.address,
                    deadline,
                    {
                        gasLimit: gasLimit,
                    },
                );
                receipt = await tx.wait();
            } else {
                console.log(`
                AVAX-WETH
                    amountOut: ${amountOut.toString()},
                    path: ${path},
                    wallet.address: ${wallet.address},
                    deadline: ${deadline},
                    value: ${amountIn.toString()},
                    gasLimit: ${ethers.utils.hexlify(250000)}
                `,
                );
                console.log('\x1b[32m%s\x1b[0m', `
                await contractRouter[this.swapFunctionName].call(
                  ${amountOut.toString()},
                    ${path},
                    ${wallet.address},
                    ${deadline},
                    {
                        value: ${amountIn.toString()},
                        gasLimit: ${ethers.utils.hexlify(250000)}
                    }
                );
                `);
                const estimatedGasLimit = await contractRouter.estimateGas[this.swapFunctionName](
                    amountOut,
                    path,
                    wallet.address,
                    deadline,
                    {
                        value: amountIn,
                        gasLimit: ethers.utils.hexlify(550000),
                    },
                );
                console.log('Estimated gas limit: ', estimatedGasLimit.toString());
                gasLimit = estimatedGasLimit.add(estimatedGasLimit.mul(10).div(100));
                console.log(`wallet address: ${wallet.address}`);
                console.log('Before call....');
                console.log(`
                AVAX-WETH
                    amountOut: ${amountOut.toString()},
                    path: ${path},
                    wallet.address: ${wallet.address},
                    deadline: ${deadline},
                    value: ${amountIn.toString()},
                    gasLimit: ${ethers.utils.hexlify(250000)}
                `,
                );
                console.log('\x1b[32m%s\x1b[0m', `
                await contractRouter[this.swapFunctionName].call(
                  ${amountOut.toString()},
                    ${path},
                    ${wallet.address},
                    ${deadline},
                    {
                        value: ${amountIn.toString()},
                        gasLimit: ${gasLimit.toString()}
                    }
                );
                `);
                /*   let txTesting = await contractRouter[this.swapFunctionName].call(
                       amountOut,
                       path,
                       wallet.address,
                       deadline,
                       {
                           value: amountIn,
                           gasLimit
                       }
                   );*/
                console.log('After call....');
                tx = await contractRouter[this.swapFunctionName](
                    amountOut,
                    path,
                    wallet.address,
                    deadline,
                    {
                        value: amountIn,
                        gasLimit,
                    },
                );
                receipt = await tx.wait();
            }
            console.log('TX result');
            console.log(receipt);
            return receipt.transactionHash;
        } catch (e) {
            throw e;
        }
    }

    static async getReservesAndPrices(pair) {
        const reserves = await pair.getReserves();
        const reserveAVAX = ethers.utils.formatUnits(reserves[0], 'wei');
        const reserveWETH = ethers.utils.formatUnits(reserves[1], 'wei');
        const priceAVAXinWETH = Number(reserveWETH) / Number(reserveAVAX);
        const priceWETHinAVAX = Number(reserveAVAX) / Number(reserveWETH);
        return {priceAVAXinWETH, priceWETHinAVAX};
    }

    static async getLatestPrices() {
        try {
            const dexPairs = [traderJoePair, pangolinPair, sushiPair];
            const dexNames = ['trader-joe', 'pangolin', 'sushi'];
            let prices = await Promise.all(dexPairs.map((pair, index) => this.getReservesAndPrices(pair)
                .then(({priceAVAXinWETH, priceWETHinAVAX}) => ({
                    dex: dexNames[index],
                    priceAvax: priceAVAXinWETH,
                    priceWeth: priceWETHinAVAX,
                }))));
            prices.sort((a, b) => b.priceAvax - a.priceAvax);
            const highestPriceDex = prices[0];
            const lowestPriceDex = prices[2];
            console.log('\x1b[36m%s\x1b[0m', `Mayor price: ${highestPriceDex.dex} con ${highestPriceDex.priceAvax}.`);
            console.log('\x1b[36m%s\x1b[0m', `Menor price: ${lowestPriceDex.dex} con ${lowestPriceDex.priceAvax}.`);
            const percentageDifference = ((highestPriceDex.priceAvax - lowestPriceDex.priceAvax) / lowestPriceDex.priceAvax) * 100;
            console.log(`Diferencia porcentual: ${percentageDifference.toFixed(7)}%`);
            return {
                traderJoePrice: prices[0],
                pangolinPrice: prices[1],
                sushiPrice: prices[2],
                highestPriceDex,
                lowestPriceDex,
                percentageDifference: percentageDifference.toFixed(2),
            };
        } catch (error) {
            throw error;
        }
    }

}

export {EthersService};