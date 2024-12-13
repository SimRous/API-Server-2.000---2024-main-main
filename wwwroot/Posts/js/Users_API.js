class Users_API {
    static Host_URL() { return "https://private-bejewled-pasta.glitch.me"; }
    static API_URL() { return this.Host_URL() + "/accounts" };
    static TOKEN_URL() {return this.Host_URL() + "/token"}
    static initHttpState() {
        this.currentHttpError = "";
        this.currentStatus = 0;
        this.error = false;
    }
    static setHttpErrorState(xhr) {
        if (xhr.responseJSON)
            this.currentHttpError = xhr.responseJSON.error_description;
        else
            this.currentHttpError = xhr.statusText == 'error' ? "Service introuvable" : xhr.statusText;
        this.currentStatus = xhr.status;
        this.error = true;
    }
    static async HEAD() {
        Users_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.API_URL(),
                type: 'HEAD',
                contentType: 'text/plain',
                complete: data => { resolve(data.getResponseHeader('ETag')); },
                error: (xhr) => { Users_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }
    static async Get(data = "",id = null) {
        Users_API.initHttpState();
        console.log(data);
        data.Access_token = data.Access_token?data.Access_token:""
        return new Promise(resolve => {
            $.ajax({
                url: this.Host_URL() + "/api/accounts" + (id != null ? "/" + id : ""),
                headers: {
                    authorization: "Bearer " + data.Access_token,
                  },
                complete: data => { resolve({ ETag: data.getResponseHeader('ETag'), data: data.responseJSON }); },
                error: (xhr) => { Users_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }
    static async GetQuery(queryString = "") {
        Users_API.initHttpState();
        console.log(queryString);
        return new Promise(resolve => {
            $.ajax({
                url: this.API_URL() + queryString,
                complete: data => {
                    resolve({ ETag: data.getResponseHeader('ETag'), data: data.responseJSON });
                },
                error: (xhr) => {
                    Users_API.setHttpErrorState(xhr); resolve(null);
                }
            });
        });
    }
    static async Save(data, create = true) {
        Users_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: create ? this.API_URL() + "/register" : this.API_URL() + "/modify",
                headers: {
                    authorization: "Bearer " + data.Access_Token /*== null ? data.Access_Token : ''*/,
                  },
                type: create ? "POST" : "PUT",
                contentType: 'application/json',
                data: JSON.stringify(data),
                success: (data) => { resolve(data); },
                error: (xhr) => { Users_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }
    static async Delete(data,id) {
        return new Promise(resolve => {
            $.ajax({
                url: this.API_URL() + "/remove/" + id,
                type: "GET",
                headers: {
                    authorization: "Bearer " + data.Access_token,
                  },
                complete: () => {
                    Users_API.initHttpState();
                    resolve(true);
                },
                error: (xhr) => {
                    Users_API.setHttpErrorState(xhr); resolve(null);
                }
            });
        });
    }
    static async Login(data){
        Users_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.TOKEN_URL(),
                type: "POST",
                contentType: 'application/json',
                data: JSON.stringify(data),
                success: (data) => { resolve(data); },
                error: (xhr) => { Users_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }
    static async Logout(id) {
        Users_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.API_URL() + "/logout?userId=" + id,
                complete: data => {
                    resolve({ ETag: data.getResponseHeader('ETag'), data: data.responseJSON });
                },
                error: (xhr) => {
                    Users_API.setHttpErrorState(xhr); resolve(null);
                }
            });
        });
    }
    static async Block(data, id){
        return new Promise(resolve => {
            $.ajax({
                url:  this.API_URL() + "/block",
                type: "POST",
                contentType: 'application/json',
                data: JSON.stringify({Id:id}),
                success: (data) => { resolve(data); },
                error: (xhr) => { Users_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }
    static async Promote(data, id){
        return new Promise(resolve => {
            $.ajax({
                url:  this.API_URL() + "/promote/" + id,
                type: "POST",
                contentType: 'application/json',
                data: JSON.stringify(id),
                success: (data) => { resolve(data); },
                error: (xhr) => { Users_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }
}