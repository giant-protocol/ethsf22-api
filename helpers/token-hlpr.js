'use strict';

var _ = require('lodash');
var axios = require('axios');
const oauth = require('axios-oauth-client');
var  PushAPI = require ("@pushprotocol/restapi");
var ethers = require("ethers");
/*GiantConnect-Auth Oauth2 configuration*/
const oauthConfig = {
    url: process.env.ACCESS_TOKEN_URL,
    grant_type: process.env.GRANT_TYPE,
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
};

var TokenHelper = function (ethsf) {
    return {
        /*Function that helps to retrieve asset balance and active packs*/
        getAssets: async function (args, callback) {
            var result = {};
            result.status = false;
            result.admin = process.env.ADMIN_ADDRESS;
            try {
                const balances = await axios.get(
                    'https://api.covalenthq.com/v1/'+process.env.CHAIN_ID+'/address/'+args.body.walletAddress+'/balances_v2/?quote-currency=USD&format=JSON&nft=true&no-nft-fetch=false&key='+ process.env.COVALENT_API,
                    {
                        headers: {},
                    }
                );
                var erc1155Balances =_.filter(balances.data.data.items, {contract_address: process.env.TOKEN_ADDRESS});
                result.status = true;
                result.inActivePlans = erc1155Balances.length >0  ? erc1155Balances[0].nft_data : [];
                result.activePlans = await ethsf.models.api.purchase.find({walletAddress: args.body.walletAddress.toLowerCase()});
                callback(null, result);
            } catch (e) {
                console.log(e);
                callback(null, []);
            }
        },

        /*Function that helps to retrieve nft tokens metadata*/
        fetchMetadata: async function (args, callback) {
            try {
                var purchase = await ethsf.models.api.purchase.findOne({transactionHash: args.transactionHash});
                if (purchase !== undefined && purchase !== null) {
                    callback(null, false);
                } else {
                    const result = await axios.get(
                        'https://api.covalenthq.com/v1/' + process.env.CHAIN_ID + '/tokens/' + process.env.TOKEN_ADDRESS + '/nft_metadata/' + args.tokenId + '/?format=JSON&key=' + process.env.COVALENT_API,
                        {
                            headers: {},
                        }
                    );
                    var metaData = result.data.data.items[0].nft_data[0].external_data;
                    args.metadata = metaData;
                    args.dataLimit = _.find(metaData.attributes, {trait_type: 'quantity_of_data_in_GB'}).value;
                    args.validity = _.find(metaData.attributes, {trait_type: 'validity_in_days'}).value;
                    args.destination = _.find(metaData.attributes, {trait_type: 'destination'}).value;
                    this.activatePlan(args, callback);
                }
            } catch (e) {
                console.log(e);
                callback(null, []);
            }
        },
        /* Activate plan by purchasing esim QR and store in the purchase collections */
        activatePlan: async function (args, callback) {
            try {
                const getClientCredentials = oauth.client(axios.create(), oauthConfig);
                const auth = await getClientCredentials();
                const customer = await axios.post(
                    process.env.GC_BASEURL + "/customers",
                    {walletAddress: args.from},
                    {
                        headers: {
                            Authorization: "Bearer " + auth.access_token,
                            "Content-Type": "application/json",
                        },
                    }
                );
                const startTime = Math.floor((new Date().getTime()) / 1000);
                const endDate = new Date()
                endDate.setDate(endDate.getDate() + Number(args.validity));
                const endTime = Math.floor(endDate.getTime() / 1000.0);
                const purchase = await axios.post(
                    process.env.GC_BASEURL + "/purchases",
                    {
                        customerId: customer.data.customer.id,
                        destination: args.destination,
                        dataLimitInGB: args.dataLimit,
                        startTime: startTime,
                        endTime: endTime,
                    },
                    {
                        headers: {
                            Authorization: "Bearer " + auth.access_token,
                            "Content-Type": "application/json",
                        },
                    }
                );
                let activatePlan = await ethsf.models.api.purchase.create({
                    customerId: customer.data.customer.id,
                    destination: args.destination,
                    isActive: true,
                    transactionHash: args.transactionHash,
                    startTime: startTime,
                    endTime: endTime,
                    purchaseId: purchase.data.purchase.id,
                    iccid: purchase.data.profile.iccid,
                    activationCode: purchase.data.profile.activationCode,
                    dataUsageRemainingInBytes: args.dataLimit * process.env.CONVERSION_FACTOR,
                    walletAddress: args.from.toLowerCase(),
                    external_data: args.metadata
                });
                args.title = args.dataLimit +' GB eSIM Plan activated';
                args.message = 'Enjoy ' +args.dataLimit+ ' GB LTE internet for ' +args.validity+ ' days. Check usage status on the <a href ='+process.env.DAPP_URL+'>app</a> ';
                this.sendNotification(args);
                this.updatePayment(args);
                callback(null, true);

            } catch (e) {
                console.log(e);
                callback(null, false);
            }
        },
        /* Update payment metadata on successful eSIM NFT transfer confirmation */
        updatePayment: async function (args) {
            try {
                var payment = await ethsf.models.api.payment.findOne({transactionHash: args.transactionHash});
                if (payment) {
                    await ethsf.models.api.payment.updateOne(
                        {transactionHash: args.transactionHash},
                        {$set: {metadata: {status: 2000, statusMsg: "Confirmed", updatedOn: new Date()}}});
                } else {
                    let payment = await ethsf.models.api.payment.create({
                        amount: args.amount,
                        transactionHash: args.transactionHash,
                        metadata: {status: 2000, statusMsg: "Confirmed"},
                        tokenId: args.tokenId,
                        walletAddress: args.from,
                    });
                }
                return true;
            } catch (e) {
                console.log(e);
                return false;
            }
        },
        /* Update payment record once transfer of eSIM NFT complete and return eSIM QR */
        validatePurchase: async function (args, callback) {
            var response = {};
            response.status = false;
            try {
                var payment = await ethsf.models.api.payment.findOne({
                    transactionHash: args.transactionHash,
                    tokenId: args.tokenId
                });
                if (payment) {
                    if (payment.metadata.status == 2000) {
                        response.status = true;
                        response.purchasedEsim = await ethsf.models.api.purchase.findOne({
                            transactionHash: args.transactionHash,
                            tokenId: args.tokenId
                        })
                    }
                    callback(null, response);
                } else {
                    // for UI to show that the transfer is still pending
                    let payment = await ethsf.models.api.payment.create({
                        amount: args.amount,
                        transactionHash: args.transactionHash,
                        metadata: {status: 3000, statusMsg: "Pending Transfer"},
                        tokenId: args.tokenId,
                        walletAddress: args.from,
                    });
                    response.payment = payment;
                    callback(null, response);
                }
            } catch (e) {
                console.log(e);
                callback(null, response);
            }
        },
        /* Fetch esim status*/
        verifyInstallation: async function (args, callback) {
            var response = {};
            response.status = false;
            try {
                var purchase = await ethsf.models.api.purchase.findOne({iccid: args.iccid});
                if (purchase) {
                    //get Oauth2 access token
                    const getClientCredentials = oauth.client(axios.create(), oauthConfig);
                    const auth = await getClientCredentials();

                    const eSimStatus = await axios.get(
                        process.env.GC_BASEURL + "/esim/status/" + args.iccid,
                        {
                            headers: {
                                Authorization: "Bearer " + auth.access_token,
                                "Content-Type": "application/json",
                            },
                        }
                    );
                    response.data = eSimStatus.data.esim;
                    response.status = true;
                    const result = await axios.get(
                        process.env.GC_BASEURL + "/purchases/" + purchase.purchaseId + "/consumption",
                        {
                            headers: {
                                Authorization: "Bearer " + auth.access_token,
                                "Content-Type": "application/json",
                            },
                        }
                    );
                    await ethsf.models.api.purchase.updateOne(
                        {iccid: args.iccid},
                        {
                            $set: {
                                eSimStatus: eSimStatus.data.esim.status,
                                dataUsageRemainingInBytes: result.data.dataUsageRemainingInBytes
                            }
                        });
                    callback(null, response);
                } else {
                    callback(null, response);
                }
            } catch (e) {
                console.log(e);
                callback(null, response);
            }
        },
        /* Fetch send notification*/
        sendNotification: async function (args) {
            const PK = process.env.PUSH_CHANNEL_SECRET_KEY; // channel private key
            const Pkey = `0x${PK}`;
            const signer = new ethers.Wallet(Pkey);
            try {
                const apiResponse = await PushAPI.payloads.sendNotification({
                    signer,
                    type: 3, // target
                    identityType: 2, // direct payload
                    notification: {
                        title: `Giant Protocol`,
                        body: `Giant Protocol`
                    },
                    payload: {
                        title: args.title,
                        body: args.message,
                        cta: process.env.DAPP_URL,
                    },
                    recipients: 'eip155:5:'+args.from, // recipient address
                    channel: 'eip155:5:'+process.env.PUSH_CHANNEL_ADDRESS, // your channel address
                    env: 'staging'
                });

                // apiResponse?.status === 204, if sent successfully!
                console.log('API repsonse: ', apiResponse);
            } catch (err) {
                console.error('Error: ', err);
            }
        }
    };
};

module.exports = TokenHelper;
