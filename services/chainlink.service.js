import {ethers} from "ethers";
import {ChainlinkFeeds} from "../assets/web3/chainlinkFeeds.js";


const CHAINLINK_AGGREGATOR_ABI = [
    "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
    "function decimals() external view returns (uint8)",
    "function description() external view returns (string)"
];

class ChainlinkService {
    constructor(provider) {
        this.provider = provider;
    }

    async getPrice(baseToken, quoteToken = 'USD') {
        try {
            const feed = this._getFeed(baseToken, quoteToken);
            if (!feed) throw new Error(`No price feed found for ${baseToken}/${quoteToken}`);

            const contract = new ethers.Contract(
                feed.address,
                CHAINLINK_AGGREGATOR_ABI,
                this.provider
            );

            const [roundData, decimals] = await Promise.all([
                contract.latestRoundData(),
                contract.decimals()
            ]);

            const price = this._formatPrice(roundData.answer, decimals);
            const timestamp = roundData.updatedAt.toNumber();

            return {
                price,
                timestamp,
                pair: `${baseToken}/${quoteToken}`,
                address: feed.address
            };
        } catch (error) {
            throw new Error(`Error fetching price for ${baseToken}/${quoteToken}: ${error.message}`);
        }
    }

    async getPrices(tokens, quoteToken = 'USD') {
        const promises = tokens.map(token => this.getPrice(token, quoteToken));
        return Promise.all(promises);
    }

    _getFeed(baseToken, quoteToken) {
        const quotePairs = ChainlinkFeeds[quoteToken];
        if (!quotePairs) return null;
        return quotePairs[baseToken];
    }

    _formatPrice(price, decimals) {
        return Number(ethers.utils.formatUnits(price, decimals));
    }

    static getAllSupportedPairs() {
        const pairs = [];
        Object.entries(ChainlinkFeeds).forEach(([quote, basePairs]) => {
            Object.entries(basePairs).forEach(([base, _]) => {
                pairs.push(`${base}/${quote}`);
            });
        });
        return pairs;
    }

    static isSupported(baseToken, quoteToken = 'USD') {
        return !!ChainlinkFeeds[quoteToken]?.[baseToken];
    }
}

export default ChainlinkService;
