const check = require("./checkLib.js");
const redis = require('redis');
// mention your port no., host(db path) and password
let client = redis.createClient();
/*let client = redis.createClient({
    port: 19726,
    host: 'redis-19726.c15.us-east-1-2.ec2.cloud.redislabs.com',
    password: 'UObA9JUILwcAWVYIJqp61EylSsFG1wDS'
});*/

client.on('connect', () => {

    console.log("Redis connection successfully opened");

});

let getFollowersAndIssueListHash = (hashName, callback) => {

    client.HGETALL(hashName, (err, result) => {


        if (err) {

            // console.log(err);
            callback(err, null)

        } else if (check.isEmpty(result)) {

            // console.log("online user list is empty");
            // console.log(result)

            callback(null, {})

        } else {

            // console.log(result);
            callback(null, result)

        }
    });


}// end get all users in a hash


// function to set new online user.
let setFollowersAndIssueListHash = (hashName, key, value, callback) => {

    client.HMSET(hashName, [key, value], (err, result) => {
        if (err) {
            // console.log(err);
            callback(err, null)
        } else {

            // console.log("user has been set in the hash map");
            // console.log(result)
            callback(null, result)
        }
    });


}// end set a new online user in hash

let deleteFromHash = (hashName, key) => {

    client.HDEL(hashName, key);
    return true;

}// end delete user from hash

module.exports = {
    getFollowersAndIssueListHash: getFollowersAndIssueListHash,
    setFollowersAndIssueListHash: setFollowersAndIssueListHash,
    deleteFromHash: deleteFromHash
}