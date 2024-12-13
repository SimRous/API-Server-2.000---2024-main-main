import LikeModel from '../models/like.js';
import Repository from '../models/repository.js';
import AccountsController from './AccountsController.js';
import Controller from './Controller.js';

export default class LikeModelsController extends Controller {
    constructor(HttpContext) {
        super(HttpContext, new Repository(new LikeModel()));
        this.params = HttpContext.path.params;
    }
    getnames(user){
        let newController = new AccountsController();
        let param = {}
        param.Id = user;
        let answer = newController.repository.getAll(param);
        this.HttpContext.response.JSON(answer[0]);
    }
    /*get(){
        if (this.params["PostId"] != null){
            let post = {};
            post.PostId = this.params["PostId"];
            let answer = this.repository.getAll(post,false);
            this.HttpContext.response.JSON(answer);
        }
        else{
            super.get();
        }
        
    }*/
}