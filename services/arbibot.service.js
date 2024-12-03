import {PrismaClient} from '@prisma/client';
import {EthersService} from './ethers.service.js';
import {CronService} from './cron.service.js';
import schedule from 'node-schedule';
import {Telegraf} from 'telegraf';
import {ethers} from 'ethers';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import hbs from 'handlebars';
import {fileURLToPath} from 'url';
import MandrillService from "./madrill.service.js";

const telegramApiKey = process.env.TELEGRAM_API_KEY;
const telegramGroupId = process.env.TELEGRAM_GROUP_ID;
const bot = new Telegraf(telegramApiKey);
const prisma = new PrismaClient();
const WAIT_INTERVAL = 5000; // 5 segundos
const MAX_WAIT_TIME = 1200000; // 20 minutos
const maxSlippage = parseFloat(process.env.MAX_SLIPPAGE);
const slippageStarting = parseFloat(process.env.SLIPPAGE_START);
let elapsedTime = 0;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

hbs.registerHelper('ifEquals', function (arg1, arg2, options) {
    return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
});

hbs.registerHelper('ifNotEmpty', function (arg1, options) {
    return (arg1 && arg1.length > 0) ? options.fn(this) : options.inverse(this);
});

hbs.registerHelper('encodeString', function (inputData) {
    return new hbs.SafeString(inputData);
});
const emailHTML = fs.readFileSync(path.resolve(__dirname, '../assets/templates/swap.html'), 'utf8');
const emailHTMLTemplate = hbs.compile(emailHTML);

class ArbibotService {

    static async initArbitrage(email) {

        let user, session, telegramConfig;
        user = await prisma.user.upsert({
            where: {email},
            update: {},
            create: {
                login: 'testUser',
                email: 'test@admin.mx',
                nicename: 'Test Admin',
                password: 'securePassword',
                type: 'User',
                status: 'Active',
                language: 'en',
                walletAddress: '0x8532a6CbEA6a7d30B46E5a015391840Ff1C472F3'
            },
        });
        session = await prisma.tradingSession.create({
            data: {
                userId: user.id,
                startTime: new Date(),
                endTime: new Date(new Date().getTime() + 30 * 60000),
            },
        });
        await prisma.telegramConfig.upsert({
            where: {userId: user.id},
            update: {},
            create: {
                userId: user.id,
                tokenId: telegramApiKey,
                groupId: telegramGroupId,
            },
        });

        const cronJob = await CronService.createCronJob(
            session.id,
            `arbitrage-${session.id}`,
            'pending',
            {email: email},
        );
        await this.arbitrageOpportunity(
            cronJob.id,
            session,
            user
        );
        schedule.scheduleJob('*/5 * * * * *', async () => {
            console.log('Running cron job');
            await this.arbitrageOpportunity(
                cronJob.id,
                session,
                user
            );
        });

    }

    static async fetchPricesAndBalance() {
        const prices = await EthersService.getLatestPrices();
        const currentBalance = await EthersService.getBalance();
        return {
            prices,
            currentBalance,
        };
    }

    static async replaceHtmlVariables(data) {

        return emailHTMLTemplate({
            profitGenerated: data.profitGenerated,
            currency: data.currency,
            currentAVAXBalance: data.currentAVAXBalance,
            lastBalance: data.lastBalance,
            dateTime: data.dateTime,
        });
    }

    static async arbitrageOpportunity(cronJobId, session, user) {
        const cron = await CronService.checkCronRunning(session?.id, cronJobId);
        let blockNumber;
        // Check if there is a cron running
        if (cron?.id) {
            console.log('Cron is currently running. Skipping this iteration.');
            return;
        }
        // Get the current balance of the user in Wrapped Ether
        const currentWethBalance = await EthersService.getBalance(process.env.WETH_ADDRESS);
        // Fetch DEX prices and current AVAX balance
        const {prices, currentBalance} = await this.fetchPricesAndBalance();
        // console log using yellow
        console.log('\x1b[33m%s\x1b[0m', `Threshold: ${process.env.MIN_DIFFERENCE}%`);
        // console log using orange COLOR max slippage
        console.log('\x1b[38;5;214m%s\x1b[0m', `Max Slippage: ${maxSlippage}%`);

        console.log('\x1b[35m%s\x1b[0m', `Exchanges Dif: ${prices.percentageDifference}%`);
        let currentAvaxBalance = currentBalance;
        // If the percentage difference is greater than the minimum difference set in the .env file
        // It will start the arbitrage process
        /// AQUI PON La instruccion prisma para crear una entrada en BALANCE porfavor, SOLO DAME ESTE FRAGMENTO DE CODE
        /// get block  number using ethers

        if (prices.percentageDifference >= process.env.MIN_DIFFERENCE) {
            // Update the cron job status to running
            await CronService.updateCronJob(cronJobId, {jobStatus: 'running'});
            // It might be the case that during the swaṕ AVAX->WETH->WETH---/-->AVAX the last swap fails so we should have more WETH than AVAX
            // if we have more WETH than AVAX we should swap WETH for AVAX

            if (currentWethBalance > 0 && currentAvaxBalance < 1.5) {
                const resultWethAvaxTx = await this.swapWethForAvax(session.id, prices, user);
                if (!resultWethAvaxTx) {

                    await CronService.updateCronJob(cronJobId, {jobStatus: 'pending'});
                    return;
                }
            }
            let tx;
            let txSuccess = false;
            let slippage = slippageStarting;
            let newArbitrageOpportunity;
            let currentAvaxBalanceMinusGas = currentAvaxBalance - 0.2;
            let expectedProfit = currentAvaxBalanceMinusGas * (prices.percentageDifference / 100) - (currentAvaxBalanceMinusGas * (slippage / 100));
            let wethToReceive = currentAvaxBalanceMinusGas * prices.lowestPriceDex.priceWeth;
            ///  Imprime cuantoBalance tengo, Cuanto se va a intercambiar menos GAS, cuanto se deja de GAS, imprime cuando deberia recibir pero imprime la mayoria de datos para que en console pueda sber porque se calcula qué
            console.log(`[Information]
				1 AVAX equivale a ${prices.lowestPriceDex.priceWeth} WETH
				${currentAvaxBalanceMinusGas} AVAX equivale a ${currentAvaxBalanceMinusGas * prices.lowestPriceDex.priceWeth} WETH
				Se espera recibir ${wethToReceive} WETH
				A ese weth le restamos el slippage del ${slippage}%
				Se espera recibir ${wethToReceive - (wethToReceive * (slippage / 100))} WETH`);
            newArbitrageOpportunity = await prisma.arbitrageOpportunity.create({
                data: {
                    sessionId: session.id,
                    highestPriceDex: prices.highestPriceDex.dex,
                    lowestPriceDex: prices.lowestPriceDex.dex,
                    percentageDifference: prices.percentageDifference,
                    expectedProfit: expectedProfit,
                    buyPrice: prices.lowestPriceDex.priceAvax,
                    sellPrice: prices.highestPriceDex.priceAvax,
                    tokenIn: 'AVAX',
                    initialBalance: currentAvaxBalance,
                    tokenOut: 'WETH',
                    slippage: slippage,
                    buyExchange: prices.lowestPriceDex.dex,
                    sellExchange: prices.highestPriceDex.dex,
                },
            });
            while (!txSuccess && slippage < maxSlippage) {

                console.log('Slippage.... ', slippage);
                try {
                    let amountsOut = await EthersService.getAmountsOut(
                        process.env.WAVAX_ADDRESS,
                        process.env.WETH_ADDRESS,
                        currentAvaxBalanceMinusGas,
                        prices.lowestPriceDex.dex,
                    );
                    let amountOutMin = wethToReceive - (wethToReceive * (slippage / 100));
                    let a;
                    let diffPercentage;

                    for (let i = 0; i < amountsOut.length; i++) {
                        // from wei to ether
                        a = ethers.utils.formatEther(amountsOut[i]);
                        console.log(`Amount out ${i}  = ${a.toString()}`);
                        let diff = amountOutMin - a;
                        diffPercentage = diff / amountOutMin * 100;
                        console.log(`Diff Percentage = ${diffPercentage}`);
                    }

                    console.log('A ESTA ACA', a, amountOutMin);
                    console.log(`🎉🥳🎉🥳 - We still win if this is positive: ${prices.percentageDifference - diffPercentage - slippage}%`);

                    if (prices.percentageDifference - diffPercentage - slippage < 0) {
                        console.log('No se puede hacer arbitraje con este slippage');
                        await CronService.updateCronJob(cronJobId, {jobStatus: 'pending'});
                        return;
                    }

                    blockNumber = await EthersService.getBlockNumber();
                    console.log(chalk.green('Block number:', blockNumber, '🔗'));
                    console.log(chalk.green('Wallet:', user.walletAddress, '💼'));
                    await prisma.balance.create({
                        data: {
                            userId: user.id,
                            address: user.walletAddress,
                            tokenSymbol: 'AVAX',
                            balance: currentAvaxBalance,
                            blockNumber: blockNumber,
                            timestamp: new Date(),
                        },
                    });
                    tx = await EthersService.performSwap({
                        tokenInAddress: process.env.WAVAX_ADDRESS,
                        tokenOutAddress: process.env.WETH_ADDRESS,
                        amountIn: currentAvaxBalanceMinusGas,
                        amountOut: a,
                        isNativeIn: true,
                        isNativeOut: false,
                        exchange: prices.lowestPriceDex.dex,
                        slippage: slippage,
                    });
                    console.log(`Transacción exitosa con slippage de ${slippage}%. Hash: ${tx}`);
                    txSuccess = true;

                    /// Aqui la transaccion
                    const wethBalanceAfterSwap = await EthersService.getBalance(process.env.WETH_ADDRESS);
                    const newTransaction = await prisma.transaction.create({
                        data: {
                            sessionId: session.id,
                            transactionHash: tx,
                            link: `https://snowtrace.io/transactions/${tx}`,
                            amount: currentAvaxBalanceMinusGas,
                            tokens: {
                                tokenIn: 'AVAX',
                                tokenOut: 'WETH',
                            },
                            balance: wethBalanceAfterSwap,
                            timestamp: new Date(),
                        },
                    });
                    await bot.telegram.sendMessage(
                        telegramGroupId,
                        `SWAP AVAX-WETH <pre>${JSON.stringify(newTransaction, null, 2)}</pre>`,
                        {parse_mode: 'HTML'},
                    );

                } catch (error) {
                    console.error(`Transacción fallida con slippage de ${slippage}%. Intentando de nuevo con mayor slippage...`);
                    // console.error(error?.reason);
                    // console log in red color the reason of the error
                    console.log('Error swapper moptherfuckar:', error);
                    console.error(`\x1b[31m%s\x1b[0m${error}`);
                    slippage += 0.1;
                    slippage = parseFloat(slippage.toFixed(4));
                    /// vuelve slippage maximo dos decimales
                    await prisma.arbitrageOpportunity.update({
                        where: {id: newArbitrageOpportunity.id},
                        data: {
                            slippage: slippage,
                            expectedProfit: currentAvaxBalanceMinusGas * (prices.percentageDifference / 100) - (currentAvaxBalanceMinusGas * (slippage / 100)),
                        },
                    });
                    await prisma.failedAttempt.create({
                        data: {
                            sessionId: session.id,
                            slippage: slippage,
                            reason: error.message,
                            dex: prices.lowestPriceDex.dex,
                            tokenIn: 'AVAX',
                            tokenOut: 'WETH',
                            amountIn: currentAvaxBalanceMinusGas,
                            amountOutExpected: wethToReceive,
                            timestamp: new Date(),
                        },
                    });

                }
            }
            console.log('USER AGAIN', user);
            await this.swapWethForAvax(session.id, prices, user);
            await CronService.updateCronJob(cronJobId, {jobStatus: 'pending'});
        } else {
            console.log('No hay oportunidad de arbitraje....');
        }
    }

    static async swapWethForAvax(sessionId, prices, user) {
        let slippage = slippageStarting;
        let txSuccess = false;

        console.log('Iniciando con Slippage.... ', slippage);
        console.log("USER: ", user)

        while (!txSuccess && slippage <= maxSlippage) {
            try {
                let {prices, currentBalance} = await this.fetchPricesAndBalance();
                const currentWethBalance = await EthersService.getBalance(process.env.WETH_ADDRESS);

                let amountsOut = await EthersService.getAmountsOut(
                    process.env.WETH_ADDRESS,
                    process.env.WAVAX_ADDRESS,
                    currentWethBalance,
                    prices.highestPriceDex.dex,
                );
                let a;
                let avaxToReceive = currentWethBalance * prices.highestPriceDex.priceAvax;
                let diffPercentage;

                for (let i = 0; i < amountsOut.length; i++) {
                    // from wei to ether
                    a = ethers.utils.formatEther(amountsOut[i]);
                    console.log(`Amount out ${i}  = ${a.toString()}`);
                    let diff = avaxToReceive - a;
                    diffPercentage = diff / avaxToReceive * 100;
                    console.log(`Diff Percentage = ${diffPercentage}`);
                    // console log avaxToReceive
                    console.log(`AVAX to receive = ${avaxToReceive}`);
                }

                const latestAvaxBalance = await prisma.balance.findFirst({
                    where: {
                        userId: user.id,
                        tokenSymbol: 'AVAX'
                    },
                    orderBy: {
                        timestamp: 'desc'
                    }
                });


                chalk.green('Latest AVAX balance:', latestAvaxBalance.balance, '💼');
                console.log(`🎉🥳🎉🥳 - We still win if this is positive: ${prices.percentageDifference - diffPercentage - slippage}%`);
                chalk.green(`Win if Outcome AVAX: ${a} is greater than ${latestAvaxBalance.balance} 💼`);

                if (prices.percentageDifference - diffPercentage - slippage < 0) {
                    console.log('No se puede hacer arbitraje con este slippage');
                    return;
                }

                if(a < latestAvaxBalance.balance){
                    console.log('No se puede hacer arbitraje con este slippage');
                    return;
                }

                const tx = await EthersService.performSwap({
                    tokenInAddress: process.env.WETH_ADDRESS,
                    tokenOutAddress: process.env.WAVAX_ADDRESS,
                    amountIn: currentWethBalance,
                    amountOut: a,
                    isNativeIn: false,
                    isNativeOut: true,
                    exchange: prices.highestPriceDex.dex,
                    slippage: slippage,
                });
                txSuccess = true;
                const newTransaction = await prisma.transaction.create({
                    data: {
                        sessionId: sessionId,
                        transactionHash: tx,
                        link: `https://snowtrace.io/transactions/${tx}`,
                        amount: currentWethBalance,
                        tokens: {
                            tokenIn: 'WETH',
                            tokenOut: 'AVAX',
                        },
                        balance: await EthersService.getBalance(process.env.WETH_ADDRESS), // Obtén el balance después del swap
                        timestamp: new Date(),
                    },
                });


                /// get the profit
                /// get the balance of AVAX
                const newBalance = await EthersService.getBalance();
                const profitGenerated = newBalance - latestAvaxBalance.balance;

                const date = new Date();
                const options = {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                };
                const dateTimeInSpanish = date.toLocaleString('es-MX', options);


                const emailData = {
                    profitGenerated: profitGenerated,
                    currency: 'AVAX',
                    lastBalance: latestAvaxBalance.balance,
                    currentAVAXBalance: newBalance,
                    dateTime: dateTimeInSpanish,
                };

                const html = await this.replaceHtmlVariables(emailData);
                const message = {
                    from_email: 'swaps@ag1.tech',
                    from_name: 'Arbitrage Bot',
                    to: [
                        {email: 'jesusbatallar@gmail.com', name: "Arbitrage Bot", type: 'to'},
                        {email: 'bh0018@icloud.com', name: "Arbitrage Bot", type: 'to'},
                        // {email: 'caballerofermi@gmail.com', name: "Arbitrage Bot", type: 'to'},
                        //{ email: 'rodrigo.tejero@chimp.mx', name: "Arbitrage Bot", type: 'to'},
                    ],
                    subject: `💰 Arbitrage Profit! 💰 - $ ${profitGenerated} AVAX`,
                    html,
                }
                try {
                    const mail = await MandrillService.sendMessage(message);
                } catch (error) {
                    console.error('Error sending status email:', error);
                }

                try {
                    await bot.telegram.sendMessage(
                        telegramGroupId,
                        `SWAP WETH-AVAX <pre>${JSON.stringify(newTransaction, null, 2)}</pre>`,
                        {parse_mode: 'HTML'},
                    );
                } catch (error) {
                    console.error('Error sending telegram message:', error);
                }

                return txSuccess;
            } catch (error) {
                let {prices, currentBalance} = await this.fetchPricesAndBalance();
                let currentWethBalance = await EthersService.getBalance(process.env.WETH_ADDRESS);
                let avaxToReceive = currentWethBalance * prices.highestPriceDex.priceAvax;
                console.log('Error conslippage.... ', slippage);
                slippage += 0.1;
                slippage = parseFloat(slippage.toFixed(4));
                console.log('Aftr....Error conslippage.... ', slippage);
                console.error(`Transacción fallida con slippage de ${slippage}%. Intentando de nuevo con mayor slippage...`);
                console.error('[Swap pre WETH-AVAX] Error?', error);
                await prisma.failedAttempt.create({
                    data: {
                        sessionId: sessionId,
                        slippage: slippage,
                        reason: error.message,
                        dex: prices.highestPriceDex.dex, // Asegúrate de tener la dirección del exchange
                        tokenIn: 'WETH',
                        tokenOut: 'AVAX',
                        amountIn: currentWethBalance,
                        amountOutExpected: avaxToReceive,
                        timestamp: new Date(),
                    },
                });

                /// update cronjob
            }
        }
        return txSuccess;
    }

}

export {ArbibotService};