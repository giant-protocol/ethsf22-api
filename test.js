const axios = require("axios");
const _ = require("lodash");
getData()
async function  getData(){
    const result = await axios.get(
        'https://api.covalenthq.com/v1/5/tokens/0x2ae22705c943a9a7cb29d27736df0cc8238c5a8c/nft_metadata/1/?format=JSON&key=ckey_e43502bc33414935aaf5c136272',
        {
            headers: {

            },
        }
    );
    console.log(result.data.data.items[0].nft_data[0].external_data);
    var metaData = result.data.data.items[0].nft_data[0].external_data;
    var dataLimit = _.find(metaData.attributes, {trait_type:'quantity_of_data_in_GB'}).value;
    console.log(dataLimit);
}


