/**
 *  Forward request to backend and return the parsed response body 
 *  @param {URL} functionPath the full backend function url including any query parameters               
 *  @param {string} method the http request method 
 *  @param {record} body optional request body object 
 *  @param {string} sessionToken optional jwt for authenticated request 
 */
 async function forwardToBackend(functionPath, method = 'POST', body = null, sessionToken = null) {
    try {
        const requestOptions = {
            method, headers: { 'Content-Type': 'application/json'}
        }
        
        if (body !== null && method !== 'GET') requestOptions['body'] = JSON.stringify(body);
        if (sessionToken !== null) requestOptions.headers['Authorization'] = `Bearer ${sessionToken}`;
        const controller = new AbortController();
        
        const timeOutId = setTimeout(()=>{
            controller.abort();
        }, 15000);
        
        requestOptions['signal'] = controller.signal;
        
        try {
            const response = await fetch(functionPath, requestOptions);
            clearTimeout(timeOutId);
            
            const responseBody = await response.json().catch(()=>{
                return {
                    success: false,
                    data: null,
                    error: { code: 'server.invalid_response', message: 'Recieved an unexpected response. Please try again.' },
                    status: 400,
                }
            })
            
            
            if (!response?.ok || !responseBody?.success){
                return {
                    success: false, data: null,
                    error: {
                        code: responseBody?.error?.code ?? 'server.unknown_error',
                        message: responseBody?.error?.message ?? 'An unknown error occured. Please try again.'
                    },
                    status: response?.status ?? 500
                }
            }
            
            return { success: true, data: responseBody.data, error: null, status: response.status ?? 200 };
            
        } catch (reqError) {
            if (reqError.name === 'AbortError') {
                return {
                    success: false,
                    data: null,
                    error: { code: 'server.timeout', message: 'Request timed out and was aborted.'},
                    status: 408,
                }
            }
            console.error('[forwardToBackend] Could not connect. Details:', reqError);
            return {
                success: false,
                data: null,
                error: { code: 'server.connection_error', message: 'Unable to connect with the backend. Please try again later.'},           
                status: 500,
            }
        }
        
    } catch (error) {
        console.error('[forwardToBackend] Could not connect. Details:', error);
        return {
            success: false,
            data: null,
            error: { code: 'server.connection_error', message: 'Unable to connect with the backend. Please try again later.'},           
            status: 500,
        }
    }
 }
 
 export default forwardToBackend;
