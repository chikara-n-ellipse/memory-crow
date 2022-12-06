
const get_confirmation_dialog_html = ()=>{
    return `
    <!-- 確認モーダルダイアログ -->
    <div class="modal fade confmodal" tabindex="-1" role="dialog" 
        aria-labelledby="confirmationModalLabel" aria-hidden="true">
        <div class="modal-dialog" role="document">
            <div class="modal-content bg-dark text-light">
                <div class="modal-header">
                    <h5 class="modal-title" id="confirmationModalLabel">確認</h5>
                    <button type="button" class="close" data-bs-dismiss="modal" 
                        aria-label="Close"><span aria-hidden="true">&times;</span></button>
                </div>
                <div class="confmodal_body modal-body">
                </div>
                <div class="modal-footer">
                    <button type="button" class="ok_confirmation btn btn-primary">OK</button>
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                </div>
            </div>
        </div>
    </div>
    <!-- loading modal -->
    <div class="loading_modal_patch modal fade" tabindex="-1" data-bs-backdrop="static" 
        data-bs-keyboard="false" aria-labelledby="loading_modal_label">
    <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
        <div class="modal-body text-center fs-4">
            <div class="text-secondary">
                <p>処理中です。しばらくお待ち下さい。</p>
                <p><small>この処理には数分かかる場合があります。</small></p>
            </div>
            <div class="spinner-border text-primary" style="width: 3rem; height: 3rem;" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
        </div>
    </div>
    </div>
    `
}


const show_confmodal = (
    container_id,
    form_html,
    method_type,
    get_url_path,
    get_url_queries,
    get_data,
    is_valid,
    on_form_ready=null,
    process_after_result=null,
  )=>{

    if(!on_form_ready) on_form_ready = ()=>{};
    if(!process_after_result) process_after_result = ()=>{};

    $(`.confmodal`).first().modal('show');
    $(`.confmodal_body`).first().html(form_html);

    console.log('$(`.confmodal`)', $(`.confmodal`))

    on_form_ready();

    let $ok_confirmation = $(`.ok_confirmation`).first();
    $ok_confirmation.off();
    $ok_confirmation.on('click', ()=>{

        let url_path = get_url_path();
        let url_queries = get_url_queries();
        let data = get_data();

        if(!is_valid(url_path, url_queries, data)) return;

        // 確認モーダルを隠す
        $(`.confmodal`).first().modal('hide');

        // ローディングモーダルを表示
        $(`.loading_modal_patch`).first().modal('show');

        // ajax通信
        $.ajax({
            type: method_type,
            url: get_url_from_path_and_queries(url_path, url_queries),
            data: JSON.stringify(data),
            // beforeSend: function( xhr, settings ) { xhr.setRequestHeader( 'Authorization', `Bearer ${token}`); },
        })
        .done((data)=> {
            //　成功時
            
            // 処理結果通知アラートを表示
            let $result_alert = $(`
                <div id="confirmation_result_alert" class="alert alert-success fade show d-flex justify-content-between align-items-center" 
                    role="alert" style="position:fixed;z-index:9999;left:50%;top:95%;transform: translate(-50%, -100%);">
                    <div id="">アイテムの処理に成功しました。</div>
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            `);

            // 早すぎると反応しないので遅延実行
            setTimeout(()=>{
                // ローディングモーダルを隠す
                $(`.loading_modal_patch`).first().modal('hide');

                // 処理結果通知アラートを表示
                $(`.result_alert_container`).first().html($result_alert);
            }, 1000)

            process_after_result();
            
        })
        .fail(()=>{
            //　失敗時

            // 処理結果通知アラートを表示
            let $result_alert = $(`
                <div id="confirmation_result_alert" class="alert alert-danger fade show d-flex justify-content-between align-items-center" 
                    role="alert" style="position:fixed;z-index:9999;left:50%;top:95%;transform: translate(-50%, -100%);">
                    <div id="">処理に失敗した可能性があります。ページを更新してください。</div>
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            `);

            $(`.result_alert_container`).first().html($result_alert);

            // ローディングモーダルを隠す
            $(`.loading_modal_patch`).first().modal('hide');
        });
    });
};


const show_confmodal__add_project_bookmark = (list_id, project_id, process_after_result)=>{
    let form_html = `
        <p> 1 個のプロジェクトをブックマークします。</p>
        <p>プロジェクトをブックマークすると「ラーニング」で学習対象として選択できるようになります。
        また「プロジェクト一覧」にプロジェクトが表示されるようになります。</p>
        <p>プロジェクトをブックマークしてもそのカードはブックマークされません。
        プロジェクト閲覧ページより必要なカードを選択して別途ブックマークしてください。
        </p>
    `
    let on_form_ready = ()=>{}
    let get_url_path = ()=> `/api/add_project_bookmark/${project_id}`
    let get_url_queries = ()=>{
        return {};
    }
    let get_data = ()=>{
        return {};
    }
    let is_valid = (url_path, url_queries, data)=>{
        return true;
    }
    show_confmodal(
        list_id,
        form_html,
        method_type='POST',
        get_url_path,
        get_url_queries,
        get_data,
        is_valid,
        on_form_ready=on_form_ready,
        process_after_result=process_after_result,
    )
}


const show_confmodal__remove_project_bookmark = (list_id, project_id, process_after_result)=>{
    let form_html = `
        <p> 1 個のプロジェクトのブックマークを解除します。</p>
    `
    let on_form_ready = ()=>{}
    let get_url_path = ()=> `/api/remove_project_bookmark/${project_id}`
    let get_url_queries = ()=>{
        return {};
    }
    let get_data = ()=>{
        return {};
    }
    let is_valid = (url_path, url_queries, data)=>{
        return true;
    }
    show_confmodal(
        list_id,
        form_html,
        method_type='DELETE',
        get_url_path,
        get_url_queries,
        get_data,
        is_valid,
        on_form_ready=on_form_ready,
        process_after_result=process_after_result,
    )
}


const show_confmodal__patch_projects__set_is_active = (list_id, project_ids, process_after_result)=>{
    let form_html = `
        <p>${project_ids.length}個のプロジェクトの状態を変更します。</p>
        <form id="change_form">
        <div class="input-group mb-3">
            <span class="input-group-text">状態</span>
            <select id="patch_projects__set_is_active__input" class="form-select" aria-label="is_active select">
                <option value="true">アクティブ</option>
                <option value="false">凍結中</option>
            </select>
            </div>
        </form>
    `
    let on_form_ready = ()=>{}
    let get_url_path = ()=> `/api/patch_projects__set_is_active`
    let get_url_queries = ()=>{
        let is_active = $("#patch_projects__set_is_active__input").val();
        return {is_active};
    }
    let get_data = ()=>{
        return project_ids;
    }
    let is_valid = (url_path, url_queries, data)=>{
        let value = url_queries.is_active;
        if(!(value==='true' || value==='false')){
            alert("不正な値です。");
            return false;
        }
        return true;
    }
    show_confmodal(
        list_id,
        form_html,
        method_type='PATCH',
        get_url_path,
        get_url_queries,
        get_data,
        is_valid,
        on_form_ready=on_form_ready,
        process_after_result=process_after_result,
    )
}


const show_confmodal__patch_projects__set_star = (list_id, project_ids, process_after_result)=>{
    let form_html = `
        <p>${project_ids.length}個のプロジェクトのスターの数を変更します。</p>
        <form id="change_form">
        <div class="input-group mb-3">
            <span class="input-group-text">スター</span>
            <select id="patch_projects__set_star__input" class="form-select" aria-label="star select">
                <option value="0">-</option>
                <option value="1">☆</option>
                <option value="2">☆☆</option>
                <option value="3">☆☆☆</option>
                <option value="4">☆☆☆☆</option>
                <option value="5">☆☆☆☆☆</option>
            </select>
            </div>
        </form>
    `
    let on_form_ready = ()=>{}
    let get_url_path = ()=> `/api/patch_projects__set_star`
    let get_url_queries = ()=>{
        let star = $("#patch_projects__set_star__input").val();
        return {star};
    }
    let get_data = ()=>{
        return project_ids;
    }
    let is_valid = (url_path, url_queries, data)=>{
        let value = url_queries.star;
        if(!((0 <= value) && (value <= 5))){
            alert("スターの数は0以上5以下です。");
            return false;
        }
        return true;
    }
    show_confmodal(
        list_id,
        form_html,
        method_type='PATCH',
        get_url_path,
        get_url_queries,
        get_data,
        is_valid,
        on_form_ready=on_form_ready,
        process_after_result=process_after_result,
    )
}


const show_confmodal__patch_projects__set_publicity = (list_id, project_ids, process_after_result)=>{
    let form_html = `
    <p>${project_ids.length}個のプロジェクトに公開状態を設定します。</p>
    <form id="patch_projects__set_publicity__form">
        <div class="d-flex mb-3">
            <span class="input-group-text">公開状態</span>
            <select id="patch_projects__set_publicity__input" class="is_active_select form-select" aria-label="is_active select">
                <option value="0">非公開</option>
                <option value="1">公開</option>
            </select>
        </div>
    </form>
    `
    let on_form_ready = ()=>{}
    let get_url_path = ()=> `/api/patch_projects__set_publicity`
    let get_url_queries = ()=>{
        let publicity = $("#patch_projects__set_publicity__input").val();
        return {publicity};
    }
    let get_data = ()=>{
        return project_ids;
    }
    let is_valid = (url_path, url_queries, data)=>{
        let value = url_queries.publicity;
        if(!((0 <= value) && (value <= 5))){
            alert("スターの数は0以上5以下です。");
            return false;
        }
        return true;
    }
    show_confmodal(
        list_id,
        form_html,
        method_type='PATCH',
        get_url_path,
        get_url_queries,
        get_data,
        is_valid,
        on_form_ready=on_form_ready,
        process_after_result=process_after_result,
    )
}


const show_confmodal__patch_projects__set_parent = (list_id, project_ids, process_after_result)=>{
    let form_html = `
        <p>${project_ids.length}個のプロジェクトの親プロジェクトを変更します。</p>
        <p>４階層を超えたり循環するように指定するとエラーになりますのでご注意ください。</p>
        <form id="patch_projects__set_parent__form">
            <div class="d-flex mb-3">
                <span class="">親プロジェクト</span>
                <select id="patch_projects__set_parent__input" class="project_select form-select" aria-label="parent select">
                </select>
            </div>
        </form>
    `
    let on_form_ready = ()=>{
        init_project_select(dropdown_parent='#patch_projects__set_parent__form', false, {exclude_max_path:true,});
    }
    let get_url_path = ()=> `/api/patch_projects__set_parent`
    let get_url_queries = ()=>{
        let parent_id = $("#patch_projects__set_parent__input").val();
        return parent_id ? {parent_id}:{};
    }
    let get_data = ()=>{
        return project_ids;
    }
    let is_valid = (url_path, url_queries, data)=>{
        let value = url_queries.parent_id;
        if(value && !validate_uuid(uuid).result){
            alert("不正な値です。");
            return false;
        }
        return true;
    }
    show_confmodal(
        list_id,
        form_html,
        method_type='PATCH',
        get_url_path,
        get_url_queries,
        get_data,
        is_valid,
        on_form_ready=on_form_ready,
        process_after_result=process_after_result,
    )
}


const show_confmodal__delete_projects = (list_id, project_ids, process_after_result)=>{
    let form_html = `
        <p>${project_ids.length}個のプロジェクトを削除します。本当によろしいですか？</p>
        <p>
            プロジェクトを削除すると、それに属する全てのカードおよび復習管理が削除されます。
        </p>
    `
    let on_form_ready = ()=>{}
    let get_url_path = ()=> `/api/delete_projects`
    let get_url_queries = ()=>{
      return {};
    }
    let get_data = ()=>{
      return project_ids;
    }
    let is_valid = (url_path, url_queries, data)=>{
      return true
    }
    show_confmodal(
        list_id,
        form_html,
        method_type='DELETE',
        get_url_path,
        get_url_queries,
        get_data,
        is_valid,
        on_form_ready=on_form_ready,
        process_after_result=process_after_result,
    )
}


const show_confmodal__patch_tags__set_star = (list_id, tag_ids, process_after_result)=>{
    let form_html = `
        <p>${tag_ids.length}個のタグのスターの数を変更します。</p>
        <form id="change_form">
        <div class="input-group mb-3">
            <span class="input-group-text">スター</span>
            <select id="patch_tags__set_star__input" class="form-select" aria-label="star select">
                <option value="0">-</option>
                <option value="1">☆</option>
                <option value="2">☆☆</option>
                <option value="3">☆☆☆</option>
                <option value="4">☆☆☆☆</option>
                <option value="5">☆☆☆☆☆</option>
            </select>
            </div>
        </form>
    `
    let on_form_ready = ()=>{}
    let get_url_path = ()=> `/api/patch_tags__set_star`
    let get_url_queries = ()=>{
        let star = $("#patch_tags__set_star__input").val();
        return {star};
    }
    let get_data = ()=>{
        return tag_ids;
    }
    let is_valid = (url_path, url_queries, data)=>{
        let value = url_queries.star;
        if(!((0 <= value) && (value <= 5))){
            alert("スターの数は0以上5以下です。");
            return false;
        }
        return true;
    }
    show_confmodal(
        list_id,
        form_html,
        method_type='PATCH',
        get_url_path,
        get_url_queries,
        get_data,
        is_valid,
        on_form_ready=on_form_ready,
        process_after_result=process_after_result,
    )
}


const show_confmodal__patch_tags__set_publicity = (list_id, tag_ids, process_after_result)=>{
    let form_html = `
    <p>${tag_ids.length}個のタグに公開状態を設定します。</p>
    <form id="patch_tags__set_publicity__form">
        <div class="d-flex mb-3">
            <span class="input-group-text">公開状態</span>
            <select id="patch_tags__set_publicity__input" class="is_active_select form-select" aria-label="is_active select">
                <option value="0">非公開</option>
                <option value="1">公開</option>
            </select>
        </div>
    </form>
    `
    let on_form_ready = ()=>{}
    let get_url_path = ()=> `/api/patch_tags__set_publicity`
    let get_url_queries = ()=>{
        let publicity = $("#patch_tags__set_publicity__input").val();
        return {publicity};
    }
    let get_data = ()=>{
        return tag_ids;
    }
    let is_valid = (url_path, url_queries, data)=>{
        let value = url_queries.publicity;
        if(!((0 <= value) && (value <= 5))){
            alert("スターの数は0以上5以下です。");
            return false;
        }
        return true;
    }
    show_confmodal(
        list_id,
        form_html,
        method_type='PATCH',
        get_url_path,
        get_url_queries,
        get_data,
        is_valid,
        on_form_ready=on_form_ready,
        process_after_result=process_after_result,
    )
}


const show_confmodal__patch_tags__set_parent = (list_id, tag_ids, process_after_result)=>{
    let form_html = `
        <p>${tag_ids.length}個のタグの親タグを変更します。</p>
        <form id="patch_tags__set_parent__form">
            <div class="d-flex mb-3">
                <span class="">親タグ</span>
                <select id="patch_tags__set_parent__input" class="tag_select form-select" aria-label="parent select">
                </select>
            </div>
        </form>
    `
    let on_form_ready = ()=>{
        init_tag_select(dropdown_parent='#patch_tags__set_parent__form', false, {exclude_max_path:true,});
    }
    let get_url_path = ()=> `/api/patch_tags__set_parent`
    let get_url_queries = ()=>{
        let parent_id = $("#patch_tags__set_parent__input").val();
        return parent_id ? {parent_id}:{};
    }
    let get_data = ()=>{
        return tag_ids;
    }
    let is_valid = (url_path, url_queries, data)=>{
        let value = url_queries.parent_id;
        if(value && !value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i).length){
            alert("不正な値です。");
            return false;
        }
        return true;
    }
    show_confmodal(
        list_id,
        form_html,
        method_type='PATCH',
        get_url_path,
        get_url_queries,
        get_data,
        is_valid,
        on_form_ready=on_form_ready,
        process_after_result=process_after_result,
    )
}


const show_confmodal__delete_tags = (list_id, tag_ids, process_after_result)=>{
    let form_html = `
      <p>${tag_ids.length}個のタグを削除します。本当によろしいですか？</p>
    `
    let on_form_ready = ()=>{}
    let get_url_path = ()=> `/api/delete_tags/`
    let get_url_queries = ()=>{
      return {};
    }
    let get_data = ()=>{
      return tag_ids;
    }
    let is_valid = (url_path, url_queries, data)=>{
      return true
    }
    show_confmodal(
        list_id,
        form_html,
        method_type='DELETE',
        get_url_path,
        get_url_queries,
        get_data,
        is_valid,
        on_form_ready=on_form_ready,
        process_after_result=process_after_result,
    )
}


const show_confmodal__add_qa_bookmarks = (list_id, qa_ids, process_after_result)=>{
    let form_html = `
        <p> ${qa_ids.length}個のQAをブックマークします。</p>
        <p>QAをブックマークすると「ラーニング」にて学習できるようになります。
        また「復習管理一覧」にこのQAの復習管理情報が表示されるようになります。</p>
    `
    let on_form_ready = ()=>{}
    let get_url_path = ()=> `/api/add_qa_bookmarks/`
    let get_url_queries = ()=>{
        return {};
    }
    let get_data = ()=>{
        return qa_ids;
    }
    let is_valid = (url_path, url_queries, data)=>{
        return true;
    }
    show_confmodal(
        list_id,
        form_html,
        method_type='POST',
        get_url_path,
        get_url_queries,
        get_data,
        is_valid,
        on_form_ready=on_form_ready,
        process_after_result=process_after_result,
    )
}


const show_confmodal__remove_qa_bookmarks = (list_id, qa_ids, process_after_result)=>{
    let form_html = `
        <p> ${qa_ids.length}個のQAのブックマークを解除します。</p>
        <p> これらのQAの学習データは全て失われます。
        学習を再開できるようにしたい場合、解除せずに「凍結」をご利用ください。</p>
    `
    let on_form_ready = ()=>{}
    let get_url_path = ()=> `/api/remove_qa_bookmarks`
    let get_url_queries = ()=>{
        return {};
    }
    let get_data = ()=>{
        return qa_ids;
    }
    let is_valid = (url_path, url_queries, data)=>{
        return true;
    }
    show_confmodal(
        list_id,
        form_html,
        method_type='DELETE',
        get_url_path,
        get_url_queries,
        get_data,
        is_valid,
        on_form_ready=on_form_ready,
        process_after_result=process_after_result,
    )
}


const show_confmodal__patch_cards__set_project = (list_id, card_ids, process_after_result)=>{

    let form_html = `
        <p>${card_ids.length}個のカードのプロジェクトの値を変更します。</p>
        <form id="patch_cards__set_project__form">
            <div class="d-flex mb-3">
                <span class="">プロジェクト</span>
                <select id="patch_cards__set_project__input" class="project_select form-select" aria-label="project select">
                </select>
            </div>
        </form>
    `
    let on_form_ready = ()=>{
        init_project_select(dropdown_parent='#patch_cards__set_project__form');
    }
    let get_url_path = ()=> `/api/patch_cards__set_project`
    let get_url_queries = ()=>{
        let project_id = $("#patch_cards__set_project__input").val();
        return project_id ? {project_id}:{};
    }
    let get_data = ()=>{
        return card_ids;
    }
    let is_valid = (url_path, url_queries, data)=>{
        let value = url_queries.project_id;
        if(value && !value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i).length){
            alert("不正な値です。");
            return false;
        }
        return true;
    }
    show_confmodal(
        list_id,
        form_html,
        method_type='PATCH',
        get_url_path,
        get_url_queries,
        get_data,
        is_valid,
        on_form_ready=on_form_ready,
        process_after_result=process_after_result,
    )
}




const show_confmodal__patch_cards__add_tags = (list_id, card_ids, process_after_result)=>{

    let form_html = `
        <p>${card_ids.length}個のカードにタグを追加します。</p>
        <form id="patch_cards__add_tags__form">
            <div class="d-flex mb-3 input-group">
                <span class="no-wrap">追加するタグ</span>
                <select id="patch_cards__add_tags__input" class="tag_select form-select" aria-label="tag select">
                </select>
            </div>
        </form>
    `
    let on_form_ready = ()=>{
        init_tag_select(dropdown_parent='#patch_cards__add_tags__form', multiple=true);
    }
    let get_url_path = ()=> `/api/patch_cards__add_tags`
    let get_url_queries = ()=>{
        return {};
    }
    let get_data = ()=>{
        let tag_ids = $("#patch_cards__add_tags__input").val();
        return {card_ids, tag_ids};
    }
    let is_valid = (url_path, url_queries, data)=>{
        if (!data.card_ids || !data.card_ids.length) {
            alert("少なくとも１つのカードを選択してください。");
            return false;
        }
        if (!data.tag_ids || !data.tag_ids.length) {
            alert("少なくとも１つのタグを選択してください。");
            return false;
        }
        for (let i in data.card_ids){
            if(!data.card_ids[i].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i).length){
                alert("不正なカードIDです。");
                return false;
            }
        }
        for (let i in data.tag_ids){
            if(!data.tag_ids[i].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i).length){
                alert("不正なタグIDです。");
                return false;
            }
        }
        return true;
    }
    show_confmodal(
        list_id,
        form_html,
        method_type='PATCH',
        get_url_path,
        get_url_queries,
        get_data,
        is_valid,
        on_form_ready=on_form_ready,
        process_after_result=process_after_result,
    )
}


const show_confmodal__patch_cards__remove_tags = (list_id, card_ids, process_after_result)=>{

    let form_html = `
        <p>${card_ids.length}個のカードからタグを除外します。</p>
        <form id="patch_cards__remove_tags__form">
            <div class="d-flex mb-3">
                <span class="">除外するタグ</span>
                <select id="patch_cards__remove_tags__input" class="tag_select form-select" aria-label="tag select">
                </select>
            </div>
        </form>
    `
    let on_form_ready = ()=>{
        init_tag_select(dropdown_parent='#patch_cards__remove_tags__form', multiple=true);
    }
    let get_url_path = ()=> `/api/patch_cards__remove_tags`
    let get_url_queries = ()=>{
        return {};
    }
    let get_data = ()=>{
        let tag_ids = $("#patch_cards__remove_tags__input").val();
        return {card_ids, tag_ids};
    }
    let is_valid = (url_path, url_queries, data)=>{
        if (!data.card_ids || !data.card_ids.length) {
            alert("少なくとも１つのカードを選択してください。");
            return false;
        }
        if (!data.tag_ids || !data.tag_ids.length) {
            alert("少なくとも１つのタグを選択してください。");
            return false;
        }
        for (let i in data.card_ids){
            if(!data.card_ids[i].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i).length){
                alert("不正なカードIDです。");
                return false;
            }
        }
        for (let i in data.tag_ids){
            if(!data.tag_ids[i].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i).length){
                alert("不正なタグIDです。");
                return false;
            }
        }
        return true;
    }
    show_confmodal(
        list_id,
        form_html,
        method_type='PATCH',
        get_url_path,
        get_url_queries,
        get_data,
        is_valid,
        on_form_ready=on_form_ready,
        process_after_result=process_after_result,
    )
}


const show_confmodal__patch_cards__set_tags = (list_id, card_ids, process_after_result)=>{

    let form_html = `
        <p>${card_ids.length}個のカードにタグを設定します。</p>
        <p class="text-danger">注意: 既存のタグを全て除外してから設定します。
            既存のタグを残しつつタグを追加する場合は「一括変更」-> 「タグの追加」を利用してください。</p>
        <form id="patch_cards__set_tags__form">
            <div class="d-flex mb-3">
                <span class="">除去するタグ</span>
                <select id="patch_cards__set_tags__input" class="tag_select form-select" aria-label="tag select">
                </select>
            </div>
        </form>
    `
    let on_form_ready = ()=>{
        init_tag_select(dropdown_parent='#patch_cards__set_tags__form', multiple=true);
    }
    let get_url_path = ()=> `/api/patch_cards__set_tags`
    let get_url_queries = ()=>{
        return {};
    }
    let get_data = ()=>{
        let tag_ids = $("#patch_cards__set_tags__input").val();
        if (!tag_ids)tag_ids = [];
        return {card_ids, tag_ids};
    }
    let is_valid = (url_path, url_queries, data)=>{
        if (!data.card_ids || !data.card_ids.length) {
            alert("少なくとも１つのカードを選択してください。");
            return false;
        }
        for (let i in data.card_ids){
            if(!data.card_ids[i].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i).length){
                alert("不正なカードIDです。");
                return false;
            }
        }
        for (let i in data.tag_ids){
            if(!data.tag_ids[i].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i).length){
                alert("不正なタグIDです。");
                return false;
            }
        }
        return true;
    }
    show_confmodal(
        list_id,
        form_html,
        method_type='PATCH',
        get_url_path,
        get_url_queries,
        get_data,
        is_valid,
        on_form_ready=on_form_ready,
        process_after_result=process_after_result,
    )
}


const show_confmodal__patch_cards__set_publicity = (list_id, card_ids, process_after_result)=>{

    let form_html = `
        <p>${card_ids.length}個のカードに公開状態を設定します。</p>
        <form id="patch_cards__set_publicity__form">
            <div class="d-flex mb-3">
                <span class="input-group-text">公開状態</span>
                <select id="patch_cards__set_publicity__input" class="publicity_select form-select" aria-label="publicity_select">
                    <option value="0">非公開</option>
                    <option value="1">公開</option>
                </select>
            </div>
        </form>
    `
    let on_form_ready = ()=>{
    }
    let get_url_path = ()=> `/api/patch_cards__set_publicity`
    let get_url_queries = ()=>{
        let publicity = $("#patch_cards__set_publicity__input").val();
        return {publicity};
    }
    let get_data = ()=>{
        return card_ids;
    }
    let is_valid = (url_path, url_queries, data)=>{
        let value = url_queries.publicity;
        if (!data || !data.length) {
            alert("少なくとも１つのカードを選択してください。");
            return false;
        }
        for (let i in data){
            if(!data[i].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i).length){
                alert("不正なカードIDです。");
                return false;
            }
        }
        if(!((0 <= value) && (value <= 1))){
            alert("不正な値です。");
            return false;
        }
        return true;
    }
    show_confmodal(
        list_id,
        form_html,
        method_type='PATCH',
        get_url_path,
        get_url_queries,
        get_data,
        is_valid,
        on_form_ready=on_form_ready,
        process_after_result=process_after_result,
    )
}


const show_confmodal__delete_cards = (list_id, card_ids, process_after_result)=>{
    let form_html = `
      <p>${card_ids.length}個のカードを削除します。本当によろしいですか？</p>
      <p>カードを削除すると、それに関連する全ての復習管理が削除されます。
        公開カードの場合、そのカードを学習中の全てのユーザの復習管理情報も削除されます。
        依存先・依存元の復習管理情報は削除されません。</p>
    `
    let on_form_ready = ()=>{};
    let get_url_path = ()=> `/api/delete_cards`;
    let get_url_queries = ()=>{
      return {};
    }
    let get_data = ()=>{
      return card_ids;
    }
    let is_valid = (url_path, url_queries, data)=>{
      return true
    }
    show_confmodal(
        list_id,
        form_html,
        method_type='DELETE',
        get_url_path,
        get_url_queries,
        get_data,
        is_valid,
        on_form_ready=on_form_ready,
        process_after_result=process_after_result,
    )
}


const show_confmodal__delete_cards_from_rm_ids = (list_id, rm_ids, process_after_result)=>{
    let form_html = `
      <p>${rm_ids.length}個の復習管理に対応するカードを削除します。本当によろしいですか？</p>
      <p>カードを削除すると、それに関連する全ての復習管理が削除されます。
        公開カードの場合、そのカードを学習中の全てのユーザの復習管理も削除されます。</p>
    `
    let on_form_ready = ()=>{}
    let get_url_path = ()=> `/api/delete_cards_from_rm_ids`
    let get_url_queries = ()=>{
      return {};
    }
    let get_data = ()=>{
      return rm_ids;
    }
    let is_valid = (url_path, url_queries, data)=>{
      return true
    }
    show_confmodal(
        list_id,
        form_html,
        method_type='DELETE',
        get_url_path,
        get_url_queries,
        get_data,
        is_valid,
        on_form_ready=on_form_ready,
        process_after_result=process_after_result,
    )
}


const show_confmodal__patch_rm_set__initialize = (list_id, qa_ids, process_after_result)=>{
    let form_html = `
        <p>${qa_ids.length}枚の復習管理を初期化します。</p>
        <p>初期化を行うと以下の４つの値が0になります。</p>
        <ul>
            <li>摂取レベル（ingestion level, IL）</li>
            <li>定着レベル（absorption level, AL）</li>
            <li>最高定着レベル（highest absorption level, HAL）</li>
            <li>実際復習間隔（actual review interval）</li>
        </ul>
    `
    let on_form_ready = ()=>{
    }
    let get_url_path = ()=> `/api/patch_rm_set__initialize`
    let get_url_queries = ()=>{
        return {};
    }
    let get_data = ()=>{
        return qa_ids;
    }

    let is_valid = (url_path, url_queries, data)=>{
        let value = url_queries.need_session;
        if (!data || !data.length) {
            alert("少なくとも１つの復習管理を選択してください。");
            return false;
        }
        for (let i in data){
            if(!data[i].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i).length){
                alert("不正な復習管理IDです。");
                return false;
            }
        }
        return true;
    }

    show_confmodal(
        list_id,
        form_html,
        method_type='PATCH',
        get_url_path,
        get_url_queries,
        get_data,
        is_valid,
        on_form_ready=on_form_ready,
        process_after_result=process_after_result,
    )
}


const show_confmodal__patch_rm_set__set_need_session = (list_id, qa_ids, process_after_result)=>{
    let form_html = `
        <p>${qa_ids.length}枚の復習管理の要セッション指定を設定します。</p>
        <form id="patch_rm_set__set_need_session__form">
            <div class="d-flex mb-3">
                <span class="input-group-text">公開状態</span>
                <select id="patch_rm_set__set_need_session__input" class="form-select" aria-label="need_session select">
                    <option value="false">隙間時間</option>
                    <option value="true">要セッション</option>
                </select>
            </div>
        </form>
    `
    let on_form_ready = ()=>{
    }
    let get_url_path = ()=> `/api/patch_rm_set__set_need_session`
    let get_url_queries = ()=>{
        let need_session = $("#patch_rm_set__set_need_session__input").val();
        return {need_session};
    }
    let get_data = ()=>{
        return qa_ids;
    }

    let is_valid = (url_path, url_queries, data)=>{
        let value = url_queries.need_session;
        if (!data || !data.length) {
            alert("少なくとも１つの復習管理を選択してください。");
            return false;
        }
        for (let i in data){
            if(!data[i].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i).length){
                alert("不正な復習管理IDです。");
                return false;
            }
        }
        if(!(value==='true' || value==='false')){
            alert("不正な値です。");
            return false;
        }
        return true;
    }

    show_confmodal(
        list_id,
        form_html,
        method_type='PATCH',
        get_url_path,
        get_url_queries,
        get_data,
        is_valid,
        on_form_ready=on_form_ready,
        process_after_result=process_after_result,
    )
}

const show_confmodal__patch_rm_set__set_is_active = (list_id, qa_ids, process_after_result)=>{
    let form_html = `
        <p>${qa_ids.length}枚の復習管理の活動状態を設定します。</p>
        <form id="patch_rm_set__set_is_active__form">
            <div class="d-flex mb-3">
                <span class="input-group-text">活動状態</span>
                <select id="patch_rm_set__set_is_active__input" class="form-select" aria-label="is_active select">
                    <option value="true">アクティブ</option>
                    <option value="false">凍結</option>
                </select>
            </div>
        </form>
    `
    let on_form_ready = ()=>{
    }
    let get_url_path = ()=> `/api/patch_rm_set__set_is_active`
    let get_url_queries = ()=>{
        let is_active = $("#patch_rm_set__set_is_active__input").val();
        return {is_active};
    }
    let get_data = ()=>{
        return qa_ids;
    }

    let is_valid = (url_path, url_queries, data)=>{
        let value = url_queries.is_active;
        if (!data || !data.length) {
            alert("少なくとも１つの復習管理を選択してください。");
            return false;
        }
        for (let i in data){
            if(!data[i].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i).length){
                alert("不正な復習管理IDです。");
                return false;
            }
        }
        if(!(value==='true' || value==='false')){
            alert(`不正な値です。値：${value}`);
            return false;
        }
        return true;
    }

    show_confmodal(
        list_id,
        form_html,
        method_type='PATCH',
        get_url_path,
        get_url_queries,
        get_data,
        is_valid,
        on_form_ready=on_form_ready,
        process_after_result=process_after_result,
    )
}


const show_confmodal__patch_rm_set__set_ul_review_interval = (list_id, qa_ids, process_after_result)=>{
    let form_html = `
        <p>${qa_ids.length}枚の復習管理の上限復習間隔を設定します。</p>
        <p>0日～36500日以内の日数を整数で指定してください。</p>
        <form id="patch_rm_set__set_ul_review_interval__form">
            <div class="d-flex mb-3">
                <span class="input-group-text">上限復習間隔（日）</span>
                <input type="text" id="patch_rm_set__set_ul_review_interval__input" class="form-control" aria-label="ingestion_level input">
            </div>
        </form>
    `
    let on_form_ready = ()=>{
    }
    let get_url_path = ()=> `/api/patch_rm_set__set_ul_review_interval`;
    let get_url_queries = ()=>{
        let uri_days = $("#patch_rm_set__set_ul_review_interval__input").val();
        if(uri_days) ul_review_interval = parseInt(uri_days) * 24 * 60 * 60; // days -> seconds
        return {ul_review_interval};
    }
    let get_data = ()=>{
        return qa_ids;
    }

    let is_valid = (url_path, url_queries, data)=>{
        let value = url_queries.ul_review_interval;
        if (!data || !data.length) {
            alert("少なくとも１つの復習管理を選択してください。");
            return false;
        }
        for (let i in data){
            if(!data[i].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i).length){
                alert("不正な復習管理IDです。");
                return false;
            }
        }
        if (value === ''){
            alert(`値を入力してください。`);
            return false;
        }
        if (isNaN(value)){
            alert(`不正な形式の値です。`);
            return false;
        }
        if(!((0 <= value) && (value <= 60 * 60 * 24 * 365 * 100))){
            alert(`不正な値です。値：${value}`);
            return false;
        }
        return true;
    }

    show_confmodal(
        list_id,
        form_html,
        method_type='PATCH',
        get_url_path,
        get_url_queries,
        get_data,
        is_valid,
        on_form_ready=on_form_ready,
        process_after_result=process_after_result,
    )
}


const show_confmodal__patch_rm_set__set_ingestion_level = (list_id, qa_ids, process_after_result)=>{
    let form_html = `
        <p>${qa_ids.length}枚の復習管理の摂取レベルを設定します。</p>
        <p>0～7の整数で設定してください。</p>
        <form id="patch_rm_set__set_ingestion_level__form">
            <div class="d-flex mb-3">
                <span class="input-group-text">摂取レベル</span>
                <input type="text" id="patch_rm_set__set_ingestion_level__input" class="form-control" aria-label="ingestion_level input">
            </div>
        </form>
    `
    let on_form_ready = ()=>{
    }
    let get_url_path = ()=> `/api/patch_rm_set__set_ingestion_level`
    let get_url_queries = ()=>{
        let ingestion_level = $("#patch_rm_set__set_ingestion_level__input").val();
        if(ingestion_level) ingestion_level = parseInt(ingestion_level)
        return {ingestion_level};
    }
    let get_data = ()=>{
        return qa_ids;
    }

    let is_valid = (url_path, url_queries, data)=>{
        let value = url_queries.ingestion_level;
        if (!data || !data.length) {
            alert("少なくとも１つの復習管理を選択してください。");
            return false;
        }
        for (let i in data){
            if(!data[i].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i).length){
                alert("不正な復習管理IDです。");
                return false;
            }
        }
        if (value === ''){
            alert(`値を入力してください。`);
            return false;
        }
        if (isNaN(value)){
            alert(`不正な形式の値です。`);
            return false;
        }
        if(!((0 <= value) && (value <= 7))){
            alert(`不正な値です。値：${value}`);
            return false;
        }
        return true;
    }

    show_confmodal(
        list_id,
        form_html,
        method_type='PATCH',
        get_url_path,
        get_url_queries,
        get_data,
        is_valid,
        on_form_ready=on_form_ready,
        process_after_result=process_after_result,
    )
}


const show_confmodal__patch_rm_set__set_absorption_level = (list_id, qa_ids, process_after_result)=>{
    let form_html = `
        <p>${qa_ids.length}枚の復習管理の定着レベルを設定します。</p>
        <p>0～12の整数で設定してください。</p>
        <form id="patch_rm_set__set_absorption_level__form">
            <div class="d-flex mb-3">
                <span class="input-group-text">定着レベル</span>
                <input type="text" id="patch_rm_set__set_absorption_level__input" class="form-control" aria-label="absorption_level input">
            </div>
        </form>
    `
    let on_form_ready = ()=>{
    }
    let get_url_path = ()=> `/api/patch_rm_set__set_absorption_level`
    let get_url_queries = ()=>{
        let absorption_level = $("#patch_rm_set__set_absorption_level__input").val();
        if(absorption_level) absorption_level = parseInt(absorption_level)
        return {absorption_level};
    }
    let get_data = ()=>{
        return qa_ids;
    }

    let is_valid = (url_path, url_queries, data)=>{
        let value = url_queries.absorption_level;
        if (!data || !data.length) {
            alert("少なくとも１つの復習管理を選択してください。");
            return false;
        }
        for (let i in data){
            if(!data[i].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i).length){
                alert("不正な復習管理IDです。");
                return false;
            }
        }
        if (value === ''){
            alert(`値を入力してください。`);
            return false;
        }
        if (isNaN(value)){
            alert(`不正な形式の値です。`);
            return false;
        }
        if(!((0 <= value) && (value <= 12))){
            alert(`不正な範囲の値です。値：${value}`);
            return false;
        }
        return true;
    }

    show_confmodal(
        list_id,
        form_html,
        method_type='PATCH',
        get_url_path,
        get_url_queries,
        get_data,
        is_valid,
        on_form_ready=on_form_ready,
        process_after_result=process_after_result,
    )
}


const show_confmodal__patch_rm_set__set_interval_increase_rate = (list_id, qa_ids, process_after_result)=>{
    let form_html = `
        <p>${qa_ids.length}枚の復習管理の定着レベルを設定します。</p>
        <p>1.1～4.0の整数で設定してください。</p>
        <form id="patch_rm_set__set_interval_increase_rate__form">
            <div class="d-flex mb-3">
                <span class="input-group-text">定着レベル</span>
                <input type="text" id="patch_rm_set__set_interval_increase_rate__input" class="form-control" aria-label="interval_increase_rate input">
            </div>
        </form>
    `
    let on_form_ready = ()=>{
    }
    let get_url_path = ()=> `/api/patch_rm_set__set_interval_increase_rate`
    let get_url_queries = ()=>{
        let interval_increase_rate = $("#patch_rm_set__set_interval_increase_rate__input").val();
        interval_increase_rate = Number(interval_increase_rate)
        return {interval_increase_rate};
    }
    let get_data = ()=>{
        return qa_ids;
    }
    let is_valid = (url_path, url_queries, data)=>{
        let value = url_queries.interval_increase_rate;
        if (!data || !data.length) {
            alert("少なくとも１つの復習管理を選択してください。");
            return false;
        }
        for (let i in data){
            if(!data[i].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i).length){
                alert("不正な復習管理IDです。");
                return false;
            }
        }
        if (isNaN(value)){
            alert(`不正な形式の値です。`);
            return false;
        }
        if(!((0 <= value) && (value <= 12))){
            alert(`不正な範囲の値です。値：${value}`);
            return false;
        }
        return true;
    }

    show_confmodal(
        list_id,
        form_html,
        method_type='PATCH',
        get_url_path,
        get_url_queries,
        get_data,
        is_valid,
        on_form_ready=on_form_ready,
        process_after_result=process_after_result,
    )
}


const show_confmodal__patch_rm_set__set_actual_review_interval = (list_id, qa_ids, process_after_result)=>{
    let form_html = `
        <p>${qa_ids.length}枚の復習管理の実際復習間隔を設定します。</p>
        <p>0～36500の整数で設定してください。</p>
        <form id="patch_rm_set__set_actual_review_interval__form">
            <div class="d-flex mb-3">
                <span class="input-group-text">実際復習間隔</span>
                <input type="text" id="patch_rm_set__set_actual_review_interval__input" class="form-control" aria-label="actual_review_interval input">
            </div>
        </form>
    `
    let on_form_ready = ()=>{
    }
    let get_url_path = ()=> `/api/patch_rm_set__set_actual_review_interval`
    let get_url_queries = ()=>{
        let ari_days = $("#patch_rm_set__set_actual_review_interval__input").val();
        if(ari_days) actual_review_interval = parseInt(ari_days) * 24 * 60 * 60; // days -> seconds
        return {actual_review_interval};
    }
    let get_data = ()=>{
        return qa_ids;
    }

    let is_valid = (url_path, url_queries, data)=>{
        let value = url_queries.actual_review_interval;
        if (!data || !data.length) {
            alert("少なくとも１つの復習管理を選択してください。");
            return false;
        }
        for (let i in data){
            if(!data[i].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i).length){
                alert("不正な復習管理IDです。");
                return false;
            }
        }
        if (value === ''){
            alert(`値を入力してください。`);
            return false;
        }
        if (isNaN(value)){
            alert(`不正な形式の値です。`);
            return false;
        }
        if(!((0 <= value) && (value <= 60 * 60 * 24 * 365 * 100))){
            alert(`不正な範囲の値です。値：${value}`);
            return false;
        }
        return true;
    }

    show_confmodal(
        list_id,
        form_html,
        method_type='PATCH',
        get_url_path,
        get_url_queries,
        get_data,
        is_valid,
        on_form_ready=on_form_ready,
        process_after_result=process_after_result,
    )
}


const show_confmodal__patch_rm_set__set_last_reviewed_at = (list_id, qa_ids, process_after_result)=>{
    let form_html = `
        <p>${qa_ids.length}枚の復習管理の最終復習日時を設定します。</p>
        <p>未来の日時は指定できません。</p>
        <form id="patch_rm_set__set_last_reviewed_at__form">
            <div class="d-flex mb-3">
                <span class="input-group-text">最終復習日時</span>
                <input type="text" id="patch_rm_set__set_last_reviewed_at__input" class="form-control" aria-label="last_reviewed_at input">
            </div>
        </form>
    `
    let on_form_ready = ()=>{
        $( "#patch_rm_set__set_last_reviewed_at__input" ).datetimepicker({
            theme:'dark'
        });
    }
    let get_url_path = ()=> `/api/patch_rm_set__set_last_reviewed_at`
    let get_url_queries = ()=>{
        let last_reviewed_at = $("#patch_rm_set__set_last_reviewed_at__input").val();
        if(last_reviewed_at) last_reviewed_at = new Date(last_reviewed_at).toISOString();
        return {last_reviewed_at};
    }
    let get_data = ()=>{
        return qa_ids;
    }

    let is_valid = (url_path, url_queries, data)=>{
        let value = url_queries.last_reviewed_at;
        if (!data || !data.length) {
            alert("少なくとも１つの復習管理を選択してください。");
            return false;
        }
        for (let i in data){
            if(!data[i].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i).length){
                alert("不正な復習管理IDです。");
                return false;
            }
        }
        if (value===""){
            alert(`値を入力してください。`);
            return false;
        }
        if (isNaN(new Date(value).getDate())){
            alert(`不正な形式の値です。`);
            return false;
        }
        if(new Date() < new Date(value)){
            alert(`未来の日時は指定できません。値：${value}`);
            return false;
        }
        return true;
    }

    show_confmodal(
        list_id,
        form_html,
        method_type='PATCH',
        get_url_path,
        get_url_queries,
        get_data,
        is_valid,
        on_form_ready=on_form_ready,
        process_after_result=process_after_result,
    )
}


const show_confmodal__patch_rm_set__set_importance = (list_id, qa_ids, process_after_result)=>{
    let form_html = `
        <p>${qa_ids.length}枚の復習管理の重要度を設定します。</p>
        <p>0～10の整数で設定してください。</p>
        <form id="patch_rm_set__set_importance__form">
            <div class="d-flex mb-3">
                <span class="input-group-text">重要度</span>
                <input type="text" id="patch_rm_set__set_importance__input" class="form-control" aria-label="importance input">
            </div>
        </form>
    `
    let on_form_ready = ()=>{
    }
    let get_url_path = ()=> `/api/patch_rm_set__set_importance`
    let get_url_queries = ()=>{
        let importance = $("#patch_rm_set__set_importance__input").val();
        if(importance) importance = parseInt(importance)
        return {importance};
    }
    let get_data = ()=>{
        return qa_ids;
    }

    let is_valid = (url_path, url_queries, data)=>{
        let value = url_queries.importance;
        let importance = url_queries.importance;
        if (!data || !data.length) {
            alert("少なくとも１つの復習管理を選択してください。");
            return false;
        }
        for (let i in data){
            if(!data[i].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i).length){
                alert("不正な復習管理IDです。");
                return false;
            }
        }
        if (importance === ''){
            alert(`値を入力してください。`);
            return false;
        }
        if (isNaN(importance)){
            alert(`不正な形式の値です。値：${importance}`);
            return false;
        }
        if(!((0 <= importance) && (importance <= 10))){
            alert(`不正な範囲の値です。値：${importance}`);
            return false;
        }
        return true;
    }

    show_confmodal(
        list_id,
        form_html,
        method_type='PATCH',
        get_url_path,
        get_url_queries,
        get_data,
        is_valid,
        on_form_ready=on_form_ready,
        process_after_result=process_after_result,
    )
}


const show_confmodal__patch_rm_set__set_estimated_time = (list_id, qa_ids, process_after_result)=>{
    let form_html = `
        <p>${qa_ids.length}枚の復習管理の予想所要時間を設定します。</p>
        <p>00:00:00～23:59:59の時間で設定してください。</p>
        <form id="patch_rm_set__set_estimated_time__form">
            <div class="d-flex mb-3">
                <span class="input-group-text">予想所要時間</span>
                <input type="text"  value="00:00:00" id="patch_rm_set__set_estimated_time__input" class="form-control" aria-label="estimated_time input">
            </div>
        </form>
    `
    let on_form_ready = ()=>{
        $( "#patch_rm_set__set_estimated_time__input" ).datetimepicker({
            theme:'dark',
            datepicker:false,
            format: 'H:i:s',
            defaultTime:'00:00:00',
            minTime:'00:00:00',
            timePickerSeconds: true,
            scrollTime:false,
            step:1,
        });
    }
    let get_url_path = ()=> `/api/patch_rm_set__set_estimated_time`
    let get_url_queries = ()=>{
        let estimated_time = $("#patch_rm_set__set_estimated_time__input").val();
        if(estimated_time){
            let hms = estimated_time.split(':');
            if (hms.length===3){
                let [h, m, s] = hms
                h = parseInt(h)
                m = parseInt(m)
                s = parseInt(s)
                estimated_time = h*60*60+m*60+s;
            }
        }
        return {estimated_time};
    }
    let get_data = ()=>{
        return qa_ids;
    }

    let is_valid = (url_path, url_queries, data)=>{
        let value = url_queries.estimated_time;
        if (!data || !data.length) {
            alert("少なくとも１つの復習管理を選択してください。");
            return false;
        }
        for (let i in data){
            if(!data[i].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i).length){
                alert("不正な復習管理IDです。");
                return false;
            }
        }
        if (value === ''){
            alert(`値を入力してください。`);
            return false;
        }
        if (isNaN(value)){
            alert(`不正な形式の値です。`);
            return false;
        }
        if(!((0 <= value) && (value <= 60 * 60 * 24))){
            alert(`不正な範囲の値です。値：${value}`);
            return false;
        }
        return true;
    }

    show_confmodal(
        list_id,
        form_html,
        method_type='PATCH',
        get_url_path,
        get_url_queries,
        get_data,
        is_valid,
        on_form_ready=on_form_ready,
        process_after_result=process_after_result,
    )
}


const show_confmodal__patch_rm_set__set_highest_absorption_level = (list_id, qa_ids, process_after_result)=>{
    let form_html = `
        <p>${qa_ids.length}枚の復習管理の最高定着レベルを設定します。</p>
        <p>0～10の整数で設定してください。</p>
        <form id="patch_rm_set__set_highest_absorption_level__form">
            <div class="d-flex mb-3">
                <span class="input-group-text">最高定着レベル</span>
                <input type="text" id="patch_rm_set__set_highest_absorption_level__input" class="form-control" aria-label="highest_absorption_level input">
            </div>
        </form>
    `
    let on_form_ready = ()=>{
    }
    let get_url_path = ()=> `/api/patch_rm_set__set_highest_absorption_level`
    let get_url_queries = ()=>{
        let highest_absorption_level = $("#patch_rm_set__set_highest_absorption_level__input").val();
        if(highest_absorption_level) highest_absorption_level = parseInt(highest_absorption_level)
        return {highest_absorption_level};
    }
    let get_data = ()=>{
        return qa_ids;
    }

    let is_valid = (url_path, url_queries, data)=>{
        let value = url_queries.highest_absorption_level;
        if (!data || !data.length) {
            alert("少なくとも１つの復習管理を選択してください。");
            return false;
        }
        for (let i in data){
            if(!data[i].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i).length){
                alert("不正な復習管理IDです。");
                return false;
            }
        }
        if (value === ''){
            alert(`値を入力してください。`);
            return false;
        }
        if (isNaN(value)){
            alert(`不正な形式の値です。`);
            return false;
        }
        if(!((0 <= value) && (value <= 10))){
            alert(`不正な範囲の値です。値：${value}`);
            return false;
        }
        return true;
    }

    show_confmodal(
        list_id,
        form_html,
        method_type='PATCH',
        get_url_path,
        get_url_queries,
        get_data,
        is_valid,
        on_form_ready=on_form_ready,
        process_after_result=process_after_result,
    )
}


const show_confmodal__delete_rm_set = (list_id, qa_ids, process_after_result)=>{
    let form_html = `
      <p>${qa_ids.length}個の復習管理を削除します。本当によろしいですか？</p>
      <p>この操作により該当する問題・解答のパターンはあなたのラーニングページに表示されなくなり、再開はできません。
        再開したい場合は「凍結」をご利用ください。また復習管理の削除は公開中のカードの場合であっても他のユーザには影響しません。</p>
    `
    let on_form_ready = ()=>{}
    let get_url_path = ()=> `/api/delete_rm_set`
    let get_url_queries = ()=>{
      return {}
    }
    let get_data = ()=>{
      return qa_ids;
    }
    let is_valid = (url_path, url_queries, data)=>{
      return true
    }
    show_confmodal(
        list_id,
        form_html,
        method_type='DELETE',
        get_url_path,
        get_url_queries,
        get_data,
        is_valid,
        on_form_ready=on_form_ready,
        process_after_result=process_after_result,
    )
}

const get_tsv_modal_html = ()=>{
    return `
    <!-- TSV入力モーダルダイアログ -->
    <div class="modal modal-xl fade" id="tsv_modal" tabindex="-1" role="dialog" aria-labelledby="tsv_modal_label" aria-hidden="true">
        <div class="modal-dialog" role="document">
            <div class="modal-content bg-dark">
                <div class="modal-header">
                    <h5 class="modal-title">TSVから作成</h5>
                    <button type="button" class="close" data-bs-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                </div>
                <div id="confmodal_body" class="modal-body">
                    <p>TSVから一括でカードおよび復習管理を作成します。</p>
                    <p>
                        以下に示す表の形式に従ってください。
                        カードフィールド数は2~5で"cf:<フィールド名>"のようにしてください。
                        "qa_set"列は必ず含み、復習管理は１枚以上指定するようにしてください。
                        復習管理は"<問題フィールドインデックス>-<解答フィールドインデックス>"の形式で指定します。
                        複数枚の復習管理がある場合","で区切ってください。
                        プロジェクトおよびタグは名称が一致するものが既にあればそれが使用され、なければ新規作成されます。
                        IDは直接指定できません。
                        複数のタグがある場合は","で区切ってください。
                    </p>
                    <div class="tsv_example_1_block">
                        <button class="btn btn-link" type="button" data-bs-toggle="collapse" 
                            data-bs-target="#tsv_example_1_collapse" aria-expanded="false" aria-controls="tsv_example_1_collapse">
                            例 1
                        </button>
                        <div id="tsv_example_1_collapse" class="collapse overflow-scroll">
                            <table class="table table-dark text-nowrap my-3 ">
                                <tr>
                                    <th>cf:{"name":"表"}</th>
                                    <th>cf:{"name":"裏"}</th>
                                    <th>supplement</th>
                                    <th>project</th>
                                    <th>tags</th>
                                    <th>publicity</th>

                                    <th>qa_set</th>
                                    <th>last_reviewed_at</th>
                                    <th>absorption_level</th>
                                </tr>
                                <tr>
                                    <td>absorption</td>
                                    <td>吸収</td>
                                    <td>発音: æbléɪʃən</td>
                                    <td>英語</td>
                                    <td>英単語</td>
                                    <td></td>

                                    <td>0-1,1-0</td>
                                    <td></td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td>ablation</td>
                                    <td>除去</td>
                                    <td></td>
                                    <td>英語</td>
                                    <td>英単語</td>
                                    <td></td>

                                    <td>0-1,1-0</td>
                                    <td></td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td>「白ロシア」の意味の国は？</td>
                                    <td>ベラルーシ</td>
                                    <td>[リンク](https://ja.wikipedia.org/wiki/... "リンク")</td>
                                    <td>地理</td>
                                    <td>地名,ヨーロッパ,国名</td>
                                    <td></td>

                                    <td>0-1</td>
                                    <td>2022/11/03 6:45:14</td>
                                    <td>4</td>
                                </tr>
                                <tr>
                                    <td>ハミング窓</td>
                                    <td>コサイン波のような形の窓関数</td>
                                    <td></td>
                                    <td></td>
                                    <td>信号処理,難しい</td>
                                    <td></td>

                                    <td>0-1,1-0</td>
                                    <td></td>
                                    <td></td>
                                </tr>
                            </table>
                        </div>
                    </div>
                    <div class="tsv_example_2_block">
                        <button class="btn btn-link" type="button" data-bs-toggle="collapse" 
                            data-bs-target="#tsv_example_2_collapse" aria-expanded="false" aria-controls="tsv_example_2_collapse">
                                例 2 （カードフィールドが３つの場合）
                        </button>
                        <div id="tsv_example_2_collapse" class="collapse overflow-scroll">
                            <table class="table table-dark text-nowrap my-3">
                                <tr>
                                    <th>cf::{"name":"国名"}</th>
                                    <th>cf:{"name":"首都"}</th>
                                    <th>cf:{"name":"国の説明"}</th>
                                    <th>supplement</th>
                                    <th>project</th>
                                    <th>tags</th>
                                    <th>publicity</th>

                                    <th>qa_set</th>
                                    <th>last_reviewed_at</th>
                                    <th>absorption_level</th>
                                </tr>
                                <tr>
                                    <td>カザフスタン</td>
                                    <td>アスタナ</td>
                                    <td>世界最大のウラン生産国</td>
                                    <td>人口は約1900万人</td>
                                    <td></td>
                                    <td>国名,地名,首都,中央アジア</td>
                                    <td>1</td>

                                    <td>0-1,1-0,2-0</td>
                                    <td></td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td>チュニジア</td>
                                    <td>チュニス</td>
                                    <td>紀元前に「カルタゴ」が繁栄</td>
                                    <td></td>
                                    <td>確率分布</td>
                                    <td>国名,地名,首都,アフリカ</td>
                                    <td>1</td>

                                    <td>0-1,1-0,2-0</td>
                                    <td>2022/2/2 22:22:22,2022/2/22 22:22:22</td>
                                    <td>2,2,2</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                    <div class="tsv_example_3_block">
                        <button class="btn btn-link" type="button" data-bs-toggle="collapse" 
                            data-bs-target="#tsv_example_3_collapse" aria-expanded="false" aria-controls="tsv_example_3_collapse">
                                例 3 （読み上げ言語、公開状態を設定する場合）
                        </button>
                        <div id="tsv_example_3_collapse" class="collapse overflow-scroll">
                            <table class="table table-dark text-nowrap my-3">
                                <tr>
                                    <th>cf:{"name":"英語","ral":"en-US"}</th>
                                    <th>cf:{"name":"日本語"}</th>
                                    <th>supplement</th>
                                    <th>project</th>
                                    <th>tags</th>
                                    <th>publicity</th>

                                    <th>qa_set</th>
                                    <th>last_reviewed_at</th>
                                    <th>absorption_level</th>
                                </tr>
                                <tr>
                                    <td>inane</td>
                                    <td>空虚な</td>
                                    <td>ɪnéɪn</td>
                                    <td>英語</td>
                                    <td>よく出る英単語 第１章</td>
                                    <td>1</td>

                                    <td>0-1,1-0,2-0</td>
                                    <td></td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td>valet</td>
                                    <td>従者</td>
                                    <td>vˈælət</td>
                                    <td>英語</td>
                                    <td>よく出る英単語 第１章</td>
                                    <td>1</td>

                                    <td>0-1,1-0,2-0</td>
                                    <td></td>
                                    <td></td>
                                </tr>
                            </table>
                        </div>
                    </div>
                    <input class="tsv_file_input btn text-primary mt-3 fs-4" type="file" name="tsv_file" accept=".tsv" required />
                </div>
                <div class="modal-footer">
                    <button type="button" class="tsv_modal_ok btn btn-primary">OK</button>
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                </div>
            </div>
        </div>
    </div>
    <!-- loading modal -->
    <div class="modal fade" id="loading_modal_tsv" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false" aria-labelledby="loading_modal_label">
    <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
        <div class="modal-body text-center fs-4">
            <div class="text-secondary">
                <p>処理中です。しばらくお待ち下さい。</p>
                <p><small>この処理には数分かかる場合があります。</small></p>
            </div>
            <div class="spinner-border text-primary" style="width: 3rem; height: 3rem;" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
        </div>
    </div>
    </div>
    `
}


const parse_dsv = (data, sep) => {
    let rows = data.split("\n");
    let head = rows[0].split(sep);
    let res = [];
    for (let i = 1; i < rows.length; i++) {
        let obj = {};
        let row = rows[i].split(sep);
        for (let j = 0; j < head.length; j++) {
            obj[head[j].trim()] = row[j].trim();
        }
        res.push(obj);
    }
    return res;
}


/**
 * tsvファイルのテキストをカードオブジェクトのリストに変換し、
 * バリデーションした上でそのリストを返す。
 * @param {string} tsv_text tsvファイルの中身のテキスト
 * @return {string} card_list バリデーション済みのカードリスト、またはnull
 */
const convert_to_obj_list = (tsv_text)=>{

    const data = parse_dsv(tsv_text, '\t');
    const card_list = [];

    if(data.length > 5000){
        alert(`5000件を超えています。件数：${data.length}`);
        return null;
    }

    for (let i=0; i<data.length;i++){
        let card = {
            card_fields: [],
            qa_set: [],
        }
        let row = data[i];
        for (let k in row){
            let v = row[k];
            if (k.slice(0,3)=='cf:'){
                const cf = {content:v, name:`cf${k}`};
                const cf_attrs = JSON.parse(k.slice(3));
                Object.entries(cf_attrs).forEach(([cf_attr_k, cf_attr_v])=>{
                    if(cf_attr_k=='name'){
                        let val = validate_name(cf_attr_v);
                        if(!val.result){
                            alert(`card field の name の値が不正です。${val.msg} 入力値：${cf_attr_v}`);
                            return null;
                        }
                        cf.name = cf_attr_v;
                    }
                    else if(cf_attr_k=='ral'){
                        let val = validate_lang_code(cf_attr_v);
                        if(!val.result){
                            alert(`card field の lang_code の値が不正です。${val.msg} 入力値：${cf_attr_v}`);
                            return null;
                        }
                        cf.read_aloud_lang = cf_attr_v;
                    }
                })
                card.card_fields.push(cf)
            }
        }

        let ncf = card.card_fields.length;
        if (ncf < 2 || ncf > 5){
            alert(`カードフィールド数は2以上5以下にしてください。`);
            return null;
        }

        // supplement
        card.supplement_content = row.supplement;
        
        // project
        if(row.project){
            let val = validate_name(row.project);
            if(!val.result){
                alert(`${i+1}番目のデータのprojectの値が不正です。${val.msg} 入力値：${row.project}`);
                return null;
            }
            card.project_name = row.project;
        }
        
        // tags
        let tags = row.tags ? row.tags.split(',') : [];
        for(let ti=0;ti<tags.length;ti++){
            let val = validate_name(tags[ti])
            if(!val.result){
                console.log(tags[ti])
                alert(`${i+1}番目のデータのtagsの値が不正です。${val.msg} 入力値：${tags[ti]}`);
                return null;
            }
        }
        card.tag_names = tags;

        // publicity
        if(row.publicity){
            let pb = parseInt(row.publicity)
            if(isNaN(pb) || pb < 0 || pb > 1){
                alert(`${i+1}番目のデータのpublicityの値が不正です。0または1の整数で入力してください。入力値：${row.publicity}`);
                return null;
            }
            card.publicity = pb;
        }

        // qa_set
        let qiais = row.qa_set && row.qa_set.split(',');
        let last_reviewed_ats = row.last_reviewed_at && row.last_reviewed_at.split(',');
        let absorption_levels = row.absorption_level && row.absorption_level.split(',');
        
        if(!qiais){
            alert(`${i+1}番目のデータのqa_setが指定されていません。`);
            return null;
        }
        if(last_reviewed_ats && last_reviewed_ats.length != qiais.length){
            alert(`${i+1}番目のデータのlast_reviewed_atの要素数がqa_setと異なります。","の数を確認してください。`);
            return null;
        }
        if(absorption_levels && absorption_levels.length != qiais.length){
            alert(`${i+1}番目のデータのabsorption_levelの要素数がqa_setと異なります。","の数を確認してください。`);
            return null;
        }

        for(let m=0; m < qiais.length ; m++){
            const qa = {
                user_rm: {},
            };

            let qi = parseInt(qiais[m].slice(0,1));
            let ai = parseInt(qiais[m].slice(2,3));
            let last_reviewed_at = last_reviewed_ats[m];
            let absorption_level = absorption_levels[m];

            if(isNaN(qi) || 0 > qi || qi >= ncf){
                alert(`${i+1}番目のデータのqa_setの値が不正です。問題フィールドインデックスは0以上、フィールド数（${ncf}）未満の整数にしてください。入力値：${qi}`);
                return null;
            }
            if(isNaN(ai) || 0 > ai || ai >= ncf){
                alert(`${i+1}番目のデータのqa_setの値が不正です。解答フィールドインデックスは0以上、フィールド数（${ncf}）未満の整数にしてください。入力値：${ai}`);
                return null;
            }
            if(ai==qi){
                alert(`${i+1}番目のデータのqa_setの値が不正です。1 枚の復習管理の問題および解答には異なるフィールドインデックスを指定してください。入力値：${qi}-${ai}`);
                return null;
            }
            qa.qi = qi
            qa.ai = ai

            if(last_reviewed_at){
                let lra = new Date(last_reviewed_at);
                if(isNaN(lra.getTime())){
                    alert(`${i+1}番目のデータのlast_reviewed_atの値が不正です。日時として解釈できません。入力値：${lra}`);
                    return null;
                }
                if(lra > new Date()){
                    alert(`${i+1}番目のデータのlast_reviewed_atの値が不正です。最終復習日時が未来の値です。入力値：${lra}`);
                    return null;
                }
                qa.user_rm.last_reviewed_at = lra.toISOString();
            }
            
            if(absorption_level){
                let al = parseInt(absorption_level);
                if(isNaN(al) || al < 0 || al > 12){
                    alert(`${i+1}番目のデータのabsorption_levelの値が不正です。0以上12以下の整数で入力してください。入力値：${cell_text}`);
                    return null;
                }
                qa.user_rm.absorption_level = al;
            }
            card.qa_set.push(qa);
        }
        card_list.push(card);
    }
    
    return card_list;
}

const show_tsv_modal = (process_after_result=null,)=>{
    if(!process_after_result) process_after_result = ()=>{};

    $('#tsv_modal').modal('show');
    $('#tsv_modal .tsv_modal_ok').off('click');
    $('#tsv_modal .tsv_modal_ok').on('click', ()=>{

        let files = $('#tsv_modal .tsv_file_input').prop('files');
        console.log(files.length)
        for(let i = 0; i < files.length;i++){

            let reader = new FileReader();

            reader.readAsText(files[i]);

            reader.onload = (e)=> {
                let tsv_text = e.target.result
                let obj_list = convert_to_obj_list(tsv_text);
                if(obj_list){
                    // 成功
                    let res = confirm(`${obj_list.length}枚のカードを追加します。よろしいですか？`);
                    if(res){
                        console.log("obj_list", obj_list)

                        const url_path = '/api/add_cards_from_tsv';
                        const url_queries = {};
                        const data = obj_list;

                        // tsvモーダルを隠す
                        $('#tsv_modal').modal('hide');

                        // ローディングモーダルを表示
                        $("#loading_modal_tsv").modal('show');

                         // ajax通信
                        $.ajax({
                            type: "POST",
                            url: get_url_from_path_and_queries(url_path, url_queries),
                            data: JSON.stringify(data),
                            // beforeSend: function( xhr, settings ) { xhr.setRequestHeader( 'Authorization', `Bearer ${token}`); },
                        })
                        .done((data)=> {
                            //　成功時

                            // 早すぎると反応しないので遅延実行
                            setTimeout(()=>{
                                // ローディングモーダルを隠す
                                $("#loading_modal_tsv").modal('hide');

                                // 処理結果通知アラートを表示
                                alert("作成に成功しました。");
                            }, 1000);

                            process_after_result();
                            
                        })
                        .fail((error)=>{
                            //　失敗時

                            // 早すぎると反応しないので遅延実行
                            setTimeout(()=>{
                                // ローディングモーダルを隠す
                                $("#loading_modal_tsv").modal('hide');

                                // 処理結果通知アラートを表示
                                alert("サーバでの処理に失敗しました。");
                            }, 1000);

                            

                            console.log(error);

                            $('#tsv_modal').modal('hide');

                            process_after_result();

                        });

                    }
                }else{
                    // 失敗
                    alert("処理に失敗しました。");

                    // スピナーモーダルを閉じる
                    $("#loading_modal").modal('hide');
                }
            };
            reader.onerror = ()=> {
                alert(`以下のファイルが読み取れません。ファイル名：${files[i].name}`);
            };
        }
        $('#tsv_modal .tsv_modal_ok').off()
    })
}