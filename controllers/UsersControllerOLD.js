import UserModel from '../models/user.js';
import Repository from '../models/repository.js';
import Controller from './Controller.js';

export default class UsersController extends Controller {
    constructor(HttpContext) {
        super(HttpContext, new Repository(new UserModel()));
        this.params = HttpContext.path.params;
    }
    error(message, errorParam = "") {
        let errorResponse = {};
        errorResponse["error"] = message;
        errorResponse[errorParam] = this.params[errorParam];
        this.HttpContext.response.JSON(errorResponse);
        return false;
    }
    checkIfRegistration(){
        return (this.params["Email"] != null && this.params["Password"] != null);
    }
    checkIfEmail(){
        return (this.params["Email"] != null);
    }
    checkEmail(){
        let user = this.repository.getAll(JSON.parse('{"Email":' + '"' +this.params["Email"] +'"}') );
        return user.length > 0;
    }
    get(){
        if (this.params != null){
            if (this.checkIfRegistration()){
                if (this.checkEmail()){
                    let user = this.repository.getAll(this.params,true);
                    if (user.length != 0){
                        user = this.repository.getAll((JSON.parse('{"Email":' + '"' +this.params["Email"] +'"}') ));
                        this.HttpContext.response.JSON(user);
                    }
                    else
                        return this.error("Mot de passe incorrecte","Password");
                }
                else
                    return this.error("Courriel introuvable","Email");
            }
            else if (this.checkIfEmail()){
                if (this.checkEmail())
                    return this.error("Courriel existant","Email");
            }

            
        }
        else{
            super.get('');
        }
    }
}