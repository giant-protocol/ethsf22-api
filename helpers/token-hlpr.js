'use strict';

var _ = require('lodash');
var axios = require('axios');
const oauth = require('axios-oauth-client');

const Moralis = require("moralis").default;
const {EvmChain} = require("@moralisweb3/evm-utils");
const tokenAddresses = [];
tokenAddresses.push(process.env.TOKEN_ADDRESS);
const chain = EvmChain.GOERLI;

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
                const address = args.body.walletAddress;
                await Moralis.start({
                    apiKey: process.env.MORALIS_API_KEY,
                    // ...and any other configuration
                });
                const response = await Moralis.EvmApi.nft.getWalletNFTs({
                    address,
                    tokenAddresses,
                    chain,
                });
                result.status = true;
                result.inActivePlans = response;
                result.activePlans = await ethsf.models.api.purchase.find({walletAddress: args.body.walletAddress.toLowerCase()});
                callback(null, result);
            } catch (e) {
                console.log(e);
                callback(null, []);
            }
        },

        /*Function that helps to retrieve nft tokens metadata*/
        fetchMetadata: async function (args, callback) {
            try{
                var purchase = await ethsf.models.api.purchase.findOne({transactionHash: args.transactionHash});
                if(purchase !== undefined && purchase !== null){
                    callback(null, false);
                }else{
                    const result = await axios.get(
                        'https://api.covalenthq.com/v1/'+process.env.CHAIN_ID+'/tokens/'+process.env.TOKEN_ADDRESS+'/nft_metadata/'+args.tokenId+'/?format=JSON&key='+process.env.COVALENT_API,
                        {
                            headers: {},
                        }
                    );
                    var metaData = result.data.data.items[0].nft_data[0].external_data;
                    args.metadata = metaData;
                    args.dataLimit = _.find(metaData.attributes, {trait_type:'quantity_of_data_in_GB'}).value;
                    args.validity = _.find(metaData.attributes, {trait_type:'validity_in_days'}).value;
                    args.destination = _.find(metaData.attributes, {trait_type:'destination'}).value;
                    this.activePlan(args,callback);
                }

            } catch (e) {
                console.log(e);
                callback(null, []);
            }
        },
        /*Function that helps to purchase esim and store in to purchase collections*/
        activePlan:  async function (args, callback) {

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
                         customerId:customer.data.customer.id,
                         destination:args.destination,
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
                     metadata :args.metadata
                });
                this.paymentUpdation(args);
                callback(null, true);

            } catch (e) {
                console.log(e);
                callback(null, false);
            }

        },
        /*Function that helps to manipulate payment collection*/
        paymentUpdation: async function (args) {
            try{
                var payment = await ethsf.models.api.payment.findOne({transactionHash: args.transactionHash});
                if(payment){
                    await ethsf.models.api.payment.updateOne(
                        {transactionHash: args.transactionHash},
                        {$set: {metadata: {status:2000,statusMsg:"Confirmed",updatedOn:new Date()}}});
                }else{
                    let payment = await ethsf.models.api.payment.create({
                        amount: args.amount,
                        transactionHash: args.transactionHash,
                        metadata: {status:2000,statusMsg:"Confirmed"},
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
        /*Function that helps to manipulate payment collection*/
        paymentConfirmation: async function (args, callback) {
            var response ={};
            response.status = false;
            try{
                var payment = await ethsf.models.api.payment.findOne({transactionHash: args.transactionHash,tokenId:args.tokenId});
                if(payment){
                    if(payment.metadata.status == 2000){
                        response.status = true;
                        response.purchasedEsim = await ethsf.models.api.purchase.findOne({transactionHash: args.transactionHash,tokenId:args.tokenId})
                    }
                    callback(null, response);
                }else{
                    let payment = await ethsf.models.api.payment.create({
                        amount: args.amount,
                        transactionHash: args.transactionHash,
                        metadata: {status:3000,statusMsg:"Pending Transfer"},
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
        /*Function that helps to fetch esim status*/
        verifyInstallation: async function (args, callback) {
            var response ={};
            response.status = false;
            try{
                var purchase = await ethsf.models.api.purchase.findOne({iccid: args.iccid});
                if(purchase){
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
                        { $set: {eSimStatus:eSimStatus.data.esim.status,dataUsageRemainingInBytes:result.data.dataUsageRemainingInBytes} });
                    callback(null, response);
                }else{
                    callback(null, response);
                }
            } catch (e) {
                console.log(e);
                callback(null, response);
            }
        }
    };
};


module.exports = TokenHelper;