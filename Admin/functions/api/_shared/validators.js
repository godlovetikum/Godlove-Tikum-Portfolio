export class AppError extends Error {
    constructor(code ='server.unknown_error', message='An unexpected error occurred. Please try again', status=500) {
        super(message)
        this.name = 'AppError';
        this.code = code;
        this.message = message;
        this.status = status;
    }
}


class Validators{
    constructor() {
        this.EMAIL_RE = /^[^\s@]+@[^\s@]{1,}\.[^\s@]{2,}$/;
        this.SESSION_NAME = '_gt_admin_session';
        this.COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days 
    }

        getParam(url, key, required = false) {
            const value = url.searchParams.get(key)?.trim() ?? null;
            if (required && !value) throw new AppError('validation.missing_input', `The "${key}" query param cannot be empty.`, 400)
            return value;
        }
        
        async getAction(url, allowed) {
            const action = this.getParam(url, 'action', true);
            const allowedSet = new Set(allowed);
            if (!allowedSet.has(action)) throw new AppError('validation.invalid_input', `Invalid action param! Use one of these: ${allowed.join(', ')}`, 400);
            return action;
        }
        
        async getAllParams(url){
            const obj = {};
            url.searchParams.forEach((value, key) => { obj[key] = value; });
            return obj;
        }
        
        async parseReqBody(req) {
            let body;
            try { body = await req.json(); }
            catch { throw new AppError('validation.invalid_input', 'Invalid request body. Please refresh and try again', 400) };
            return body
        }
        
        async parseCookies(req, required=true) {
            const header = req.headers.get('Cookie') ?? '';
            const entries =  Object.fromEntries(
                header.split(';').map(c => {
                    const pos = c.indexOf('=');
                    if (pos === -1) return [c.trim(), '']
                    return [c.slice(0, pos).trim(), c.slice(pos+1).trim()];
                    
                })
            );
            if (!entries[this.SESSION_NAME]){
                if (required) throw new  AppError('auth.session_expired', 'Your session has expired. Please sign in again to continue.', 401);
                return null;
            }
            return entries[this.SESSION_NAME];
        }
        
        async setCookies(token='', reset = false){
            const base = `HttpOnly; Secure; SameSite=Strict; Path=/;`;
            return reset ? `${this.SESSION_NAME}=; ${base} Max-age=0` : `${this.SESSION_NAME}=${token}; ${base} Max-age=${this.COOKIE_MAX_AGE}`;
        }
        
        makeCorsHeaders(origin, methods='OPTIONS') {
            return {
                'Access-Control-Allow-Origin':      origin,
                'Access-Control-Allow-Methods':     methods,
                'Access-Control-Allow-Headers':     'Content-Type',
                'Access-Control-Allow-Credentials': 'true',
            };
        }
        
        email(value) {
            const raw = String(value ?? '').toLowerCase().slice(0, 100);
            if (!raw) throw new  AppError('validation.missing_input', 'Missing email input. This field cannot be empty', 400);
            if (!this.EMAIL_RE.test(raw)) throw new  AppError('validation.invalid_input', 'Invalid email address. Check the format and try again.', 400);;
            return raw;
        }
        
        password(value){
            const password = String(value ?? '');
            if (!password || password.length < 8) throw new AppError('validation.invalid_input', 'Password is required and must be at least 8 characters.', 400)
            return password;
        }
}

const validate = new Validators();
export default validate;
