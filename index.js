/**
 * Created by denman on 2/3/2016.
 */
/**
 * Created by denman on 2/3/2016.
 */



var Redis = require('ioredis');
var ijson = require('idempotent-json');

function Rate(conf){

    this.client = new Redis(conf.redis);


}



Rate.prototype.rateLimit = function rateLimit(opts){

    var self = this;

    return function(req,res,next){

        var key = req.ip;

        if(!key){
            next();
        }
        else{

            var now = Date.now();

            self.client.get(key, function(err,result){

                if(err){
                    next(err);
                }
                else if(result){

                    result = ijson.parse(result);

                    result.push(now);

                    self.client.set(key, result);

                }
                else{

                }

            });
        }

    }


};







module.exports = Rate;