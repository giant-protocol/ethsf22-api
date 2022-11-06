'use strict';

// wallet Controller
const Moralis = require("moralis").default;

module.exports = init;

function init(app, ethsf, router) {

    /**
     * Retrieve asset balance and active packs
     * @param    {walletAddress} user wallet address
     * @return   {ERC721 balance and active plans}
     */
    router.route('/wallet/plans')
        .post(function (req, res, next) {
            ethsf.helpers.api.token(ethsf).getAssets(req, function (err, response) {
                if (err) {
                    return next(err);
                }
                res.json(response);
            });
        });

    /**
     * Get transfer details on eSIM plan activation by the user
     * Have
     * @param    {transaction details}
     * @return   {status}
     */
    router.route('/wallet/plan/activate')
        .post(async function (req, res, next) {
            const {headers, body} = req;
            try {
                /* Moralis NodeJS SDK is initialized*/
                await Moralis.start({
                    apiKey: process.env.MORALIS_API_KEY,
                    // ...and any other configuration
                });

                /*verifying if the data  will receive is from Moralis*/
                Moralis.Streams.verifySignature({
                    body,
                    signature: headers["x-signature"],
                });
                var args = {};
                args.operator = req.body.nftTransfers[0];
                args.from = req.body.nftTransfers[0].from;
                args.to = req.body.nftTransfers[0].to;
                args.tokenId = req.body.nftTransfers[0].tokenId;
                args.amount = req.body.nftTransfers[0].amount;
                args.transactionHash = req.body.nftTransfers[0].transactionHash;
                args.logIndex = req.body.nftTransfers[0].logIndex;
                args.contract = req.body.nftTransfers[0].contract;
                args.tokenName = req.body.nftTransfers[0].tokenName;
                args.tokenSymbol = req.body.nftTransfers[0].tokenSymbol;

                if (args.to.toLowerCase() == process.env.ADMIN_ADDRESS.toLowerCase()) {
                    ethsf.helpers.api.token(ethsf).fetchMetadata(args, function (err, response) {
                        if (err) {
                            return next(err);
                        }
                        res.json(response);
                    });
                } else {
                    res.json(false);
                }
            } catch (e) {
                console.log(e);
                res.json(false);
            }

        });

    /**
     * Validate plan by validating payment transaction hash
     * @param    {walletAddress} user wallet address
     * @param   {tokenId} token id
     * @param   {amount} no of tokens
     * @param   {transactionHash} transfer from transactionHash
     * @return   {data} payment object
     */
    router.route('/wallet/plan/validate')
        .post(function (req, res, next) {
            var args = {};
            args.from = req.body.walletAddress;
            args.tokenId = req.body.tokenId;
            args.amount = req.body.amount;
            args.transactionHash = req.body.transactionHash;
            ethsf.helpers.api.token(ethsf).validatePurchase(args, function (err, response) {
                if (err) {
                    return next(err);
                }
                res.json(response);
            });
        });

    /**
     * Function that helps to verify esim installation
     * @param    {iccid} esim iccid
     * @return   {status} esim status
     */

    router.route('/wallet/verify/installation')
        .post(function (req, res, next) {
            var args = {};
            args.iccid = req.body.iccid;
            ethsf.helpers.api.token(ethsf).verifyInstallation(args, function (err, response) {
                if (err) {
                    return next(err);
                }
                res.json(response);
            });
        });

}
