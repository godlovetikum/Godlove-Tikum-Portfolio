
/**
 *  functions/api/_shared/response.js
 *  This file handles everything relating to response.
 *  All pages functions must import and use these methods.
 */

import validate  from './validators.js';

class Responder {
    
    /**
     * Initialize a response helper 
     * @param {string} origin Allowed request origin from env
     * @param {string} methods Allowed list of http request methods 
     */
    constructor(origin, methods){
        this.headers = validate.makeCorsHeaders(origin, methods)
    }
    
    /**
     * Returns a valid response if operation is completely successful 
     * @param {record} data An object of the payload used by the client side 
     * @param {number} status Optional http response status code 
     * @param {string} cookieHeader An optional session Cookie header for authentication 
     */
    success(data = {}, status =200, cookieHeader = null){
        const headers = new  Headers({...this.headers, 'Content-Type': 'application/json' });
        if (cookieHeader !== null) headers.append('Set-Cookie', cookieHeader);
        return new Response(
            JSON.stringify({ success: true, data, error: null }),
            { status, headers }             
        )
    }
    
    
    /**
     * Returns a non-ok response 
     * @param {record: {code: string, message: string}} error Static text used for branching logic on client side 
     * @param {string} message A plain English explanation of what went wrong
     * @param {number} status Optional response status code 
     */
    error(error = { code: 'server.unexpected_error', message: 'An unexpected error occurred. Please try again.'}, status=500){            
        return new Response(
            JSON.stringify({ success: false, data: null, error }),
            { status, headers: {...this.headers, 'Content-Type': 'application/json' } }             
        );
    }
    
    /**
     * Returns a preflight (options) response with 204 status and allowed methods 
     * @returns {Response} Http response 
     */
    preflight(){
        return new Response(null, { status: 204, headers: this.headers })
    }
}

export default Responder;
