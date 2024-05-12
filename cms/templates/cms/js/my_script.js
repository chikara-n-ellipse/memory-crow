
const get_parent = (item)=>{
    if(item.path_like_objects_safe.length > 1){
        return item.path_like_objects_safe[0];
    }else{
        return null;
    }
}

const get_path_html_from_objects = (path_like_objects)=>{
    return path_like_objects.map(obj=>`
            <span class='text-nowrap'>/<a href='/cms/show_project/${obj.id}?next=${encodeURIComponent(location)}'>${obj.name}</a></span>
        `).join('');
}


var show_answer = (qa_id)=>{

    const qa = qa_set_displayed.find(qa=>qa.id==qa_id);

    $(`#qa_box_${qa_id} .md_to_html_target_answer_field`).show();
    $(`#qa_box_${qa_id} .show_answer_button`).hide();

    $(`#answer_box_${qa_id}`).removeClass("masked");
    $(`#answer_box_${qa_id} .masked_answer_p`).attr("hidden", true);
    $(`#supplement_box_${qa_id}`).attr("hidden", false);
    $(`#button_box_${qa_id}`).attr("hidden", false);

    window.speechSynthesis.cancel();

    const $aras = $("#auto_read_aloud_switch");

    if(qa && $aras.length && $aras.get(0).checked){

        let arafns = get_arafns_from_url();

        if(arafns.includes(qa.answer_field.order_in_card)){
            $(`#md_field_wrapper_md_to_html_target_${qa.id}_answer_field .read_aloud_button`).click();
        }
    }
}




const remove_qa_box_from_display_directly = (qa_id)=>{
    // 復習管理ボックスを削除
    $(`#qa_box_${qa_id}`).remove();

    // グローバル変数に変更を反映
    const i_qa = qa_set_displayed.findIndex(qa=>qa.id==qa_id)
    if(i_qa<0)return;
    const qa = qa_set_displayed.splice(i_qa, 1)[0];
    return [qa, i_qa];
}

const remove_qa_box_from_hidden = (qa_id)=>{
    // 復習管理ボックスを削除
    $(`#qa_box_${qa_id}`).remove()

    // グローバル変数に変更を反映
    const i_qa = qa_set_hidden.findIndex(qa=>qa.id==qa_id);
    if(i_qa<0)return;
    const qa = qa_set_hidden.splice(i_qa, 1)[0];
    return [qa, i_qa];
}


const hide_qa_box = (qa_id)=>{
    // 復習管理ボックスを非表示に
    $(`#qa_box_${qa_id}`).hide(100);

    // グローバル変数に変更を反映
    const i_qa = qa_set_displayed.findIndex(qa=>qa.id==qa_id)
    if(i_qa<0)return;
    const qa = qa_set_displayed.splice(i_qa, 1)[0];
    qa_set_hidden.push(qa);
    return [qa, i_qa];
}


const show_rm_box_again_on_error = (qa_id)=>{
    //　失敗時は赤くして再表示
    $(`#qa_box_${qa_id}`).show();
    $(`#qa_box_${qa_id}`).css("background", "red");

    // グローバル変数に変更を反映
    const i_qa = qa_set_hidden.findIndex(qa=>qa.id==qa_id)
    if(i_qa<0)return;
    const qa = qa_set_hidden.splice(i_qa, 1)[0];
    qa_set_displayed.shift(qa);
    return qa, i_qa;
}

const apply_jd_settings = ()=>{
    
    const _wait_durations = [];
    let is_valid = true;
    $('.wait_durations_input').each((i,e)=>{
        const v = $(e).val();
        if(!v)return;
        const m = parseInt(v);

        // wait durationsのバリデーション
        if (isNaN(m)){
            alert(`wait durations に整数でない値があります。入力：${v}`);
            is_valid = false;
        }
        if(m < 1 || m > 1440){
            alert(`wait durations に不正な範囲の値があります。入力：${m}`);
            is_valid = false;
        }
        _wait_durations.push(m);
    })
    if(!_wait_durations.length){
        alert(`wait durations には少なくとも一つの値を入力してください。`);
        is_valid = false;
    }

    const _arafn_list = $("#auto_read_aloud_field_nums_select").val().map(i=>parseInt(i));

    if(is_valid){
        const url = new URL(location);
        url.searchParams.set("wait_durations", _wait_durations.join('-'));
        url.searchParams.set("auto_read_aloud_field_nums", _arafn_list.join('-'))
        window.history.pushState(null, null, url.href);

        return true;
    }
}


var on_judge = (qa_id, judge_type)=>{
    
    const [qa, i_qa] = hide_qa_box(qa_id);

    const previous_last_reviewed_at = qa.user_rm.last_reviewed_at;

    const wait_durations = get_wait_durations_from_url();

    // ajax通信
    $.ajax({
        type: 'POST',
        url: `/api/judge`,
        data: JSON.stringify({
            judges:[{
                rm_id: qa.user_rm.id,
                judge_type: judge_type,
                last_reviewed_at: new Date().toISOString(),
                previous_last_reviewed_at: previous_last_reviewed_at,
            }],
            wait_durations: wait_durations,
        }),
        // dataType: 'json', //データをjson形式で飛ばす
        // contentType: "application/json",
        // beforeSend: function( xhr, settings ) { xhr.setRequestHeader( 'Authorization', `Bearer ${token}`); },
    })
    .done((data)=> {
        setTimeout(()=>{
            remove_qa_box_from_hidden(qa_id);
        }, 1000);
    })
    .fail((error)=>{
        show_rm_box_again_on_error(qa_id);
    })

    // judge_type=ng の復習管理は自動再取得
    const al = qa.absorption_level;
    const il = qa.ingestion_level;
    if (judge_type === 'ng'){
        setTimeout(()=>{
            if(!qa_set_displayed.some(c=>c.id==qa.id)){
                load_qa_set({qa_ids:[qa.id]});
            }
        }, wait_durations[0] * 60 * 1000);
    } else if (judge_type === 'ok' && al <= 0 ){
        const il_next = il<=0 ? 2 : il+1;
        if(il_next-1 < wait_durations.length){
            setTimeout(()=>{
                if(!qa_set_displayed.some(c=>c.id==qa.id)){
                    load_qa_set({qa_ids:[qa.id]});
                }
            }, wait_durations[il_next-1] * 60 * 1000);
        }
    }

    // 設定取得数の半数を下回ると自動再取得
    if (qa_set_displayed.length < rc_filters.limit/2){
        load_qa_set();
    }

    update_estimated_remaining_num_label();

    window.speechSynthesis.cancel();

    const next_qa = qa_set_displayed[i_qa];
    activate_qa_box(next_qa);
    
}


const activate_qa_box = (qa=null)=>{
    // 既にアクティブ復習管理に指定済み
    if(!qa && !active_qa_id || qa && qa.id===active_qa_id)return;

    $(".qa_box").removeClass("active border border-primary");
    active_qa_id = null;
    window.speechSynthesis.cancel();

    if(qa){
        const $active_qab = $(`#qa_box_${qa.id}`);
        $active_qab.addClass("active border border-primary");
        active_qa_id = qa.id;
        const $aras = $("#auto_read_aloud_switch");
        if($aras.length && $aras.get(0).checked){

            let arafns = get_arafns_from_url();
            
            if(arafns.includes(qa.question_field.order_in_card)){
                $(`#md_field_wrapper_md_to_html_target_${qa.id}_question_field .read_aloud_button`).click();
            }
            if(!$active_qab.find(".md_to_html_target_answer_field").is(':hidden')){
                if(arafns.includes(qa.answer_field.order_in_card)){
                    $(`#md_field_wrapper_md_to_html_target_${qa.id}_answer_field .read_aloud_button`).click();
                }
            }
        }

        $("#fadeLayer").show()
    }
}




const get_local_qa_ids = ()=>{
    return $(".qa_box").get().map(cb=>cb.id.slice("qa_box_".length));
}


const apply_learn_conf = ()=>{
    // 設定フォーム -> 設定ラベル

    // 設定切り替え（ページ遷移）用フィルター
    let filters = {
        // フィルター一般の設定項目
        limit: $('.lc_limit').val(),
        project: $('.lc_project').val(),
        with_project_descendants: $('.lc_with_project_descendants').prop('checked'),
        tags: $('.lc_tags').val(),
        with_tag_descendants: $('.lc_with_tag_descendants').prop('checked'),
  
        // 学習時特有の設定項目
        importance_gte: $('.lc_importance_gte').val(),
        activeness: $('.lc_activeness').val(),
        random: bool = $('.lc_random').prop('checked'),
        urgency_gte: $('.lc_urgency_gte').val(),
        deprms_al_gte: $('.lc_deprms_al_gte').val(),
        new_hot_warm: $('.lc_new_hot_warm').val(),
    };

    const url_path = '/cms/learn';
    const url_queries = {...filters};

    if (!url_queries.project) delete url_queries.project;
    if (!url_queries.tags) delete url_queries.tags;

    // const next_url = new URL(get_url_from_path_and_queries(url_path, url_queries))
    const next_url = new URL(location);

    Object.entries(url_queries).map(([k,v])=>{
        if(v instanceof Array){
            next_url.searchParams.delete(k);
            v.forEach(vv=>next_url.searchParams.append(k, vv));
        }
        else{
            next_url.searchParams.set(k, v);
        }
    })

    if (!url_queries.project)next_url.searchParams.delete('project');

    location = next_url.href;
}


const create_qa_box = (qa, rm, card, container_id, options={})=>{
    options = {
        prevent_judge: false,
        no_activation: false,
        additional_class: '',
        ...options,
    }

    let level_text = "";
    let level_class = "";
    
    if(rm){
        if(rm.absorption_level == 0){
            if(rm.ingestion_level==0){
                level_text = "新規";
                level_class = "new_rm";
            }else{
                level_text = "Hot";
                level_class = "hot_rm";
            }
        }else{
            level_text = `level: ${rm.absorption_level}`;
            if(rm.absorption_level < 4){
                level_class = "green_rm";
            }else if(rm.absorption_level < 7){
                level_class = "violet_rm";
            }else{
                level_class = "brown_rm";
            }
        }
    }
    
    let qa_max_width = "27rem";
    
    const mdfield_html_pf = get_mdfield_html_in_grid(
        qa.question_field.content,
        qa.question_field.name,
        qa.question_field.read_aloud_lang,
        `md_to_html_target_${qa.id}_question_field`,
        ['md_to_html_target', `md_to_html_target_${qa.id}`, 'md_to_html_target_question_field'],
        text_color=null,
        border_color=qa.question_field.oic_color,
        with_show_answer_button=false,
        transparent_header=true
      )
    
    const mdfield_html_af = get_mdfield_html_in_grid(
        qa.answer_field.content,
        qa.answer_field.name,
        qa.answer_field.read_aloud_lang,
        `md_to_html_target_${qa.id}_answer_field`,
        ['md_to_html_target', `md_to_html_target_${qa.id}`, 'md_to_html_target_answer_field'],
        text_color='orange',
        border_color=qa.answer_field.oic_color,
        with_show_answer_button=true,
        transparent_header=true
    )
    

    const mdfield_html_sp = qa.card.supplement_content.length ? get_mdfield_html_in_grid(
        qa.card.supplement_content,
        '補足',
        '',
        `md_to_html_target_${qa.id}_supplement_content`,
        ['md_to_html_target', `md_to_html_target_${qa.id}`, 'md_to_html_target_supplement_content', 'text-muted'],
        text_color=null,
        border_color=null,
        with_show_answer_button=false,
        transparent_header=true
    ) : '';

    const detail_content_html = `
        <a href='/cms/show_card/${card.id}?next=${encodeURIComponent(location)}' class="">
            カード: ${card.shortened_id}
        </a>
        ${
            rm ? `
                <ul>
                    <li>復習管理ID: 
                        <a href='/cms/show_rm/${rm.id}?next=${encodeURIComponent(location)}' class="">
                            ${rm.id}
                        </a>
                    </li>
                    <li>要セッション指定: ${rm.need_session?'要セッション':'隙間時間'}</li>
                    <li>活動状態: ${rm.is_active?'活動中':'凍結中'}</li>
                    <li>上限復習間隔: ${rm.ul_review_interval}</li>
                    <li>摂取レベル: ${rm.ingestion_level}</li>
                    <li>定着レベル: ${rm.absorption_level}</li>
                    <li>間隔増加率: ${rm.interval_increase_rate}</li>
                    <li>実際復習間隔: ${rm.actual_review_interval}</li>
                    <li>最終復習日時: ${rm.last_reviewed_at&&new Date(rm.last_reviewed_at).toLocaleString()}</li>
                    <li>重要度: ${rm.importance}</li>
                    <li>予想所要時間: ${rm.estimated_time}</li>
                    <li>最高定着レベル: ${rm.highest_absorption_level}</li>
                    <li>最終更新日時: ${rm.last_updated_at}</li>
                    <li>復習管理作成日時: ${rm.created_at&&new Date(rm.created_at).toLocaleString()}</li>
                    <li>標準復習間隔: ${rm.standard_review_interval}</li>
                    <li>次回復習日: ${rm.next_review_date&&new Date(rm.next_review_date).toLocaleDateString()}</li>
                    <li>延期先日時: ${rm.postpone_to&&new Date(rm.postpone_to).toLocaleString()}</li>
                    <li>緊急度: ${rm.urgency}</li>
                </ul>
                ${get_rm_buttons_html(rm, qa, card, container_id, on_delete_name='reload_qa_box_area')}
            ` : ''
        }
    `
    
    let qabox_elem = $(`
        <div id="qa_box_${qa.id}" class="qa_box card text-muted p-3 ${options.additional_class}" style="max-width: ${qa_max_width};">
            <div id="qa_header_${qa.id}" class="qa_header card-header text-muted">
                <small class="level_span me-2 ${level_class}">${level_text}</small>
                <span class="project_span">${qa.card.project_safe ? get_project_badge_html(qa.card.project_safe):''}</span>
                <span class="tags_span">${qa.card.tags_safe.map(tag=>get_tag_badge_html(tag)).join("")}</span>
                <span class="card_user_span">${qa.card.user.id!=request_user.id ? get_user_badge_html(qa.card.user): ''}</span>
            </div>
            ${mdfield_html_pf}
            ${mdfield_html_af}
            <div id="qa_control_${qa.id}" class="qa_control">
                <div id="supplement_box_${qa.id}" hidden class="supplement_box">
                ${mdfield_html_sp}
                </div>
                ${ !options.prevent_judge ? `
                    <div id="button_box_${qa.id}" hidden class="button_box mt-5">
                        <button id="others_button_${qa.id}" type="button" class="others_button btn btn-outline-secondary dropdown-toggle mx-1 w-100" 
                            data-bs-toggle="dropdown" aria-expanded="false">
                            <span class="">others</span>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-dark">
                            <li>
                                <button id="skip_5m_button_${qa.id}" class="skip_5m_button dropdown-item no_activate">
                                    skip 5 min
                                </button>
                            </li>
                            <li>
                                <button id="skip_1h_button_${qa.id}" class="skip_1h_button dropdown-item no_activate">
                                    skip 1 hour
                                </button>
                            </li>
                            <li>
                                <button id="skip_to_tomorrow_button_${qa.id}" class="skip_to_tomorrow_button dropdown-item no_activate text-primary">
                                    skip to tomorrow (s)
                                </button>
                            </li>
                            <li>
                                <button id="skip_1w_button_${qa.id}" class="skip_1w_button dropdown-item no_activate">
                                    skip 1 week (w)
                                </button>
                            </li>
                            <li>
                                <button id="frozen_button_${qa.id}" class="frozen_button dropdown-item no_activate">
                                    frozen (f)
                                </button>
                            </li>
                        </ul>
                        <button id="ng_button_${qa.id}" class="ng_button btn btn-outline-danger mx-1 w-100 no_activate"
                            data-bs-toggle="tooltip" data-bs-placement="bottom" title="ng (n)" >
                            ng
                        </button>
                        <button id="ok_button_${qa.id}" class="ok_button btn btn-outline-success mx-1 w-100 no_activate"
                            data-bs-toggle="tooltip" data-bs-placement="bottom" title="ok (o)" >
                            ok
                        </button>
                    </div>
                ` : ''}
                <div>
                    <button class="btn btn-sm text-muted mt-2" data-bs-toggle="collapse" data-bs-target="#detail_collapse_${qa.id}" 
                        aria-expanded="false" aria-controls="collapseExample">
                        詳細
                    </button>
                    <div class="collapse" id="detail_collapse_${qa.id}">
                        ${detail_content_html}
                    </div>
                </div>
            </div>
        </div>
    `)
    qabox_elem.on("click", (e)=>{
        if(!options.no_activation && !$(e.target).closest('.no_activate').length){
            activate_qa_box(qa);
        }
        // e.stopPropagation();
    });
    qabox_elem.find(`.show_answer_button`).on("click", ()=>show_answer(qa.id));
    qabox_elem.find(`#ok_button_${qa.id}`).on("click", ()=>on_judge(qa.id, "ok"));
    qabox_elem.find(`#ng_button_${qa.id}`).on("click", ()=>on_judge(qa.id, "ng"));
    qabox_elem.find(`#skip_5m_button_${qa.id}`).on("click", ()=>on_judge(qa.id, "skip_5m"));
    qabox_elem.find(`#skip_1h_button_${qa.id}`).on("click", ()=>on_judge(qa.id, "skip_1h"));
    qabox_elem.find(`#skip_to_tomorrow_button_${qa.id}`).on("click", ()=>on_judge(qa.id, "skip_to_tomorrow"));
    qabox_elem.find(`#skip_1w_button_${qa.id}`).on("click", ()=>on_judge(qa.id, "skip_1w"));
    qabox_elem.find(`#frozen_button_${qa.id}`).on("click", ()=>on_judge(qa.id, "frozen"));

    qabox_elem.find(`.md_to_html_target_answer_field`).hide();
    
    return qabox_elem;
}


const reload = ()=>{
    window.location.reload();
}


const reload_qa_box_area = ()=>{
    $('.qa_box').remove();
    qa_set_displayed.splice(0);
    qa_set_hidden.splice(0);
    $('.btn_read_qa').click();
}



var init_project_select = (dropdown_parent=null,  multiple=false, addtional_filters=null)=>{
    const $project_select = $('.project_select');

    // プロジェクト追加ページへのリンク
    const a = $(`
        <div class="d-flex flex-row-reverse mt-1">
            <a target='_blank' href='/cms/add_project/?next=/cms/close_window' class="" style='text-decoration:none;'>
                <i class="bi bi-plus-lg me-2"></i>プロジェクト
            </a>
        </div>`
    );

    $project_select.after(a);

    const url_path = '/api/get_projects';
    const url_queries = {
        limit:10, 
        order_by:['user_plm_is_active', 'user_plm_star'], 
        order_dir:['desc', 'desc'],
        ...addtional_filters,
    };

    const select2_conf = {
        placeholder: '選択してください',
        allowClear: true,
        dropdownParent: dropdown_parent,
        multiple: multiple,
        ajax: {
          url: get_url_from_path_and_queries(url_path, url_queries),
          dataType: 'json',
          delay: 200,
          data: function (params) {
            return {
              term: params.term, // search term
              offset: url_queries.limit * ((params.page || 1 ) - 1 ) 
            };
          },
          processResults: function (data, params) {
            params.page = params.page || 1;
            return {
              results: data.results.map(project=>{return {
                    id: project.id,
                    text: `<div class="m-1">${get_project_badge_html(project, disabled=true)}</div>`,
                    html: `<div>${get_project_badge_html(project, disabled=true)}</div>
                        <div><small class="text-muted">${project.path_like_objects_safe.map(_project=>'/'+_project.name).join('')}</small></div>`,
                    title: project.name,
                }}),
              pagination: {
                more: (params.page * url_queries.limit) < data.total_count
              }
            };
          },
          cache: true,
        //   beforeSend: ( xhr, settings ) => { xhr.setRequestHeader( 'Authorization', `Bearer ${token}`); },
        },
        escapeMarkup: function(markup) {
            return markup;
        },
        templateResult: function(data) {
            return data.html;
        },
        templateSelection: function(data) {
            return data.text;
        },
        formatResult: function(item) {
            return $(item.element).html();
        },
        formatSelection: item=>$(item.element).html(),
        tokenSeparators: [',', '']
    }

    return $project_select.select2(select2_conf);
}


var init_tag_select = (dropdown_parent=null, multiple=false, addtional_filters=null)=>{
    const $tag_select = $('.tag_select');

    // タグ追加ページへのリンク
    const a = $(
    `<div class="d-flex flex-row-reverse mt-1">
        <a target='_blank' href='/cms/add_tag/?next=/cms/close_window' class="mx-2" style='text-decoration:none;'>
            <i class="bi bi-plus-lg me-2"></i>タグ
        </a>
    </div>`
    );
    
    $tag_select.after(a);
    
    const url_path = '/api/get_tags';
    const url_queries = {
        limit:10, 
        order_by:['star'], 
        order_dir:['desc'], 
        ...addtional_filters
    };

    return $tag_select.select2({
        placeholder: '選択してください',
        allowClear: true,
        dropdownParent: dropdown_parent,
        multiple: multiple,
        ajax: {
          url: get_url_from_path_and_queries(url_path, url_queries),
          dataType: 'json',
          delay: 200,
          data: function (params) {
            return {
              term: params.term, // search term
              offset: url_queries.limit * ((params.page || 1 ) - 1 ) 
            };
          },
          processResults: function (data, params) {
            params.page = params.page || 1;
            return {
              results: data.results.map(tag=>{return {
                    id: tag.id,
                    text: `${multiple ?'':`<div class="m-1">`}${get_tag_badge_html(tag, disabled=true)}${multiple ?'':`</div>`}`,
                    html: `<div>${get_tag_badge_html(tag, disabled=true)}</div>
                        <div><small class="text-muted>${tag.path_like_objects_safe.map(_tag=>'/'+_tag.name).join('')}</small></div>`,
                    title: tag.name,
                }}),
              pagination: {
                more: (params.page * url_queries.limit) < data.total_count
              }
            };
          },
          cache: true,
          // beforeSend: function( xhr, settings ) { xhr.setRequestHeader( 'Authorization', `Bearer ${token}`); },
        },
        escapeMarkup: function(markup) {
            return markup;
        },
        templateResult: function(data) {
            return data.html;
        },
        templateSelection: function(data) {
            return data.text;
        },
    });
}


var init_card_select = (dropdown_parent=null, multiple=false, addtional_filters=null)=>{
    const $card_select = $('.card_select');

    // プロジェクト追加ページへのリンク
    const a = $(`
        <div class="d-flex flex-row-reverse mt-1">
            <a target='_blank' href='/cms/add_card/?next=/cms/close_window' class="" style='text-decoration:none;'>
                <i class="bi bi-plus-lg me-2"></i>プロジェクト
            </a>
        </div>`
    );

    $card_select.after(a);

    const url_path = '/api/get_cards';
    const url_queries = {limit:10, ...addtional_filters};

    const select2_conf = {
        placeholder: '選択してください',
        allowClear: true,
        dropdownParent: dropdown_parent,
        multiple: multiple,
        ajax: {
          url: get_url_from_path_and_queries(url_path, url_queries),
          dataType: 'json',
          delay: 200,
          data: function (params) {
            return {
              term: params.term, // search term
              offset: url_queries.limit * ((params.page || 1 ) - 1 ) 
            };
          },
          processResults: function (data, params) {
            params.page = params.page || 1;
            return {
              results: data.results.map(card=>{return {
                    id: card.id,
                    text: `<div class="m-1">${card.shortened_id}:${get_escaped_text(card.card_fields[0].content)}</div>`,
                    html: `<div class="m-1">${card.shortened_id}:${get_escaped_text(card.card_fields[0].content)}</div>
                        <div><small class="text-muted">${get_escaped_text(card.card_fields[0].content)}</small></div>`,
                    title: card.id,
                }}),
              pagination: {
                more: (params.page * url_queries.limit) < data.total_count
              }
            };
          },
          cache: true,
        //   beforeSend: ( xhr, settings ) => { xhr.setRequestHeader( 'Authorization', `Bearer ${token}`); },
        },
        escapeMarkup: function(markup) {
            return markup;
        },
        templateResult: function(data) {
            return data.html;
        },
        templateSelection: function(data) {
            return data.text;
        },
        formatResult: function(item) {
            return $(item.element).html();
        },
        formatSelection: item=>$(item.element).html(),
        tokenSeparators: [',', '']
    }

    return $card_select.select2(select2_conf);
}


const init_rm_select = (dropdown_parent=null, multiple=false, )=>{
    const $rm_select = $('.rm_select');

    // カード追加ページへのリンク
    const a = $(`<div class="d-flex flex-row-reverse mt-1"><a target='_blank' href='/cms/add_rm/?next=/cms/close_window/' class="mx-2" style='text-decoration:none;'><i class="bi bi-plus-lg me-2"></i>タグ</a></div>`);
    
    $rm_select.after(a);

    const url_path = '/api/get_rm_set';
    const url_queries = {limit:10};

    return $rm_select.select2({
        placeholder: '選択してください',
        allowClear: true,
        dropdownParent: dropdown_parent,
        multiple: multiple,
        ajax: {
            url: get_url_from_path_and_queries(url_path, url_queries),
            dataType: 'json',
            delay: 200,
            data: function (params) {
              return {
                term: params.term, // search term
                offset: url_queries.limit * ((params.page || 1 ) - 1 ) 
              };
            },
            processResults: function (data, params) {
              params.page = params.page || 1;
              return {
                results: data.results.map(rm=>{
                    const text = `${rm.id.slice(0,4)}... : ${rm.qa.question_field.content} -> ${rm.qa.answer_field.content}`
                    return {id:rm.id, text:text}
                }),
                pagination: {
                  more: (params.page * url_queries.limit) < data.total_count
                }
              };
            },
            cache: true,
            // beforeSend: function( xhr, settings ) { xhr.setRequestHeader( 'Authorization', `Bearer ${token}`); },
        },
    });
}



// 一覧表示ページ関連


// 表示設定スイッチの設定
const apply_markdown_config = (mode, target_selector=".md_to_html_target")=>{

    let $md_to_html_targets = $(target_selector)
    if(mode=="preview"){
        
        // 説明の列のマークダウンを適用
        $md_to_html_targets.get().map(tar=>{
            // バックアップ要素を作成
            let $tar = $(tar);
            let $t_areas = $tar.children('.md_to_html_textarea')
            if(!$t_areas.length)return;
            let $bu = $t_areas.first().clone()
                .removeClass("md_to_html_textarea")
                .addClass("_md_to_html_textarea")
            $tar.after($bu);
            $bu.hide()
            
            // マークダウンをHTMLに変換
            // https://github.com/pandao/editor.md
            var after_text = editormd.markdownToHTML(tar.id, {
                toc             : true,
                tocTitle        : "TOC",
                emoji           : true,
                taskList        : true,
                tex             : true,
                autoFocus       : false,
                theme           : "dark",
                previewTheme : "dark",
                // onload : function() {
                //     // This will be executed after the markdown is rendered
                //     $("#"+tar.id).find("a").each(function() {
                //         $(this).attr("target", "_blank");
                //     });
                //     console.log("tar.id: "+tar.id);
                // }
            });
            // after_text.onload = function() {
            //     // This will be executed after the markdown is rendered
            //     $("#"+tar.id).find("a").each(function() {
            //         $(this).attr("target", "_blank");
            //     });
            //     console.log("tar.id: "+tar.id);
            // }

            // setTimeoutを使って処理を遅らせる
            setTimeout(function() {
                // This will be executed after the markdown is rendered
                $("#"+tar.id).find("a").each(function() {
                    $(this).attr("target", "_blank");
                });
            }, 500);  // 500ミリ秒（0.5秒）遅延させる
        })
    }else if(mode=="source"){
        // マークダウンを消すためにグリッドテーブルを更新
        //   grid.forceRender();
        $md_to_html_targets.get().map(tar=>{
            // バックアップから復元
            let $tar = $(tar);
            $tar.removeClass("markdown-body editormd-html-preview");
            let $t_areas = $tar.parent().children('._md_to_html_textarea');
            if(!$t_areas.length)return;
            let $bu = $t_areas.first();
            let $restored = $bu.clone()
                .removeClass("_md_to_html_textarea")
                .addClass("md_to_html_textarea").show()
            
            // 中身を空にしてから、復元した要素を追加
            $tar.empty()
            $tar.append($restored)

            // バックアップを削除
            $bu.remove();
        })
    }
}

const read_aloud = (text, lang)=>{
    if ('speechSynthesis' in window) {
        // let text = qa.question_field.content;
        const uttr = new SpeechSynthesisUtterance();
        uttr.text = text.replace(/https?:\/\/\S*/g, "");
        uttr.lang = lang;
       
        // uttr.lang = "ja-JP";
        // uttr.lang = "en-US";
        
        // 再生
        window.speechSynthesis.speak(uttr);
    } else {
        alert('このブラウザは音声合成に対応していません。')
    }
}


const get_read_aloud_text = (selector)=>{
    return $(`${selector} textarea`).text();
}

const get_markdown_config_button_html = (title=false, target_selector=".md_to_html_target",transparent_header=false)=>{
    return `
    <!-- マークダウン表示設定変更ボタン -->
    <div class="markdown_config_button_box align-items-center justify-content-start">
      ${title?'<i class="bi bi-eye"></i>':''}
      <div class="btn-group ms-1">
        <button class="btn btn-link btn-sm md_preview_button" 
            onclick="apply_markdown_config('preview', '${target_selector}')">
        <i class="bi bi-eye" style="${transparent_header?'color:transparent;':''}"></i>
        </button>
        <button class="btn btn-link btn-sm md_source_button" 
            onclick="apply_markdown_config('source', '${target_selector}')">
            <i class="bi bi-filetype-md" style="${transparent_header?'color:transparent;':''}"></i>
        </button>
      </div>
    </div>
    `
}


const get_mdfield_html_in_grid = (content, name, read_aloud_lang, target_id, target_classes, 
            text_color=null, border_color=null, with_show_answer_button=false, transparent_header=false,
        )=> {

    text_color_style = text_color ? `color: ${text_color} !important;` : '';
    border_color_style = border_color ? `border-left-color: ${border_color} !important;` : '';
    
    const buttons = get_markdown_config_button_html(
        title=false, 
        target_selector=`#${target_id}`,
        transparent_header=transparent_header,
    )

    let show_answer_button = '';

    if(with_show_answer_button){
        show_answer_button = `
            <button class='show_answer_button btn rounded-0 border-start border-2' style='border-left-color: ${border_color} !important;'
                data-bs-toggle="tooltip" data-bs-placement="bottom" title="(Enter)" >
                    解答を表示 (Enter)
            </button>
        `
    }

    const read_aloud_text = `get_read_aloud_text('#md_field_wrapper_${target_id}')`;

    return `
  <div id="md_field_wrapper_${target_id}" class='md_field_wrapper my-2' style='width: 100%;'>
    <div class='d-flex align-items-center' >
        <small style="color:${border_color};">${name}</small>
        <span class="content_length_span ms-3" style="color:${transparent_header?'transparent':'gray'};">
            ${content.length}
        </span>
        ${buttons}
        <button class="read_aloud_button btn btn-link ms-auto" 
            onclick="read_aloud(${read_aloud_text}, '${read_aloud_lang}')">
            <i class="bi bi-megaphone"></i>
        </button>
    </div>
    <div>
        <div id='${target_id}' class="${target_classes.join(" ")} md_field_div text-light me-2" 
            style="width:100%;min-width:15rem;border-style:solid;border-color:#202020;${border_color_style}${text_color_style}">
            <textarea class="md_to_html_textarea" style="width:100%;min-width:15rem;margin-bottom:-5px;background:gray;" 
                readonly>${get_escaped_text(content)}
            </textarea>
        </div>
        ${show_answer_button}
    </div>
  </div>
`
}

const get_project_badge_html = (project, disabled=false)=>{
    let disabled_html = '';
    if(disabled)disabled_html = 'disabled';
    return `
        <div class="project_badge btn-group border border-secondary me-2 bg-gradient" role="group" 
            data-bs-toggle="tooltip" data-bs-placement="bottom" title="${project.path_like_objects_safe.map(_project=>'/'+_project.name).join('')}">
            <a href='/cms/show_project/${project.id}?next=${encodeURIComponent(location)}' class="btn text-nowrap ${disabled_html}" style="text-decoration:none;border-color:transparent;">
                <span class='name_span'><i class="bi bi-flag-fill me-1"></i>${project.name.slice(0, 20)}</span>
            </a>
            <div style="">
            ${
                project.user.id === request_user.id ? `
                    ${
                        project.publicity === 1 ? `
                            <span class="text-primary"  style="position:relative;left:-1em;top:0.25em;"><i class="material-icons m-2 md-12">public</i></span>
                        ` : `
                            <span class="text-muted" style="position:relative;left:-1em;top:0.25em;"><i class="material-icons m-2 md-12">public_off</i></span>
                        `
                    }
                ` : `
                    <span class="text-muted text-nowrap" style="position:relative;top:2em;font-size:0.1em;">
                        by 
                        <a href='/cms/show_user/${project.user.id}?next=${encodeURIComponent(location)}' 
                            class="text-nowrap" style="text-decoration:none;font-size:0.1em;">
                            ${project.user.nickname}
                        </a>
                    </span>
                `
            }
            ${
                project.user_plm ? `
                    ${
                        project.user_plm.is_active ? `
                            ${[...Array(project.user_plm.star)].map((_, i)=>`
                                <span class="text-warning" style="position:absolute;top:-0.6em;left:${i*0.7-0.5}em;">
                                    <i class="material-icons m-2 md-12">star_rate</i></span>
                            `).join('')}
                        ` : `
                            <span class="text-danger" style="position:absolute;left:-0.4em;top:-0.5em;">
                                <i class="material-icons m-2 md-12">block</i></span>
                        `
                    }
                ` : ``
            }
            </div>
            
            ${
                !disabled && request_user.is_authenticated? `
                    <button type="button" class="btn btn-sm dropdown-toggle dropdown-toggle-split" 
                        data-bs-toggle="dropdown" aria-expanded="false" ${disabled_html}>
                        <span class="visually-hidden"></span>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-dark">
                        ${
                            project.user.id === request_user.id ? `
                                <li>
                                    <a href="/cms/add_card/?project=${project.id}&next=${encodeURIComponent(location)}"
                                        class="btn dropdown-item text-nowrap dropdown-item ${disabled_html}" 
                                        data-bs-toggle="tooltip" data-bs-placement="bottom" title="デフォルトテンプレートからカードを作成">
                                            デフォルトテンプレートからカードを作成
                                    </a>
                                </li>
                            ` : ''
                        }
                        ${
                            project.user_plm ? `
                            <li>
                                <a href="/cms/learn?project=${project.id}" class="btn dropdown-item text-nowrap dropdown-item ${disabled_html}" 
                                    title="学習を開始する">
                                        学習を開始する
                                </a>
                            </li>
                            ` : `
                            <li>
                                <button class="btn btn-outline-success btn-sm del_confirm m-1" data-toggle="modal" 
                                    data-target="#deleteModal" data-bs-toggle="tooltip" title="ブックマークに追加" 
                                    onclick="show_confmodal__add_project_bookmark('', '${project.id}', process_after_result=()=>{})" >
                                        ブックマークに追加</button>
                            </li>
                            `
                        }

                        
                    </ul>
                `: ''
            }
        </div>
    `
}


const get_tag_badge_html = (tag, disabled=false)=>{
    let disabled_html = '';
    if(disabled)disabled_html = 'disabled';
    return `
        <div class="tag_badge btn-group border border-secondary me-2 bg-gradient"
            title="${tag.path_like_objects_safe.map(_tag=>'/'+_tag.name).join('')}">
            <a href='/cms/show_tag/${tag.id}?next=${encodeURIComponent(location)}' 
                class="btn text-nowrap ${disabled_html}" style="text-decoration:none;border-color:transparent;">
                    <span class='name_span'><i class="bi bi-tag-fill me-1"></i>${tag.name}</span>
            </a>
            <div style="">
            ${
                tag.user.id === request_user.id ? `
                    ${
                        tag.publicity === 1 ? `
                            <span class="text-primary"  style="position:relative;left:-1em;top:0.25em;">
                                <i class="material-icons m-2 md-12">public</i></span>
                        ` : `
                            <span class="text-muted" style="position:relative;left:-1em;top:0.25em;">
                                <i class="material-icons m-2 md-12">public_off</i></span>
                        `
                    }
                    ${[...Array(tag.star_safe)].map((_, i)=>`
                                <span class="text-warning" style="position:absolute;top:-0.6em;left:${i*0.7-0.5}em;">
                                    <i class="material-icons m-2 md-12">star_rate</i></span>
                            `).join('')
                    }
                ` : `
                    <span class="text-muted text-nowrap" style="position:relative;top:2em;font-size:0.1em;">
                        by 
                        <a href='/cms/show_user/${tag.user.id}?next=${encodeURIComponent(location)}' 
                            class="text-nowrap" style="text-decoration:none;font-size:0.1em;">
                            ${tag.user.nickname}
                        </a>
                    </span>
                `
            }
            </div>
        </div>
    `
}


const get_user_badge_html = (user)=>{
    return `
        <div class="badge border me-2" style="background:#4682b4;" data-bs-toggle="tooltip" 
            data-bs-placement="bottom" title="${user.nickname}">
            <a href='/cms/show_user/${user.id}?next=${encodeURIComponent(location)}' class="text-nowrap text-light" style="text-decoration:none;">
                <i class="bi bi-person-circle me-1"></i>${user.nickname}
            </a>
        </div>
    `
}


const get_rm_buttons_html = (rm, qa, card, list_id, on_delete_name)=>{
    let rm_id = rm.id;
    let next_query = `&next=${encodeURIComponent(location)}`;
    return `
    <div class="d-flex flex-wrap justify-content-start" style='min-width:10em;'>
        <div class="d-flex flex-wrap justify-content-start">
            <a href="/cms/edit_rm/${rm_id}/?${next_query}" class="btn btn-outline-secondary btn-sm m-1" 
                    data-bs-toggle="tooltip" title="復習管理編集"><i class="bi bi-pencil m-1"></i><i class="bi bi-stopwatch m-1"></i></a>
            ${
                request_user.id === card.user.id ? `
                    <a href="/cms/edit_card/${card.id}/?${next_query}" class="btn btn-outline-primary btn-sm m-1" 
                        data-bs-toggle="tooltip" title="カード編集"><i class="bi bi-pencil m-1"></i><i class="bi bi-card-text m-1"></i></a>
                ` : ''
            }
            <a href="/cms/add_card/?copied_from=${card.id}${next_query}" class="btn btn-outline-warning btn-sm text-nowrap m-1" 
                data-bs-toggle="tooltip" data-bs-placement="bottom" title="カードをコピー">
                    <i class="bi bi-files m-1"></i><i class="bi bi-card-text m-1"></i></a>
        </div>
        ${
            request_user.id === card.user.id ? `
                <div class="d-flex flex-wrap justify-content-start">
                    <button class="btn btn-outline-danger btn-sm del_confirm m-1" data-toggle="modal" data-target="#deleteCardModal" 
                        onclick="show_confmodal__delete_cards_from_rm_ids('${list_id}', ['${rm_id}'], ${on_delete_name})" 
                        data-bs-toggle="tooltip" title="カード削除"><i class="bi bi-trash m-1"></i><i class="bi bi-card-text m-1"></i></button>
                    <button class="btn btn-outline-danger btn-sm del_confirm m-1" data-toggle="modal" data-target="#deleteqaModal" 
                        onclick="show_confmodal__delete_rm_set('${list_id}', ['${rm_id}'], ${on_delete_name})" 
                        data-bs-toggle="tooltip" title="復習管理削除"><i class="bi bi-trash m-1"></i><i class="bi bi-stopwatch m-1"></i></button>
                </div>
            ` : `
                <button class="btn btn-outline-danger btn-sm del_confirm m-1" data-toggle="modal" 
                    data-target="#deleteModal" data-bs-toggle="tooltip" title="ブックマーク解除" 
                    onclick="show_confmodal__remove_qa_bookmarks('${list_id}', ['${qa.id}'], ${on_delete_name})">
                        <i class="material-icons md-15" style="position:relative;top:0.15em;">bookmark_remove</i>
                        <i class="bi bi-stopwatch m-1"></i></button>
            `
        }
    </div>
    `;
}


const get_url_from_path_and_queries = (path, queries)=>{
    let query_list = [];
    Object.entries(queries).forEach(([k,v])=>{
        if(v instanceof Array){
            v.forEach(vv=>query_list.push([k, vv])) 
        }
        else{
            query_list.push([k, v])
        }
    })
    let queries_string = query_list.map(([k,v])=>`${k}=${v}`).join('&');
    return `${path}${Object.keys(queries).length?'?':''}${queries_string}`
}



const get_escaped_text = (text)=>{
    return text.replace(/[&'`"<>]/g, function(match) {
        return {
          '<': '&lt;',
          '>': '&gt;',
          '&': '&amp;',
          "'": "'",
          '`': '`',
          '"': '&quot;',
        }[match]
    });
}


const validate_name = (name)=>{
    if (!name)return {result: false, msg:"値が入力されていません。"};
    if (!name.match(/^[^=<>~!\\\*\+\.\?\{\}\(\)\[\]\^\$\|\/]+$/))return {result: false, msg:"使用できない文字が含まれています。"};
    if (!name.match(/^\S/))return {result: false, msg:"空白文字で開始できません。"};
    if (!name.match(/\S$/))return {result: false, msg:"空白文字で終了できません。"};
    return {result: true, msg:""};
}

const validate_uuid = (uuid)=>{
    if(!uuid.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i).length){
        return {result: false, msg:"不正なUUIDです。"};
    }
    return {result: true, msg:""};
}

const validate_lang_code = (lang)=>{
    if(!lang.match(/^[a-zA-Z\-]{0,31}$/i).length){
        return {result: false, msg:"不正な言語コードです。"};
    }
    return {result: true, msg:""};
}


const get_time_hms_from_sec = (tsec)=>{
    const h = Math.floor(tsec/3600)
    const m = Math.floor((tsec%3600)/60)
    const s = Math.floor(tsec%60)
    return h, m, s
}
