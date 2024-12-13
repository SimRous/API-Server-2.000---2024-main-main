////// Author: Nicolas Chourot
////// 2024
//////////////////////////////

const periodicRefreshPeriod = 2;
const waitingGifTrigger = 2000;
const minKeywordLenth = 3;
const keywordsOnchangeDelay = 500;

let categories = [];
let selectedCategory = "";
let currentETag = "";
let currentLikeEtag = "";
let currentLikeCount = -1;
let currentPostsCount = -1;
let periodic_Refresh_paused = false;
let postsPanel;
let itemLayout;
let waiting = null;
let showKeywords = false;
let keywordsOnchangeTimger = null;


let loggedUser = null;
let pendingUser = {};
Init_UI();
async function Init_UI() {
    loggedUser = getSessionData();
    postsPanel = new PageManager('postsScrollPanel', 'postsPanel', 'postSample', renderPosts);
    initTimeout(10,showConnexionForm);
    if (!loggedUser)
        showConnexionForm();
    else{
        showPosts();
    }
        
    $('#createPost').on("click", async function () {
        showCreatePostForm();
    });
    $('#abort').on("click", async function () {
        showPosts();
    });
    $('#aboutCmd').on("click", function () {
        showAbout();
    });
    $("#showSearch").on('click', function () {
        toogleShowKeywords();
        showPosts();
    });

    installKeywordsOnkeyupEvent();
    start_Periodic_Refresh();
}
/////////////////////////// Session Management //////////////////////////////////////////////////////////
function createSession(user) {
    console.log("CREATING NEW SESSION");
  sessionStorage.setItem("user", JSON.stringify(user));
  } 
function dropSession(){
    console.log("DROPPING SESSION");
    sessionStorage.setItem("user", null);
}
  function getSessionData() {
    return JSON.parse(sessionStorage.getItem("user"));
  }

  

/////////////////////////// Search keywords UI //////////////////////////////////////////////////////////

function installKeywordsOnkeyupEvent() {

    $("#searchKeys").on('keyup', function () {
        clearTimeout(keywordsOnchangeTimger);
        keywordsOnchangeTimger = setTimeout(() => {
            cleanSearchKeywords();
            showPosts(true);
        }, keywordsOnchangeDelay);
    });
    $("#searchKeys").on('search', function () {
        showPosts(true);
    });
}
function cleanSearchKeywords() {
    /* Keep only keywords of 3 characters or more */
    let keywords = $("#searchKeys").val().trim().split(' ');
    let cleanedKeywords = "";
    keywords.forEach(keyword => {
        if (keyword.length >= minKeywordLenth) cleanedKeywords += keyword + " ";
    });
    $("#searchKeys").val(cleanedKeywords.trim());
}
function showSearchIcon() {
    $("#hiddenIcon").hide();
    $("#showSearch").show();
    if (showKeywords) {
        $("#searchKeys").show();
    }
    else
        $("#searchKeys").hide();
}
function hideSearchIcon() {
    $("#hiddenIcon").show();
    $("#showSearch").hide();
    $("#searchKeys").hide();
}
function toogleShowKeywords() {
    showKeywords = !showKeywords;
    if (showKeywords) { 
        $("#searchKeys").show(); 
        $("#searchKeys").focus();
    }
    else {
        $("#searchKeys").hide();
        showPosts(true);
    }
}

/////////////////////////// Views management ////////////////////////////////////////////////////////////

function intialView() {
    $("#hiddenIcon").hide();
    $("#hiddenIcon2").hide();
    $('#menu').show();
    $('#commit').hide();
    $('#abort').hide();
    $('#form').hide();
    $('#form').empty();
    $('#aboutContainer').hide();
    $('#errorContainer').hide();
    showSearchIcon();
}
async function showPosts(reset = false) {
    intialView();
    timeout(60)
    if (loggedUser){
        console.log(loggedUser)
        console.log()
        if (loggedUser.User.Authorizations.readAccess < 2){
            $("#createPost").hide();
        }
        else{
            $("#createPost").show();
        }
    }
    
    $("#viewTitle").text("Fil de nouvelles");
    periodic_Refresh_paused = false;
    await postsPanel.show(reset);
}
function hidePosts() {
    postsPanel.hide();
    hideSearchIcon();
    $("#createPost").hide();
    $('#menu').hide();
    periodic_Refresh_paused = true;
}
function showForm() {
    hidePosts();
    $('#form').show();
    $('#commit').show();
    $('#abort').show();
}
function showError(message, details = "") {
    hidePosts();
    $('#form').hide();
    $('#form').empty();
    $("#hiddenIcon").show();
    $("#hiddenIcon2").show();
    $('#commit').hide();
    $('#abort').show();
    $("#viewTitle").text("Erreur du serveur...");
    $("#errorContainer").show();
    $("#errorContainer").empty();
    $("#errorContainer").append($(`<div>${message}</div>`));
    $("#errorContainer").append($(`<div>${details}</div>`));
}

function showCreatePostForm() {
    showForm();
    $("#viewTitle").text("Ajout de nouvelle");
    renderPostForm();

}
function showEditPostForm(id) {
    showForm();
    $("#viewTitle").text("Modification");
    renderEditPostForm(id);
}
function showDeletePostForm(id) {
    showForm();
    $("#viewTitle").text("Retrait");
    renderDeletePostForm(id);
}
function showAbout() {
    hidePosts();
    $("#hiddenIcon").show();
    $("#hiddenIcon2").show();
    $('#abort').show();
    $("#viewTitle").text("À propos...");
    $("#aboutContainer").show();
}
function showConnexionForm(){
    noTimeout();
    dropSession();
    loggedUser = null;
    hidePosts();
    $('#commit').hide();
    $('#abort').hide();
    $("#viewTitle").text("Connection");
    renderConnexionForm();
}
function showEmailConfirmationForm(){
    noTimeout();
    hidePosts();
    $('#commit').hide();
    $('#abort').hide();
    $("#viewTitle").text("Confirmation de Courriel");
    renderEmailConfirmationForm();
}
function showUserDeletionForm(id = null){
    hidePosts();
    $('#form').empty();
    $('#abort').show();
    $("#viewTitle").text("Effacement de compte");
    renderDeleteUserForm(id);

}
function showCreateUserForm(){
    showForm();
    $('#commit').hide();
    $("#viewTitle").text("Inscription");
    renderUserForm();
}
function showChangeUserForm(){
    showForm();
    $('#commit').hide();
    $("#viewTitle").text("Inscription");
    renderUserForm(loggedUser.User);
}
function showGestionUserForm(){
    showForm();
    $('#commit').hide();
    $("#viewTitle").text("Inscription");
    renderGestionUserForm();
}
function showGestionUserForm(){
    showForm();
    $('#commit').hide();
    $("#viewTitle").text("Inscription");
    renderGestionUserForm();
}
function showBlockForm(user = null){
    hidePosts();
    $('#form').empty();
    $('#abort').show();
    $("#viewTitle").text("Effacement de compte");
    renderBlockForm(user);
}

//////////////////////////// Posts rendering /////////////////////////////////////////////////////////////

function start_Periodic_Refresh() {
    
    $("#reloadPosts").addClass('white');
    $("#reloadPosts").on('click', async function () {
        $("#reloadPosts").addClass('white');
        postsPanel.resetScrollPosition();
        await showPosts();
    })
    setInterval(async () => {
        
        if (!periodic_Refresh_paused) {
            let etag = await Posts_API.HEAD();
            // the etag contain the number of model records in the following form
            // xxx-etag
            let postsCount = parseInt(etag.split("-")[0]);
            if (currentETag != etag) {           
                if (postsCount != currentPostsCount) {
                    console.log("postsCount", postsCount)
                    currentPostsCount = postsCount;
                    $("#reloadPosts").removeClass('white');
                } else
                    await showPosts();
                currentETag = etag;
            }

            etag = await Likes_API.HEAD();
            
            let likeCount = parseInt(etag.split("-")[0]);
            console.log(currentLikeCount)
            if (currentLikeEtag != etag) {           
                if (likeCount != currentLikeCount) {
                    currentLikeCount = likeCount;
                    await showPosts();
                    console.log("REFRESH MF");
                } else{
                }
                    
                    currentLikeEtag = etag;
            }

        }
    },
        periodicRefreshPeriod * 1000);
}
async function renderPosts(queryString) {

    let endOfData = false;
    
    let alllikedPost = await Likes_API.GetQuery("?fields=PostId");

    let allLikes = [{}];
    if (!Likes_API.error)
        alllikedPost = alllikedPost.data;
    let users = [];
    let postLikes;
    for (let i = 0;i < alllikedPost.length;i++){
        postLikes = await Likes_API.GetQuery("?PostId=" + alllikedPost[i].PostId);
        users = [];
        allLikes.push({})
        allLikes[i].nbOfLikes = postLikes.data.length;
        allLikes[i].post = alllikedPost[i].PostId
        for (let j = 0;j < postLikes.data.length ;j++){
            let username = await Likes_API.GetNames(postLikes.data[j].UserId);
            if (username)
                users.push(username.data.Name)
        }
        allLikes[i].user = users;
    }
    queryString += "&sort=date,desc";
    compileCategories();
    if (selectedCategory != "") queryString += "&category=" + selectedCategory;
    if (showKeywords) {
        let keys = $("#searchKeys").val().replace(/[ ]/g, ',');
        if (keys !== "")
            queryString += "&keywords=" + $("#searchKeys").val().replace(/[ ]/g, ',')
    }
    addWaitingGif();
    let response = await Posts_API.Get(queryString);
    if (!Posts_API.error) {
        currentETag = response.ETag;
        currentPostsCount = parseInt(currentETag.split("-")[0]);
        let Posts = response.data;
        if (Posts.length > 0) {
            Posts.forEach(Post => {
                let likes = 0;
                let users = []
                for (let i = 0;i < allLikes.length;i++){
                    if (Post.Id == allLikes[i].post){
                        likes = allLikes[i].nbOfLikes;
                        users = allLikes[i].user;
                    }
                        
                }
                postsPanel.append(renderPost(Post, loggedUser,likes,users));
            });
        } else
            endOfData = true;
        linefeeds_to_Html_br(".postText");
        highlightKeywords();
        attach_Posts_UI_Events_Callback();
    } else {
        showError(Posts_API.currentHttpError);
    }
    removeWaitingGif();
    return endOfData;
}
function renderPost(post, loggedUser, nbOfLikes = 0, usersLike = []) {
    let date = convertToFrenchDate(UTC_To_Local(post.Date));
    let crudIcon = "";
    if (loggedUser){
        if (loggedUser.User.Authorizations.readAccess == 3){
            crudIcon +=
                `
                <span class="editCmd cmdIconSmall fa fa-pencil" postId="${post.Id}" title="Modifier nouvelle"></span>
                <span class="deleteCmd cmdIconSmall fa fa-trash" postId="${post.Id}" title="Effacer nouvelle"></span>
                `
            }
            if (loggedUser){
                crudIcon += `
                <div class="likeContainer">
                <p class="numberOfLikes">${nbOfLikes}</p>
                <span class="likeCmd cmdIconSmall fa-regular fa-thumbs-up" postId="${post.Id}" title="${usersLike}">
                </div>
                `
            }
    }

    return $(`
        <div class="post" id="${post.Id}">
            <div class="postHeader">
                ${post.Category}
                ${crudIcon}
            </div>
            <div class="postTitle"> ${post.Title} </div>
            <img class="postImage" src='${post.Image}'/>
            <div class="postDate"> ${date} </div>
            <div postId="${post.Id}" class="postTextContainer hideExtra">
                <div class="postText" >${post.Text}</div>
            </div>
            <div class="postfooter">
                <span postId="${post.Id}" class="moreText cmdIconXSmall fa fa-angle-double-down" title="Afficher la suite"></span>
                <span postId="${post.Id}" class="lessText cmdIconXSmall fa fa-angle-double-up" title="Réduire..."></span>
            </div>         
        </div>
    `);
}
async function compileCategories() {
    categories = [];
    let response = await Posts_API.GetQuery("?fields=category&sort=category");
    if (!Posts_API.error) {
        let items = response.data;
        if (items != null) {
            items.forEach(item => {
                if (!categories.includes(item.Category))
                    categories.push(item.Category);
            })
            if (!categories.includes(selectedCategory))
                selectedCategory = "";
            updateDropDownMenu(categories);
        }
    }
}
function connexionDropDownMenu(){
    if (loggedUser){
        if(loggedUser.User.Authorizations.readAccess == 3){
            return $(`
                <div class="dropdown-item avatarContainer" id="changeProfileAvatar">
                    <div class="avatar" style="background-image:url('${loggedUser.User.Avatar}')"></div>
                    <div class="name">${loggedUser.User.Name}</div>
                </div>
                <div class="dropdown-divider"></div>
                <div class="dropdown-item menuItemLayout" id="GestionUser"> 
                        <i class="menuIcon fa-solid fa-user-pen mx-2"></i> Gestion des usagers
                    </div>
                    <div class="dropdown-divider"></div>
                <div class="dropdown-item menuItemLayout" id="changeProfileMenu"> 
                    <i class="menuIcon fa-solid fa-user-pen mx-2"></i> Modifier votre profil
                </div>
                <div class="dropdown-item menuItemLayout" id="deconnexionMenu">
                    <i class="menuIcon fa-solid fa-power-off mx-2"></i> Déconnection
                </div>
            `);
        }
        else{
            return $(`
                <div class="dropdown-item avatarContainer" id="changeProfileAvatar">
                    <div class="avatar" style="background-image:url('${loggedUser.User.Avatar}')"></div>
                    <div class="name">${loggedUser.User.Name}</div>
                </div>
                <div class="dropdown-divider"></div>
                <div class="dropdown-item menuItemLayout" id="changeProfileMenu"> 
                    <i class="menuIcon fa-solid fa-user-pen mx-2"></i> Modifier votre profil
                </div>
                <div class="dropdown-item menuItemLayout" id="deconnexionMenu">
                    <i class="menuIcon fa-solid fa-power-off mx-2"></i> Déconnection
                </div>
            `);
        }       
    }
    else{
        return $(`
                <div class="dropdown-item menuItemLayout" id="connexionMenu">
                    <i class="menuIcon fa-solid fa-right-to-bracket mx-2"></i> Connection
                </div>
            `);
    }
}

function updateDropDownMenu() {
    let DDMenu = $("#DDMenu");
    let selectClass = selectedCategory === "" ? "fa-check" : "fa-fw";
    DDMenu.empty();
    DDMenu.append(connexionDropDownMenu());
    DDMenu.append($(`<div class="dropdown-divider"></div>`));
    DDMenu.append($(`
        <div class="dropdown-item menuItemLayout" id="allCatCmd">
            <i class="menuIcon fa ${selectClass} mx-2"></i> Toutes les catégories
        </div>
        `));
    DDMenu.append($(`<div class="dropdown-divider"></div>`));
    categories.forEach(category => {
        selectClass = selectedCategory === category ? "fa-check" : "fa-fw";
        DDMenu.append($(`
            <div class="dropdown-item menuItemLayout category" id="allCatCmd">
                <i class="menuIcon fa ${selectClass} mx-2"></i> ${category}
            </div>
        `));
    })
    DDMenu.append($(`<div class="dropdown-divider"></div> `));
    DDMenu.append($(`
        <div class="dropdown-item menuItemLayout" id="aboutCmd">
            <i class="menuIcon fa fa-info-circle mx-2"></i> À propos...
        </div>
        `));
    $('#aboutCmd').on("click", function () {
        showAbout();
    });
    $('#allCatCmd').on("click", async function () {
        selectedCategory = "";
        await showPosts(true);
        updateDropDownMenu();
    });


    $('#connexionMenu').on("click", function () {
        showConnexionForm();
    });
    $('#deconnexionMenu').on("click",async function () {
        await Users_API.Logout(loggedUser.User.Id);
        dropSession();
        showConnexionForm();
    });
    $('#changeProfileMenu').on("click", function () {
        showChangeUserForm();
    });
    $('#GestionUser').on("click", function () {
        showGestionUserForm();
    });
    $('#changeProfileAvatar').on("click", function () {
        showChangeUserForm();
    });

    $('.category').on("click", async function () {
        selectedCategory = $(this).text().trim();
        await showPosts(true);
        updateDropDownMenu();
    });
}
function attach_Posts_UI_Events_Callback() {

    linefeeds_to_Html_br(".postText");
    // attach icon command click event callback
    $(".editCmd").off();
    $(".editCmd").on("click", function () {
        showEditPostForm($(this).attr("postId"));
    });
    $(".deleteCmd").off();
    $(".deleteCmd").on("click", function () {
        showDeletePostForm($(this).attr("postId"));
    });
    $(".likeCmd").off();
    $(".likeCmd").on("click",async function () {
        let post = $(this).attr("postId");
        let user = loggedUser.User.Id;
        let data = {PostId:post,UserId:user}
        let likes = 0;
        likes = await Likes_API.GetQuery("?UserId=" + data.UserId + "&PostId=" + data.PostId);
        if (!Likes_API.error){
            console.log(likes);
            let isLiked = likes.data.length > 0;
            if (isLiked){
                await Likes_API.Delete(likes.data[0].Id);
            }
            else{
                await Likes_API.Save(data,true);
            }
        }
        postsPanel.update(false);
    });
    $(".moreText").off();
    $(".moreText").click(function () {
        $(`.commentsPanel[postId=${$(this).attr("postId")}]`).show();
        $(`.lessText[postId=${$(this).attr("postId")}]`).show();
        $(this).hide();
        $(`.postTextContainer[postId=${$(this).attr("postId")}]`).addClass('showExtra');
        $(`.postTextContainer[postId=${$(this).attr("postId")}]`).removeClass('hideExtra');
    })
    $(".lessText").off();
    $(".lessText").click(function () {
        $(`.commentsPanel[postId=${$(this).attr("postId")}]`).hide();
        $(`.moreText[postId=${$(this).attr("postId")}]`).show();
        $(this).hide();
        postsPanel.scrollToElem($(this).attr("postId"));
        $(`.postTextContainer[postId=${$(this).attr("postId")}]`).addClass('hideExtra');
        $(`.postTextContainer[postId=${$(this).attr("postId")}]`).removeClass('showExtra');
    })
}
function addWaitingGif() {
    clearTimeout(waiting);
    waiting = setTimeout(() => {
        postsPanel.itemsPanel.append($("<div id='waitingGif' class='waitingGifcontainer'><img class='waitingGif' src='Loading_icon.gif' /></div>'"));
    }, waitingGifTrigger)
}
function removeWaitingGif() {
    clearTimeout(waiting);
    $("#waitingGif").remove();
}

/////////////////////// Posts content manipulation ///////////////////////////////////////////////////////

function linefeeds_to_Html_br(selector) {
    $.each($(selector), function () {
        let postText = $(this);
        var str = postText.html();
        var regex = /[\r\n]/g;
        postText.html(str.replace(regex, "<br>"));
    })
}
function highlight(text, elem) {
    text = text.trim();
    if (text.length >= minKeywordLenth) {
        var innerHTML = elem.innerHTML;
        let startIndex = 0;

        while (startIndex < innerHTML.length) {
            var normalizedHtml = innerHTML.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            var index = normalizedHtml.indexOf(text, startIndex);
            let highLightedText = "";
            if (index >= startIndex) {
                highLightedText = "<span class='highlight'>" + innerHTML.substring(index, index + text.length) + "</span>";
                innerHTML = innerHTML.substring(0, index) + highLightedText + innerHTML.substring(index + text.length);
                startIndex = index + highLightedText.length + 1;
            } else
                startIndex = innerHTML.length + 1;
        }
        elem.innerHTML = innerHTML;
    }
}
function highlightKeywords() {
    if (showKeywords) {
        let keywords = $("#searchKeys").val().split(' ');
        if (keywords.length > 0) {
            keywords.forEach(key => {
                let titles = document.getElementsByClassName('postTitle');
                Array.from(titles).forEach(title => {
                    highlight(key, title);
                })
                let texts = document.getElementsByClassName('postText');
                Array.from(texts).forEach(text => {
                    highlight(key, text);
                })
            })
        }
    }
}

//////////////////////// Forms rendering /////////////////////////////////////////////////////////////////

async function renderEditPostForm(id) {
    $('#commit').show();
    addWaitingGif();
    let response = await Posts_API.Get(id)
    if (!Posts_API.error) {
        let Post = response.data;
        if (Post !== null)
            renderPostForm(Post);
        else
            showError("Post introuvable!");
    } else {
        showError(Posts_API.currentHttpError);
    }
    removeWaitingGif();
}
async function renderDeletePostForm(id) {
    let response = await Posts_API.Get(id)
    if (!Posts_API.error) {
        let post = response.data;
        if (post !== null) {
            let date = convertToFrenchDate(UTC_To_Local(post.Date));
            $("#form").append(`
                <div class="post" id="${post.Id}">
                <div class="postHeader">  ${post.Category} </div>
                <div class="postTitle ellipsis"> ${post.Title} </div>
                <img class="postImage" src='${post.Image}'/>
                <div class="postDate"> ${date} </div>
                <div class="postTextContainer showExtra">
                    <div class="postText">${post.Text}</div>
                </div>
            `);
            linefeeds_to_Html_br(".postText");
            // attach form buttons click event callback
            $('#commit').on("click", async function () {
                await Posts_API.Delete(post.Id);
                if (!Posts_API.error) {
                    await showPosts();
                }
                else {
                    console.log(Posts_API.currentHttpError)
                    showError("Une erreur est survenue!");
                }
            });
            $('#cancel').on("click", async function () {
                await showPosts();
            });

        } else {
            showError("Post introuvable!");
        }
    } else
        showError(Posts_API.currentHttpError);
}
function renderDeleteUserForm(id){
    if(id == null){
        $("#form").append(`
            <div class="deleteTitle">Voulez-vous vraiment effacer votre compte?</div>
            <div class="deleteButtonContainer">
            <input type="button" value="Effacer mon compte" id="deleteUser" class="btn btn-primary deleteButton">
            <input type="button" value="Annuler" id="abortForm" class="btn btn-secondary deleteButton">
            </div>
        `);
    $('#abortForm').on("click",async function () {
        await showPosts();
    });
    $('#abort').on("click",async function () {
        await showPosts();
    });    
    $('#deleteUser').on("click", async function () {
        await Users_API.Delete(loggedUser,loggedUser.User.Id);
        if (!Users_API.error) {
            if (loggedUser)
                showGestionUserForm()
            else
                showConnexionForm();
        }
        else {
            console.log(Posts_API.currentHttpError)
            showError("Une erreur est survenue!");
        }
    });
    }
    else{
        $("#form").append(`
            <div class="deleteTitle">Voulez-vous vraiment effacer se compte?</div>
            <div class="deleteButtonContainer">
            <input type="button" value="Effacer se compte" id="deleteUser" class="btn btn-primary deleteButton">
            <input type="button" value="Annuler" id="abortForm" class="btn btn-secondary deleteButton">
            </div>
        `);
    $('#abortForm').on("click",async function () {
        await showPosts();
    });
    $('#abort').on("click",async function () {
        await showPosts();
    });    
    $('#deleteUser').on("click", async function () {
        await Users_API.Delete(loggedUser, id);
        if (!Users_API.error) {
            if (loggedUser)
                showGestionUserForm()
            else
                showConnexionForm();
        }
        else {
            console.log(Posts_API.currentHttpError)
            showError("Une erreur est survenue!");
        }
    });
    }
        
    
}

function newConnexion(){
    let Connexion = {};
    Connexion.Email = "";
    Connexion.Password = "";
    return Connexion;
}
function renderConnexionForm(){
    let connexion = newConnexion();
    $("#form").show();
    $("#form").empty();
    $("#form").append(`
        <form class="form" id="connexionForm">
            <label for="Email" class="form-label">Adresse Courriel </label>
            <input 
                class="form-control"
                name="Email"
                id="Email"
                placeholder="John.Doe@hotmail.com"
                required
                RequireMessage="Veuillez entrer votre adresse courriel"
                InvalidMessage="L'adresse courriel est invalide"
                value="${connexion.Email}"
            />
            <div id="emailError" style="color:red"></div>
            <label for="Password" class="form-label">Mot de passe </label>
            <input 
                type="password"
                class="form-control"
                name="Password" 
                id="Password" 
                placeholder="*******"
                required
                RequireMessage="Veuillez entrer votre mot de passe"
                InvalidMessage="Mot de passe invalide"
                value="${connexion.Password}"
            />
            <div id="passwordError" style="color:red"></div>
            <br>
            <div id="blockedError" style="color:red"></div>
            <input type="submit" value="Connection" id="saveConnexion" class="btn btn-primary">
            <input type="button" value="Créer un Compte" id="createAccount" class="btn btn-secondary">
            <input type="button" value="Invité" id="guestJoin" class="btn btn-secondary">
        </form>
    `);
    initFormValidation();
    $('#connexionForm').on("submit", async function (event) {
        event.preventDefault();
        $("#emailError").text("");
        $("#passwordError").text("");
        let connexion = getFormData($("#connexionForm"));
        let data = 
        [{
            Email:connexion.Email,
            Password: connexion.Password
        }]
        
            loggedUser = await Users_API.Login(data);

        if (!Users_API.error){
            console.log(loggedUser.User);
            if (loggedUser.User.VerifyCode != "verified"){
                $('#blockedError').text("Usager Non Vérifier!");
            }
            else if (loggedUser.User.Authorizations.readAccess == -1){
                loggedUser = null;
                $('#blockedError').text("Usager bloqué!");
            }
            else{
                createSession(loggedUser);
                await showPosts(); 
            }
        }
        else{
            if (Users_API.currentHttpError.includes("email"))
                $('#emailError').text("Adresse Mail invalide");
            else if (Users_API.currentHttpError.includes("password"))
                $('#passwordError').text("Mot de passe invalide");
        }
    });
    $('#createAccount').on("click",function (event) {
        showCreateUserForm();
    });
    $('#guestJoin').on("click",async function (event) {
        await showPosts();
    });
}
function renderEmailConfirmationForm(){
    let Code= {}
    Code.Id = "";
    Code.VerifyCode = 0;
    $("#form").show();
    $("#form").empty();
    $("#form").append(`
        <form class="form" id="emailConfirmationForm">
            <input type="hidden" name="Id" value="${pendingUser.Id}"/>
            <label for="Email" class="form-label">Code de</label>
            <input 
                class="form-control"
                name="VerifyCode"
                id="VerifyCode"
                placeholder="000000"
                required
                RequireMessage="Veuillez entrer un code de confirmation"
                InvalidMessage="Code de confirmation invalide"
                value="${Code.VerifyCode}"
            />
            <div id="accessCodeError" style="color:red"></div>
            
            <input type="submit" value="Valider" id="verifyAccessCode" class="btn btn-primary">
        </form>
    `);
    initFormValidation();
    $('#emailConfirmationForm').on("submit", async function (event) {
        event.preventDefault();
        let VerifiedEntry = null;
        let code = getFormData($("#emailConfirmationForm"));
        let data = 
        {
            Id:code.Id,
            AccessCode: code.VerifyCode
        }
        
        VerifiedEntry = await Users_API.GetQuery(`/Verify?id=${data.Id}&code=${data.AccessCode}`);

        if (!Users_API.error){
            await showConnexionForm(); 
        }
        else{
            console.log("ERREUR");
        }
    });

}
function newUser(){
    let User = {};
    User.Id = 0;
    User.Email = "";
    User.Password = "";
    User.Name = "";
    User.Avatar = "news-logo-upload.png";
    User.VerifyCode = "unverified";
    User.Authorizations = {};
    User.Authorizations.ReadAccess = 1;
    User.Authorizations.WriteAccess = 1;
    return User;
}
 function renderUserForm(user = null){
    console.log(loggedUser);
    let create = user == null;
    if (create) user = newUser();
    $("#form").show();
    $("#form").empty()
    $("#form").append(`
        <form class="form" id="userForm">
            <input type="hidden" name="Id" value="${user.Id}"/>
             <input type="hidden" name="Created" value="${user.Created}"/>
             <input type="hidden" name="VerifyCode" value="${user.VerifyCode}"/>
             <input type="hidden" name="Access_Token" value="${loggedUser ? loggedUser.Access_token : ''}"/>
             ${create?'<input type="hidden" name="Authorizations" value="' + JSON.stringify(user.Authorizations) + '"/>':'<input type="hidden" name="Authorizations" value="' + JSON.stringify(user.Authorizations) + '"/>'}
            <label for="Email" class="form-label">Adresse de courriel </label>
            <input 
                class="form-control"
                name="Email"
                id="Email"
                placeholder="John.Doe@hotmail.com"
                required
                CustomErrorMessage="L'adresse courriel est déjà existante"
                
                value="${user.Email}"
            />
            
            <input 
                class="form-control MatchedInput"
                name="confirmEmail"
                id="confirmEmail"
                placeholder="Vérification de courriel"
                required
                matchedInputId = "${"Email"}"
                InvalidMessage="Adresses non-identiques"
                disabled="disabled"
                value="${user.Email}"
            />
            <label for="Password" class="form-label">Mot de passe </label>
            <input 
                type="password"
                class="form-control"
                name="Password" 
                id="Password" 
                placeholder="mot de passe"
                ${create?"required":""}
                RequireMessage="Veuillez entrer un mot de passe"
            />
            <input 
                type="password"
                class="form-control MatchedInput"
                
                name="confirmPassword" 
                id="confirmPassword" 
                placeholder="confirmation"
                ${create?"required":""}
                RequireMessage="Veuillez confirmer votre mot de passe"
                matchedInputId = "${"Password"}"
                InvalidMessage="Mot de passes non-identiques"
                disabled="disabled"
            />
            <label for="Name" class="form-label">Votre nom </label>
            <input 
                class="form-control"
                name="Name" 
                id="Name" 
                placeholder="Nom"
                required
                RequireMessage="Veuillez entrer votre nom"
                value="${user.Name}"
            />

            <label class="form-label">Image </label>
            <div class='imageUploaderContainer'>
                <div class='imageUploader' 
                     newImage='${create}' 
                     controlId='Avatar' 
                     imageSrc='${user.Avatar}' 
                     waitingImage="Loading_icon.gif">
                </div>
            </div>
            <input type="submit" value="Enregistrer" id="saveUser" class="btn btn-primary">
                         ${create?'':'<input type="button" value="Effacer le compte" id="deleteUser" class="btn btn-secondary">'}
            
        </form>
    `);
    
    initImageUploaders();
    initFormValidation();
    if (!loggedUser)
        addConflictValidation(Users_API.API_URL() + "/conflict", "Email", "saveUser");
    $('#Email').on('change', function() {
        $('#confirmEmail').prop('disabled', false);
    });
    $('#Password').on('change', function() {
        $('#confirmPassword').prop('disabled', false);
    });
    $("#commit").click(function () {
        
        $("#commit").off();
        return $('#saveUser').trigger("click");
    });
    $('#userForm').on("submit", async function (event) {
        
        event.preventDefault();
        let user = getFormData($("#userForm"));
        user.Created = Local_to_UTC(Date.now());
        user = await Users_API.Save(user, create);
        if (!Users_API.error) {
            if (!loggedUser){
                pendingUser.Id = user.Id;
                showEmailConfirmationForm();
            }
            else{
                loggedUser.User.Name = user.Name
                loggedUser.User.Email = user.Email
                loggedUser.User.Avatar = user.Avatar
                sessionStorage.setItem("user", JSON.stringify(loggedUser));
                showPosts();
            }
                
        }else
            showError("Une erreur est survenue! ", Users_API.currentHttpError);
    });
    $('#abort').on("click",function () {
        
        if (!loggedUser)
            showConnexionForm();
    });
    $('#deleteUser').on("click",function () {
        showUserDeletionForm();
    });
}
function newPost() {
    let Post = {};
    Post.Id = 0;
    Post.Title = "";
    Post.Text = "";
    Post.Image = "news-logo-upload.png";
    Post.Category = "";
    return Post;
}
function renderPostForm(post = null) {
    let create = post == null;
    if (create) post = newPost();
    $("#form").show();
    $("#form").empty();
    $("#form").append(`
        <form class="form" id="postForm">
            <input type="hidden" name="Id" value="${post.Id}"/>
             <input type="hidden" name="Date" value="${post.Date}"/>
            <label for="Category" class="form-label">Catégorie </label>
            <input 
                class="form-control"
                name="Category"
                id="Category"
                placeholder="Catégorie"
                required
                value="${post.Category}"
            />
            <label for="Title" class="form-label">Titre </label>
            <input 
                class="form-control"
                name="Title" 
                id="Title" 
                placeholder="Titre"
                required
                RequireMessage="Veuillez entrer un titre"
                InvalidMessage="Le titre comporte un caractère illégal"
                value="${post.Title}"
            />
            <label for="Url" class="form-label">Texte</label>
             <textarea class="form-control" 
                          name="Text" 
                          id="Text"
                          placeholder="Texte" 
                          rows="9"
                          required 
                          RequireMessage = 'Veuillez entrer une Description'>${post.Text}</textarea>

            <label class="form-label">Image </label>
            <div class='imageUploaderContainer'>
                <div class='imageUploader' 
                     newImage='${create}' 
                     controlId='Image' 
                     imageSrc='${post.Image}' 
                     waitingImage="Loading_icon.gif">
                </div>
            </div>
            <div id="keepDateControl">
                <input type="checkbox" name="keepDate" id="keepDate" class="checkbox" checked>
                <label for="keepDate"> Conserver la date de création </label>
            </div>
            <input type="submit" value="Enregistrer" id="savePost" class="btn btn-primary displayNone">
        </form>
    `);
    if (create) $("#keepDateControl").hide();

    initImageUploaders();
    initFormValidation(); // important do to after all html injection!

    $("#commit").click(function () {
        $("#commit").off();
        return $('#savePost').trigger("click");
    });
    $('#postForm').on("submit", async function (event) {
        event.preventDefault();
        let post = getFormData($("#postForm"));
        if (post.Category != selectedCategory)
            selectedCategory = "";
        if (create || !('keepDate' in post))
            post.Date = Local_to_UTC(Date.now());
        delete post.keepDate;
        post = await Posts_API.Save(post, create);
        if (!Posts_API.error) {
            await showPosts();
            postsPanel.scrollToElem(post.Id);
        }
        else
            showError("Une erreur est survenue! ", Posts_API.currentHttpError);
    });
    $('#cancel').on("click", async function () {
        await showPosts();
    });
}
function getFormData($form) {
    // prevent html injections
    const removeTag = new RegExp("(<[a-zA-Z0-9]+>)|(</[a-zA-Z0-9]+>)", "g");
    var jsonObject = {};
    // grab data from all controls
    $.each($form.serializeArray(), (index, control) => {
        jsonObject[control.name] = control.value.replace(removeTag, "");
    });
    return jsonObject;
}
async function renderGestionUserForm(){
    Users = await Users_API.Get(loggedUser);  
    $("#form").show();
    $("#form").empty();
    $("#form").append(`
        <form class="form">
    `);
    for(let i = 0; i < Users.data.length;i++){
        if(loggedUser.User.Id != Users.data[i].Id){
            let messageBloquer = "";
            if(Users.data[i].Authorizations.readAccess == -1)
                messageBloquer = "Debloquer le compte";
            else
                messageBloquer = "Bloquer le compte"    
            let account = "fa-solid fa-user";
            if(Users.data[i].Authorizations.readAccess == 2)
                account = "fa-solid fa-user-plus";
            else if(Users.data[i].Authorizations.readAccess == 3)
                account = "fa-solid fa-user-gear";
            else if(Users.data[i].Authorizations.readAccess == -1)
                account = "fa-solid fa-circle-xmark";
            $("#form").append(`
               <div class="avatar" style="background-image:url('${Users.data[i].Avatar}')"></div>
               <label for="name" class="form-label"> ${Users.data[i].Name} </label>
               <i type="button" id="${Users.data[i].Id}" class="${account} PromoteUser" name="${Users.data[i].Id}"></i>
               <input type="button" value="Effacer le compte" id="deleteUser" class="deleteUser" name="${Users.data[i].Id}">
               <input type="button" value="${messageBloquer}" id="bloqueUser" class="bloqueUser" name="${Users.data[i].Id}">
               <br>
               <br>
            `);
            }
    }
    $("#form").append(`
        </form>
    `);
    $('.PromoteUser').on("click",function (e) {
        if (loggedUser.User.Authorizations.readAccess > 0){
            renderPromoteUser(e.currentTarget.id)
        }
         
    });
 
    $('.deleteUser').on("click",function (e) {
       
        showUserDeletionForm(e.currentTarget.name);
    });
    $('.bloqueUser').on("click",function (e) {
        showBlockForm(e.currentTarget.name);
    });
 

}
async function renderPromoteUser(id){
    await Users_API.Promote(loggedUser,id);
    if (!Users_API.error) {
        showGestionUserForm();
    }
    else {
        console.log(Posts_API.currentHttpError)
        showError("Une erreur est survenue!");
    }
    
}
async function renderBlockForm(user){
 let elUsor = await Likes_API.GetNames(user);
    if(elUsor.data.Authorizations.readAccess != -1){
        $("#form").append(`
            <div class="deleteTitle">Voulez-vous vraiment bloquer se compte?</div>
            <div class="deleteButtonContainer">
            <input type="button" value="Bloquer ce compte" id="deleteUser" class="btn btn-primary deleteButton">
            <input type="button" value="Annuler" id="abortForm" class="btn btn-secondary deleteButton">
            </div>
        `);
        }
        else{
            $("#form").append(`
                <div class="deleteTitle">Voulez-vous vraiment Débloquer se compte?</div>
                <div class="deleteButtonContainer">
                <input type="button" value="Débloquer se compte" id="deleteUser" class="btn btn-primary deleteButton">
                <input type="button" value="Annuler" id="abortForm" class="btn btn-secondary deleteButton">
                </div>
            `);
        }
$('#abortForm').on("click",async function () {
    await showPosts();
});
$('#abort').on("click",async function () {
    await showPosts();
});    
$('#deleteUser').on("click", async function () {
    await Users_API.Block(loggedUser ,user);
    if (!Users_API.error) {
        showGestionUserForm();
    }
});
}
