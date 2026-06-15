/**
 *  assets/scripts/auth.js
 *  Central controller of authentication client-side 
 */
 
 import { api } from './api.js';
 
 /**
  *  Auth class
  */
class Auth {
    constructor() {
        this.key = '_gt_admin_user'
        this.user = null;
        this.init()
    }
    
    /** boot and initialize local user */
    async init(){
        try {
            if (this.user) return;
            let user = JSON.parse(localStorage.getItem(this.key));
            this.user = user;
        } catch (error) {
            this.redirectToLogin();
        }
    }
    
    /** login with email and password */
    async login(payload = {email: null, password: null}){
        const data = await api.auth.login(payload);
        this.user = data.user;
        return data;
    }
    
    /** logout and clear current authenticated user info */
    async logout(){
        await api.auth.logout().catch((e)=>{ /*ignore */});
        this.clearUser()
        this.redirectToLogin()
    }
    
    /** check if currently authenticated user exist */
    isLoggedIn(){
        return Boolean(this.user);
    }
    
    /** Run a server API call to validate current session */
    async guard(){
        await api.auth.me().then((data)=>{
            this.setUser(data.user);
            return true;
        }).catch((e)=>{
            throw e;
            return false;
        });
    }
    
    /** Returns currently authenticateed user */
    getUser(){
        if (this.user) return this.user;
        return null;
    }
    
    /** Set a current authenticated user profile */
    setUser(profile){
        localStorage.setItem(this.key, JSON.stringify(profile))
        this.user = profile;
    }
    
    /** Remove current authenticated user profile */
    clearUser(){
        localStorage.removeItem(this.key);
        this.user = null;
    }
    
    /** go to login page */
    redirectToLogin(){
        if (window.location.pathname !== "/") window.location.href = "/";          
    }
}

export const auth =  new Auth()