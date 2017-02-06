var Bot = require(require('path').join('..','..','core','bot.js'));

/**
 * Linkedin Bot
 * @class Linkedin
 * @augments Bot
 * @param {string} name
 * @param {string} folder
 * @param {Linkedin~Configuration[]} allConfigurations
 * @constructor
 */
function Linkedin(name, folder, allConfigurations){
  Bot.call(this, name, folder, allConfigurations);

  this.defaultValues.hostname = 'api.linkedin.com';
  
  this.defaultValues.httpModule = 'https';
  this.defaultValues.pathPrefix = 'v1';
  this.defaultValues.port = 443;
  this.defaultValues.scopes = 'r_basicprofile,r_emailaddress,rw_company_admin,w_share';
  
  this.defaultValues.defaultRemainingRequest = 100;
  this.defaultValues.defaultRemainingTime = 60*60*24;

  this.stateForAts = null;
}

Linkedin.prototype = new Bot();
Linkedin.prototype.constructor = Linkedin;

/**
 * Prepare and complete parameters for request
 * @param {Bot~doRequestParameters} parameters
 * @param {Bot~requestCallback|*} callback
 */
Linkedin.prototype.prepareRequest = function(parameters, callback) {
  this.addQueryAccessToken(parameters);
  this.setOutputJson(parameters);
  this.doRequest(parameters, callback);
};

/**
 * API me
 * @param {Linkedin~requestCallback} callback
 */
Linkedin.prototype.me = function(callback) {
  var params = {
    method: 'GET',
    path: 'people/~',
    output: {
      model: 'User'
    }
  };

  this.prepareRequest(params, callback);
};


/**
 * Add access token to query parameters
 * @param {Bot~doRequestParameters} parameters
 */
Linkedin.prototype.addQueryAccessToken = function(parameters) {
  if(parameters.get === undefined) {
    parameters.get = {};
  }

  parameters.get.oauth2_access_token = this.accessToken.access_token;
};

Linkedin.prototype.setOutputJson = function(parameters) {
  if(parameters.headers === undefined) {
    parameters.headers = {};
  }

  parameters.headers['x-li-format'] = 'json';
};

/**
 * Get remaining requests from result 
 * @param {Request~Response} resultFromRequest
 * @return {Number}
 */
Linkedin.prototype.getRemainingRequestsFromResult = function(resultFromRequest) {
  //todo do the rate limit by myself, servers don't send it
  return this.defaultValues.defaultRemainingRequest - 1;
};

/**
 * Get url for Access Token when you have to authorize an application
 * @param {string} scopes
 * @param {*} callback
 */
Linkedin.prototype.getAccessTokenUrl = function(scopes, callback) {
  this.stateForAts = this.generateRandom();
  var url = 'https://www.linkedin.com/oauth/v2/authorization?'
    + 'response_type=code&'
    + 'redirect_uri=' + this.currentConfiguration.redirect_uri + '&'
    + 'client_id=' + this.currentConfiguration.app_id + '&'
    + 'state=' + this.stateForAts + '&'
    + 'scope=' + this.getScopeForAccessTokenServer(scopes).replace(/,/g,'%20');

  callback(url);
};

/**
 * Extract response in data for Access Token
 * @param {Object} req request from local node server
 * @return {*} code or something from response
 */
Linkedin.prototype.extractResponseDataForAccessToken = function(req) {
  var query = require('url').parse(req.url, true).query;

  if(query.code === undefined) {
    return null;
  }

  return query.code;
};

/**
 * Request Access Token after getting code
 * @param {string} responseData
 * @param {Bot~requestAccessTokenCallback} callback
 */
Linkedin.prototype.requestAccessToken = function(responseData, callback) {
  var params = {
    hostname: 'www.linkedin.com',
    method: 'POST',
    path: 'oauth/v2/accessToken',
    pathPrefix: '',
    post: {
      grant_type: 'authorization_code',
      code: responseData,
      redirect_uri: this.currentConfiguration.redirect_uri,
      client_id: this.currentConfiguration.app_id,
      client_secret: this.currentConfiguration.app_secret
    },
    headers:{
      'x-li-format': 'json'
    }
  };

  this.request(params, function(error, result){
    if(error) {
      callback(error, null);
      return;
    }

    if(result.statusCode === 200) {
      callback(null, JSON.parse(result.data));
    }
    else {
      callback(JSON.parse(result.data), null);
    }
  });
};

/**
 * getAccessTokenFromAccessTokenData
 * @param {*} accessTokenData
 * @return {*}
 */
Linkedin.prototype.getAccessTokenFromAccessTokenData = function(accessTokenData) {
  return accessTokenData.access_token;
};

/**
 * getTypeAccessTokenFromAccessTokenData
 * @param {*} accessTokenData
 * @return {*}
 */
Linkedin.prototype.getTypeAccessTokenFromAccessTokenData = function(accessTokenData) {
  return '';
};

/**
 * getUserForNewAccessToken
 * @param {*} formatAccessToken
 * @param {Bot~getUserForNewAccessTokenCallback} callback
 */
Linkedin.prototype.getUserForNewAccessToken = function(formatAccessToken, callback) {
  var that = this;

  that.setCurrentAccessToken(formatAccessToken.access_token);
  that.verifyAccessTokenScopesBeforeCall = false;
  this.me(function(err, user){
    that.verifyAccessTokenScopesBeforeCall = true;
    if(err) {
      callback(err, null);
    }
    else {
      var username = (user !== null) ? user.getLastName() : null;
      callback(null, username);
    }
  });
};

Linkedin.prototype.generateRandom = function() {
  var rb = require('crypto').randomBytes;
  var bytes = rb(16);

  return bytes.toString('hex');
};

Linkedin.prototype.extractDataFromRequest = function(data) {
  return data;
};

module.exports = Linkedin;

/**
 * Linkedin Configuration
 * @typedef {Object} Linkedin~Configuration
 * @property {string} name
 * @property {string} consumer_key
 * @property {string} consumer_secret
 * @property {string} access_token
 * @property {string} callback_url
 * @property {string} scopes
 */
/**
 * Request callback
 * @callback Linkedin~requestCallback
 * @param {Error|string|null} error - Error
 * @param {*} data
 */
