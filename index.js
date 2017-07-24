var request = require('request-promise');
var querystring = require("querystring");
var VERSION = "1.1"

module.exports = function (api_key, api_url) {
    return new Authy(api_key, api_url);
};

function Authy(apiKey, api_url) {
    this.apiKey = apiKey;
    this.apiURL = api_url || "https://api.authy.com";
}

Authy.prototype.register_user = function (email, cellphone, country_code, send_sms_install_link) {
    var country = "1";
    var send_install_link = true;
    if(country_code) country = country_code;
    if(send_sms_install_link) send_install_link = send_sms_install_link;

    return this._request("post", "/protected/json/users/new", {
            "user[email]": email,
            "user[cellphone]": cellphone,
            "user[country_code]": country
        },
        {
          send_install_link_via_sms: send_install_link
        }
    );
};

Authy.prototype.delete_user = function (id) {
    this._request("post", "/protected/json/users/delete/" + querystring.escape(id), {});
};

Authy.prototype.user_status = function (id) {
    this._request("get", "/protected/json/users/" + querystring.escape(id) + "/status", {});
};

Authy.prototype.verify = function (id, token, force) {
    var qs = {};
    if(force) qs.force = force;

    cleanToken = String(token).replace(/\D/g, "").substring(0, 16)

    if (cleanToken === '' || cleanToken == null) {
        return (new Error("argument 'token' cannot be empty, null, or undefined"));
    }

    // Overwrite the default body to check the response.
    check_body_callback = function(err, res) {
        if(!err && res.token != "is valid") {
            err = {
                message: "Unknown API response."
            }
            res = null
        }
        return(err, res)
    }
    this._request("get", "/protected/json/verify/" + querystring.escape(cleanToken) + "/" + querystring.escape(id), {}, check_body_callback, qs);
};

Authy.prototype.request_sms = function (id, force) {
    var qs = {};
    if(force) qs.force = force;

    this._request("get", "/protected/json/sms/" + querystring.escape(id), {}, qs);
};

Authy.prototype.request_call = function (id, force) {
    var qs = {};
    if(force) qs.force = force;

    this._request("get", "/protected/json/call/" + querystring.escape(id), {}, qs);
};

Authy.prototype.phones = function() {
    self = this;
    console.log('phone');
    return {
        verification_start: function(phone_number, country_code, params) {

            options = Object.assign({},
                {
                    phone_number: phone_number,
                    country_code: country_code,
                    via: "sms",
                    locale: params.locale,
                    custom_message: params.custom_message
                },
                params
            );

            return self._request("post", "/protected/json/phones/verification/start", options);
        },

        verification_check: function(phone_number, country_code, verification_code) {
            options = {
                phone_number: phone_number,
                country_code: country_code,
                verification_code: verification_code
            };
            return self._request("get", "/protected/json/phones/verification/check", options);
        },

        info: function(phone_number, country_code) {
            options = {
                phone_number: phone_number,
                country_code: country_code
            };
            return self._request("get", "/protected/json/phones/info", options);
        }
    };
};

Authy.prototype.check_approval_status= function (uuid){
    var url="/onetouch/json/approval_requests/"+uuid;
    this._request("get", url, {});
};

Authy.prototype.send_approval_request= function (id,user_payload,hidden_details,logos){
    var url="/onetouch/json/users/"+querystring.escape(id)+"/approval_requests";

    var message_parameters = {
        "message": user_payload.message,
        "details": user_payload.details || {},
        "hidden_details": hidden_details || {}
    };

    // only add logos if provided
    if(logos){
        message_parameters['logos'] = logos;
    }

    // only add expiration time if provided
    if(user_payload.seconds_to_expire){
        message_parameters['seconds_to_expire'] = user_payload.seconds_to_expire;
    }

    this._request("post", "/onetouch/json/users/"+querystring.escape(id)+"/approval_requests", message_parameters);

};

Authy.prototype._request = function(type, path, params, qs) {
    let response;
    qs = qs || {}
    qs['api_key'] = this.apiKey;

    user_agent = "AuthyNode/"+VERSION+" (node "+process.version+")"
    headers = {
        "User-Agent": user_agent
    }

    options = {
        url: this.apiURL + path,
        form: params,
        headers: headers,
        qs: qs,
        json: true,
        jar: false,
        strictSSL: true
    }

    switch(type) {

        case "post":
            response = request.post(options);
            break;

        case "get":
            response = request.get(options);
            break;
    }

    return response;
};
