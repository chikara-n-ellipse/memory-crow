





// project list


const get_project_list_container_html = (list_id)=>{
    return `
    <div id="${list_id}" class="container">
        <div class="d-flex flex-wrap justify-content-start align-items-center">
            <div id="selected_projects_summary" class="d-flex" >選択中: 0</div>
            ${
                request_user.is_authenticated ? `
                    <div class="dropdown btn" role="group">
                        <button class="btn btn-secondary btn-sm dropdown-toggle button_disabled_without_selected my-3" 
                            type="button" data-bs-toggle="dropdown" aria-expanded="false" disabled>
                            <i class="bi bi-pencil me-2"></i>一括処理
                        </button>
                        <ul class="dropdown-menu dropdown-menu-dark">
                            <li>
                                <button id="patch_projects__set_is_active__button" class="dropdown-item button_disabled_without_selected"
                                    type="button" disabled onclick='show_confmodal__patch_projects__set_is_active("${list_id}", selected_project_ids, force_render_project_grid);'>
                                    活動状態の変更
                                </button>
                            </li>
                            <li>
                                <button id="patch_projects__set_star__button" class="dropdown-item button_disabled_without_selected" 
                                    type="button" disabled onclick='show_confmodal__patch_projects__set_star("${list_id}", selected_project_ids, force_render_project_grid);'>
                                    スターの変更
                                </button>
                            </li>
                            <li>
                                <button id="patch_projects__set_publicity__button" class="dropdown-item button_disabled_without_selected" 
                                    type="button" disabled onclick='show_confmodal__patch_projects__set_publicity("${list_id}", selected_project_ids, force_render_project_grid);'>
                                    公開状態の変更
                                </button>
                            </li>
                            <li>
                                <button id="patch_projects__set_parent__button" class="dropdown-item button_disabled_without_selected" type="button" disabled onclick='show_confmodal__patch_projects__set_parent("${list_id}", selected_project_ids, force_render_project_grid);'>
                                    親プロジェクトの変更
                                </button>
                            </li>
                        </ul>
                    </div>
                    <button id="delete_projects__button" class="btn btn-danger btn-sm button_disabled_without_selected my-3" 
                        type="button" disabled onclick='show_confmodal__delete_projects("${list_id}", selected_project_ids, process_after_delete_projects);'>
                        <i class="bi bi-trash m-1 me-2"></i>一括削除
                    </button>
                ` : ''
            }

            <button type="button" class="select_all_button btn btn-sm btn-outline-secondary ms-3"><i class="bi bi-check-all me-2"></i>全選択</button>
            <button type="button" class="select_none_button btn btn-sm btn-outline-secondary ms-3"><i class="bi bi-x-square me-2"></i>全解除</button>

            <a href="/cms/add_project?next=${encodeURIComponent(location)}" class="btn btn-primary btn-sm ms-3 my-3">
                <i class="bi bi-plus-lg me-2"></i>新規
            </a>

            <div class="top_md_config_container">
                <!-- この位置にマークダウン表示設定変更ボタンが挿入される -->
            </div>
        </div>

        <!-- 検索ボックス -->
        <div class="input-group mb-3 col-6" style="max-width:20em;">
            <input type="text" class="search_input form-control" placeholder="検索" 
                aria-label="検索" aria-describedby="button-addon2">
            <button class="search_button btn btn-outline-secondary" type="button" id="button-addon2">検索</button>
        </div>

        <!-- グリッドテーブル本体 -->
        <div class="grid_wrapper" ></div>

        <div class="bottom_md_config_container">
            <!-- この位置にマークダウン表示設定変更ボタンが挿入される -->
        </div>
    </div>
    `
}

var force_render_project_grid;
var selected_project_ids;

const process_after_delete_projects = ()=>{
  force_render_project_grid();
  init_selected_projects_summary_and_button();
}


const init_selected_projects_summary_and_button = ()=>{
  // 「選択中」ラベルを初期化
  $("#selected_projects_summary").text(`選択中: ${0}`);
  selected_project_ids = [];

  // ボタンの「disabled」を初期化
  $("#project_list_container .button_disabled_without_selected").prop("disabled", true);
}

const init_project_list = (filters)=>{

    let list_id = 'project_list_container';

    $("#project_list_wrapper").html(get_project_list_container_html(list_id));

    $(`#${list_id} .top_md_config_container`).append($(get_markdown_config_button_html()))
    $(`#${list_id} .bottom_md_config_container`).append($(get_markdown_config_button_html()))

    const url_path = '/api/get_projects';
    const url_queries = {...filters};
    if(!url_queries.term) delete url_queries.term;
    if(!url_queries.include_descendant_of) delete url_queries.include_descendant_of;
    if(!url_queries.tuser_id) delete url_queries.tuser_id;

    const columns = get_project_columns(list_id, handle_html=gridjs.html, on_delete_name="process_after_delete_projects");

    let all_ids;

    // プロジェクトリストの初期化
    const grid = new gridjs.Grid({
        
        fixedHeader: true,
        height: '70vh',
        width:"100%",
        className: {
            td: 'bg-dark text-light',
            // th: 'bg-dark text-light',
            footer: 'bg-dark text-light',
            pagination: 'bg-dark text-light',
        },
        style: {
            // table: {
            //   border: '3px solid #ccc'
            // },
            th: {
                'background-color': 'rgba(64, 64, 64, 0.5)',
                'color': 'gray',
              },
        },
        // search: {
        //     // selector: (cell, rowIndex, cellIndex) => {
        //     //     if (cellIndex === 3) return cell[0] + cell[1].join(''); // path
        //     //     if (cellIndex === 5) return new Date(cell).toLocaleString(); // created_at
        //     //     if (cellIndex === 9) return cell.nickname + cell.id; // user
        //     //     else return cell;
        //     // },
        //     server: {
        //         url: (prev, keyword) => {
        //             url_queries.term = keyword ;
        //             return get_url_from_path_and_queries(url_path, url_queries)
        //         }
        //     }
        // },
        columns: columns,
        pagination: {
            enabled: true,
            limit: 10,// not used!!
            server: {
                url: (prev, page, limit) => {
                    url_queries.offset = page * limit ;
                    return get_url_from_path_and_queries(url_path, url_queries)
                },
            },
        },
        server: {
            url: get_url_from_path_and_queries(url_path, url_queries),
            method: "GET",
            headers: {'Authorization':`Bearer ${token}`},
            then: data => {
                all_ids = data.all_ids;
                $("#project_list_container .select_all_button").html(`<i class="bi bi-check-all me-2"></i>全選択(${all_ids.length})`)
                return data.results.map(get_project_data);
            },
            total: data => data.total_count
        },
        sort: {
            multiColumn: true,
            server: {
                url: (prev, _columns) => {
                    if (!_columns.length) return get_url_from_path_and_queries(url_path, url_queries);
                    if(!url_queries.order_by)url_queries.order_by = [];
                    if(!url_queries.order_dir)url_queries.order_dir = [];

                    // _columnsは押した順なので逆にしてループ
                    _columns.slice().reverse().forEach(_col=>{
                        // すでに同じキーがあれば削除
                        let _i = url_queries.order_by.indexOf(columns[_col.index].id);
                        if(_i >= 0){
                            url_queries.order_by.splice(_i, 1);
                            url_queries.order_dir.splice(_i, 1);
                        };

                        //新しくキーを一番左に追加
                        url_queries.order_by.unshift(columns[_col.index].id);
                        url_queries.order_dir.unshift(_col.direction === 1 ? 'asc' : 'desc');
                    })

                    return get_url_from_path_and_queries(url_path, url_queries);
               }
            },
        },
    }).render($("#project_list_container .grid_wrapper").get(0));
  
    grid.on('ready', () => {
        // プラグイン取得
        const checkboxPlugin = grid.config.plugin.get('checkbox');
        if(!checkboxPlugin.props.store)return;

        // チェックボックス変更時のイベントを設定
        checkboxPlugin.props.store.on('updated', function (state, prevState) {
            selected_project_ids = state.rowIds;

            $("#selected_projects_summary").text(`選択中: ${state.rowIds.length}`);
            $("#project_list_container .button_disabled_without_selected").prop("disabled", state.rowIds.length == 0);
        });

        $('.md_preview_button').click();
    })
  
    force_render_project_grid = ()=>{grid.forceRender()};

    $("#project_list_container .select_all_button").on('click', ()=>{
        // grid.config.columns[0].data = true;
        const checkboxPlugin = grid.config.plugin.get('checkbox');
        if(!checkboxPlugin.props.store)return;
        let state = checkboxPlugin.props.store.state;
        state.rowIds = all_ids;
        selected_project_ids = all_ids;
        grid.forceRender();
        $("#selected_projects_summary").text(`選択中: ${state.rowIds.length}`);
        $("#project_list_container .button_disabled_without_selected").prop("disabled", state.rowIds.length == 0);
    })

    $("#project_list_container .select_none_button").on('click', ()=>{
        const checkboxPlugin = grid.config.plugin.get('checkbox');
        if(!checkboxPlugin.props.store)return;
        let state = checkboxPlugin.props.store.state;
        // grid.config.columns[0].data = null;
        state.rowIds = [];
        selected_project_ids = [];
        grid.forceRender();
        $("#selected_projects_summary").text(`選択中: ${state.rowIds.length}`);
        $("#project_list_container .button_disabled_without_selected").prop("disabled", state.rowIds.length == 0);
    })

    const list_container_selector = '#project_list_container';

    // 検索ボックスの初期化
    const search = ()=>{
        const term = $(`${list_container_selector} .search_input`).val();
        url_queries.term = term;
        grid.forceRender();
    }
    $(`${list_container_selector} .search_button`).on('click', search);
    $(`${list_container_selector} .search_input`).keydown((e)=>{
        if(e.key == "Enter"){
            search();
        }
    })

}


// tag list


const get_tag_list_container_html = (list_id)=>{
    return `
    <div id="${list_id}" class="container">
        <div class="d-flex flex-wrap justify-content-start align-items-center">
            <div id="selected_tags_summary" class="d-flex" >選択中: 0</div>
            ${
                request_user.is_authenticated ? `
                        <div class="btn-group dropdown" role="group">
                            <button class="btn btn-secondary btn-sm dropdown-toggle button_disabled_without_selected my-3" 
                                type="button" data-bs-toggle="dropdown" aria-expanded="false" disabled>
                                <i class="bi bi-pencil me-2"></i>一括変更
                            </button>
                            <ul class="dropdown-menu dropdown-menu-dark">
                                <li>
                                    <button id="patch_tags__set_star__button" class="dropdown-item button_disabled_without_selected" 
                                        type="button" disabled onclick='show_confmodal__patch_tags__set_star("${list_id}", selected_tag_ids, force_render_tag_grid);'>
                                        スターの変更
                                    </button>
                                </li>
                                <li>
                                    <button id="patch_tags__set_parent__button" class="dropdown-item button_disabled_without_selected" 
                                        type="button" disabled onclick='show_confmodal__patch_tags__set_parent("${list_id}", selected_tag_ids, force_render_tag_grid);'>
                                        親タグの変更
                                    </button>
                                </li>
                            </ul>
                        </div>
                        <button id="batchdelete_button" class="btn btn-danger btn-sm button_disabled_without_selected my-3" 
                            disabled onclick='show_confmodal__delete_tags("${list_id}", selected_tag_ids, process_after_delete_tags);'>
                            <i class="bi bi-trash m-1 me-2"></i>一括削除
                        </button>
                ` : ''
            }
            
            <button type="button" class="select_all_button btn btn-sm btn-outline-secondary ms-3"><i class="bi bi-check-all me-2"></i>全選択</button>
            <button type="button" class="select_none_button btn btn-sm btn-outline-secondary ms-3"><i class="bi bi-x-square me-2"></i>全解除</button>
            
            <a href="/cms/add_tag?next=${encodeURIComponent(location)}" class="btn btn-primary btn-sm ms-3 my-3">
                <i class="bi bi-plus-lg me-2"></i>新規
            </a>
        </div>

        <!-- 検索ボックス -->
        <div class="input-group mb-3 col-6" style="max-width:20em;">
            <input type="text" class="search_input form-control" placeholder="検索" 
                aria-label="検索" aria-describedby="button-addon2">
            <button class="search_button btn btn-outline-secondary" type="button" id="button-addon2">検索</button>
        </div>

        <!-- グリッドテーブル本体 -->
        <div class="grid_wrapper" ></div>


    </div>
    `
}


var force_render_tag_grid;
var selected_tag_ids;

const process_after_delete_tags = ()=>{
  force_render_tag_grid();
  init_selected_tags_summary_and_button();
}


const init_selected_tags_summary_and_button = ()=>{
  // 「選択中」ラベルを初期化
  $("#selected_tags_summary").text(`選択中: ${0}`);
  selected_tag_ids = [];

  // ボタンの「disabled」を初期化
  $("#tag_list_container .button_disabled_without_selected").prop("disabled", true);
}

const init_tag_list = (filters) => {

    let list_id = 'tag_list_container';

    $("#tag_list_wrapper").html(get_tag_list_container_html(list_id));

    $("#tag_list_container .dialog_container").html(get_confirmation_dialog_html());

    const url_path = '/api/get_tags';
    const url_queries = {...filters};
    if(!url_queries.term) delete url_queries.term;
    if(!url_queries.include_descendant_of) delete url_queries.include_descendant_of;
    if(!url_queries.tuser_id) delete url_queries.tuser_id;

    const columns = get_tag_columns(list_id, handle_html = gridjs.html, on_delete_name = "process_after_delete_tags");
    
    let all_ids;

    // タグリストの初期化
    const grid = new gridjs.Grid({
        fixedHeader: true,
        height: '70vh',
        width:"100%",
        className: {
            td: 'bg-dark text-light',
            // th: 'bg-dark text-light',
            footer: 'bg-dark text-light',
            pagination: 'bg-dark text-light',
        },
        style: {
            // table: {
            //   border: '3px solid #ccc'
            // },
            th: {
                'background-color': 'rgba(64, 64, 64, 0.5)',
                'color': 'gray',
              },
        },

        // search: {
        //     // selector: (cell, rowIndex, cellIndex) => {
        //     //     if (cellIndex === 3) return cell[0] + cell[1].join(''); // path
        //     //     if (cellIndex === 4) return new Date(cell).toLocaleString(); // created_at
        //     //     if (cellIndex === 7) return cell.nickname + cell.id; // user
        //     //     else return cell;
        //     // },
        //     server: {
        //         url: (prev, keyword) => {
        //             url_queries.term = keyword ;
        //             return get_url_from_path_and_queries(url_path, url_queries)
        //         }
        //     }
        // },
        columns: columns,
        pagination: {
            enabled: true,
            limit: 10,// not used!!
            server: {
                url: (prev, page, limit) => {
                    url_queries.offset = page * limit ;
                    return get_url_from_path_and_queries(url_path, url_queries)
                },
            },
        },
        server: {
            url: get_url_from_path_and_queries(url_path, url_queries),
            method: "GET",
            headers: { 'Authorization': `Bearer ${token}` },
            then: data => {
                all_ids = data.all_ids;
                $("#tag_list_container .select_all_button").html(`<i class="bi bi-check-all me-2"></i>全選択(${all_ids.length})`)
                return data.results.map(get_tag_data);
            },
            total: data => data.total_count
        },
        sort: {
            multiColumn: true,
            server: {
                url: (prev, _columns) => {
                    if (!_columns.length) return get_url_from_path_and_queries(url_path, url_queries);
                    if(!url_queries.order_by)url_queries.order_by = [];
                    if(!url_queries.order_dir)url_queries.order_dir = [];

                    // _columnsは押した順なので逆にしてループ
                    _columns.slice().reverse().forEach(_col=>{
                        // すでに同じキーがあれば削除
                        let _i = url_queries.order_by.indexOf(columns[_col.index].id);
                        if(_i >= 0){
                            url_queries.order_by.splice(_i, 1);
                            url_queries.order_dir.splice(_i, 1);
                        };

                        //新しくキーを一番左に追加
                        url_queries.order_by.unshift(columns[_col.index].id);
                        url_queries.order_dir.unshift(_col.direction === 1 ? 'asc' : 'desc');
                    })
                    return get_url_from_path_and_queries(url_path, url_queries);
               }
            },
        },
    }).render($("#tag_list_container .grid_wrapper").get(0));

    grid.on('ready', () => {
        // プラグイン取得
        const checkboxPlugin = grid.config.plugin.get('checkbox');
        if(!checkboxPlugin.props.store)return;

        // チェックボックス変更時のイベントを設定
        checkboxPlugin.props.store.on('updated', function (state, prevState) {
            selected_tag_ids = state.rowIds;

            $("#selected_tags_summary").text(`選択中: ${state.rowIds.length}`);
            $("#tag_list_container .button_disabled_without_selected").prop("disabled", state.rowIds.length == 0);
        });
        
        $('.md_preview_button').click();
    })

    force_render_tag_grid = () => { grid.forceRender() };

    $("#tag_list_container .select_all_button").on('click', ()=>{
        // grid.config.columns[0].data = true;
        const checkboxPlugin = grid.config.plugin.get('checkbox');
        if(!checkboxPlugin.props.store)return;
        let state = checkboxPlugin.props.store.state;
        state.rowIds = all_ids;
        selected_tag_ids = all_ids;
        grid.forceRender();
        $("#selected_tags_summary").text(`選択中: ${state.rowIds.length}`);
        $("#tag_list_container .button_disabled_without_selected").prop("disabled", state.rowIds.length == 0);
    })

    $("#tag_list_container .select_none_button").on('click', ()=>{
        const checkboxPlugin = grid.config.plugin.get('checkbox');
        if(!checkboxPlugin.props.store)return;
        let state = checkboxPlugin.props.store.state;
        // grid.config.columns[0].data = null;
        state.rowIds = [];
        selected_tag_ids = [];
        grid.forceRender();
        $("#selected_tags_summary").text(`選択中: ${state.rowIds.length}`);
        $("#tag_list_container .button_disabled_without_selected").prop("disabled", state.rowIds.length == 0);
    })

    const list_container_selector = '#tag_list_container';

    // 検索ボックスの初期化
    const search = ()=>{
        const term = $(`${list_container_selector} .search_input`).val();
        url_queries.term = term;
        grid.forceRender();
    }
    $(`${list_container_selector} .search_button`).on('click', search);
    $(`${list_container_selector} .search_input`).keydown((e)=>{
        if(e.key == "Enter"){
            search();
        }
    })
}


const get_card_list_container_html = (list_id)=>{
    return `
    <div id="${list_id}" class="container">
        <div class="d-flex flex-wrap justify-content-start align-items-center">
            <div id="selected_cards_summary" class="d-flex" >選択中: 0</div>
            ${
                request_user.is_authenticated ? `
                    <div class="dropdown btn" role="group">
                        <button class="btn btn-secondary btn-sm dropdown-toggle button_disabled_without_selected my-3" 
                            type="button" data-bs-toggle="dropdown" aria-expanded="false" disabled>
                            <i class="bi bi-pencil me-2"></i>一括処理
                        </button>
                        <ul class="dropdown-menu dropdown-menu-dark">
                            <li>
                                <button id="patch_cards__set_project__button" class="dropdown-item button_disabled_without_selected"
                                    type="button" disabled onclick='show_confmodal__patch_cards__set_project("${list_id}", selected_card_ids, force_render_card_grid);'>
                                    プロジェクトの変更
                                </button>
                            </li>
                            <li>
                                <button id="patch_cards__add_tags__button" class="dropdown-item button_disabled_without_selected"
                                    type="button" disabled onclick='show_confmodal__patch_cards__add_tags("${list_id}", selected_card_ids, force_render_card_grid);'>
                                        タグの追加
                                </button>
                            </li>
                            <li>
                                <button id="patch_cards__remove_tags__button" class="dropdown-item button_disabled_without_selected"
                                    type="button" disabled onclick='show_confmodal__patch_cards__remove_tags("${list_id}", selected_card_ids, force_render_card_grid);'>
                                        タグの除外
                                </button>
                            </li>
                            <li>
                                <button id="patch_cards__set_tags__button" class="dropdown-item text-danger button_disabled_without_selected"
                                    type="button" disabled onclick='show_confmodal__patch_cards__set_tags("${list_id}", selected_card_ids, force_render_card_grid);'>
                                        タグの設定
                                </button>
                            </li>
                            <li>
                                <button id="patch_cards__set_publicity__button" class="dropdown-item button_disabled_without_selected"
                                    type="button" disabled onclick='show_confmodal__patch_cards__set_publicity("${list_id}", selected_card_ids, force_render_card_grid);'>
                                        公開状態の変更
                                </button>
                            </li>
                        </ul>
                    </div>
                    <button id="delete_cards__button" class="btn btn-danger btn-sm button_disabled_without_selected my-3"
                        type="button" disabled onclick='show_confmodal__delete_cards("${list_id}", selected_card_ids, process_after_delete_cards);'>
                        <i class="bi bi-trash m-1 me-2"></i>一括削除
                    </button>
                ` : ''
            }
            <button type="button" class="select_all_button btn btn-sm btn-outline-secondary ms-3"><i class="bi bi-check-all me-2"></i>全選択</button>
            <button type="button" class="select_none_button btn btn-sm btn-outline-secondary ms-3"><i class="bi bi-x-square me-2"></i>全解除</button>
            
            <div class="btn-group">
                <a href="/cms/add_card?next=${encodeURIComponent(location)}" class="btn btn-primary btn-sm ms-3 my-3">
                    <i class="bi bi-plus-lg me-2"></i>新規
                </a>
                <button type="button" class="btn btn-primary btn-sm dropdown-toggle dropdown-toggle-split my-3" data-bs-toggle="dropdown" aria-expanded="false">
                    <span class="visually-hidden"></span>
                </button>
                <ul class="dropdown-menu dropdown-menu-dark">
                    <li><button class="dropdown-item" onclick='show_tsv_modal(force_render_card_grid)'>TSVから作成</button></li>
                </ul>
            </div>
            
            <div class="top_md_config_container">
                <!-- この位置にマークダウン表示設定変更ボタンが挿入される -->
            </div>
        </div>

        <!-- 検索ボックス -->
        <div class="input-group mb-3 col-6" style="max-width:20em;">
            <input type="text" class="search_input form-control" placeholder="検索" 
                aria-label="検索" aria-describedby="button-addon2">
            <button class="search_button btn btn-outline-secondary" type="button" id="button-addon2">検索</button>
        </div>

        <!-- グリッドテーブル本体 -->
        <div class="grid_wrapper" ></div>

        <div class="bottom_md_config_container">
            <!-- この位置にマークダウン表示設定変更ボタンが挿入される -->
        </div>

        <div class="tsv_modal_container"></div>

        
    </div>
    `
}


var force_render_card_grid;
var selected_card_ids;
let all_ids;


const process_after_delete_cards = () => {
    force_render_card_grid();
    init_selected_cards_summary_and_button();
}


const init_selected_cards_summary_and_button = () => {
    // 「選択中」ラベルを初期化
    $("#selected_cards_summary").text(`選択中: ${0}`);
    selected_card_ids = [];

    // ボタンの「disabled」を初期化
    $("#card_list_container .button_disabled_without_selected").prop("disabled", true);
}


const init_card_list = (filters) => {

    let list_id = 'card_list_container';

    $("#card_list_wrapper").html(get_card_list_container_html(list_id));

    $("#card_list_container .dialog_container").html(get_confirmation_dialog_html());

    $("#card_list_container .top_md_config_container").append($(get_markdown_config_button_html()));
    $("#card_list_container .bottom_md_config_container").append($(get_markdown_config_button_html()));

    $('#card_list_container .tsv_modal_container').html(get_tsv_modal_html());

    const url_path = '/api/get_cards';
    const url_queries = {...filters};
    if(!url_queries.project) delete url_queries.project;
    if(!url_queries.tuser_id) delete url_queries.tuser_id;

    const columns = get_card_columns(list_id, handle_html = gridjs.html, on_delete_name = "process_after_delete_cards");

    let all_ids;

    // カードリストの初期化
    const grid = new gridjs.Grid({
        pagination: true,
        fixedHeader: true,
        height: '70vh',
        width:"100%",
        className: {
            td: 'bg-dark text-light',
            // th: 'bg-dark text-light',
            footer: 'bg-dark text-light',
            pagination: 'bg-dark text-light',
        },
        style: {
            // table: {
            //   border: '3px solid #ccc'
            // },
            th: {
                'background-color': 'rgba(64, 64, 64, 0.5)',
                'color': 'gray',
              },
        },
        // search: {
        //     // selector: (cell, rowIndex, cellIndex) => {
        //     //     if (cellIndex === 2) return cell.map(cf=>cf.name+cf.content).join(''); // card_fields
        //     //     if (cellIndex === 3) return cell.name+cell.content; // supplement_content
        //     //     if (cellIndex === 4) return cell ? (cell.path + cell.pathlike_ids.join('')): ''; // project
        //     //     if (cellIndex === 5) return cell.map(t=>t.path+t.pathlike_ids.join('')).join(''); // tags
        //     //     if (cellIndex === 6) return cell.map(c=>c.id).join(''); // rm_set
        //     //     if (cellIndex === 7) return new Date(cell).toLocaleString(); // created_at
        //     //     if (cellIndex === 9) return cell.nickname + cell.id; // user
        //     //     else return cell;
        //     // },
        //     server: {
        //         url: (prev, keyword) => {
        //             url_queries.term = keyword ;
        //             return get_url_from_path_and_queries(url_path, url_queries)
        //         }
        //     }
        // },
        columns: columns,
        pagination: {
            enabled: true,
            limit: 10,// not used!!
            server: {
                url: (prev, page, limit) => {
                    url_queries.offset = page * limit ;
                    return get_url_from_path_and_queries(url_path, url_queries)
                },
            },
        },
        server: {
            url: get_url_from_path_and_queries(url_path, url_queries),
            method: "GET",
            headers: { 'Authorization': `Bearer ${token}` },
            xhrFields: {
                withCredentials: true
              },
            then: data => {
                all_ids = data.all_ids;
                $("#card_list_container .select_all_button").html(`<i class="bi bi-check-all me-2"></i>全選択(${all_ids.length})`)
                return data.results.map(get_card_data);
            },
            total: data => data.total_count
        },
        sort: {
            multiColumn: true,
            server: {
                url: (prev, _columns) => {
                    if (!_columns.length) return get_url_from_path_and_queries(url_path, url_queries);
                    if(!url_queries.order_by)url_queries.order_by = [];
                    if(!url_queries.order_dir)url_queries.order_dir = [];

                    // _columnsは押した順なので逆にしてループ
                    _columns.slice().reverse().forEach(_col=>{
                        // すでに同じキーがあれば削除
                        let _i = url_queries.order_by.indexOf(columns[_col.index].id);
                        if(_i >= 0){
                            url_queries.order_by.splice(_i, 1);
                            url_queries.order_dir.splice(_i, 1);
                        };

                        //新しくキーを一番左に追加
                        url_queries.order_by.unshift(columns[_col.index].id);
                        url_queries.order_dir.unshift(_col.direction === 1 ? 'asc' : 'desc');
                    })
                    return get_url_from_path_and_queries(url_path, url_queries);
               }
            },
        },
    }).render($("#card_list_container .grid_wrapper").get(0));

    grid.on('ready', () => {
        // プラグイン取得
        const checkboxPlugin = grid.config.plugin.get('checkbox');
        if(!checkboxPlugin.props.store)return;

        // チェックボックス変更時のイベントを設定
        checkboxPlugin.props.store.on('updated', function (state, prevState) {
            selected_card_ids = state.rowIds;

            $("#selected_cards_summary").text(`選択中: ${state.rowIds.length}`);
            $("#card_list_container .button_disabled_without_selected").prop("disabled", state.rowIds.length == 0);
        });

        $('.md_preview_button').click();
    })

    force_render_card_grid = () => { grid.forceRender() };

    $("#card_list_container .select_all_button").on('click', ()=>{
        // grid.config.columns[0].data = true;
        const checkboxPlugin = grid.config.plugin.get('checkbox');
        if(!checkboxPlugin.props.store)return;
        let state = checkboxPlugin.props.store.state;
        state.rowIds = all_ids;
        selected_card_ids = all_ids;
        grid.forceRender();
        $("#selected_cards_summary").text(`選択中: ${state.rowIds.length}`);
        $("#card_list_container .button_disabled_without_selected").prop("disabled", state.rowIds.length == 0);
    })

    $("#card_list_container .select_none_button").on('click', ()=>{
        const checkboxPlugin = grid.config.plugin.get('checkbox');
        if(!checkboxPlugin.props.store)return;
        let state = checkboxPlugin.props.store.state;
        // grid.config.columns[0].data = null;
        state.rowIds = [];
        selected_card_ids = [];
        grid.forceRender();
        $("#selected_cards_summary").text(`選択中: ${state.rowIds.length}`);
        $("#card_list_container .button_disabled_without_selected").prop("disabled", state.rowIds.length == 0);
    })

    const list_container_selector = '#card_list_container';

    // 検索ボックスの初期化
    const search = ()=>{
        const term = $(`${list_container_selector} .search_input`).val();
        url_queries.term = term;
        grid.forceRender();
    }
    $(`${list_container_selector} .search_button`).on('click', search);
    $(`${list_container_selector} .search_input`).keydown((e)=>{
        if(e.key == "Enter"){
            search();
        }
    })

}



const get_rm_list_container_html = (list_id)=>{
    return `
    <div id="${list_id}" class="container">
        <div class="d-flex flex-wrap justify-content-start align-items-center">
            <div id="selected_rm_set_summary" class="d-flex" >選択中: 0</div>
            ${
                request_user.is_authenticated ? `
                    <div class="dropdown btn" role="group">
                        <button class="btn btn-secondary btn-sm dropdown-toggle button_disabled_without_selected my-3" 
                            type="button" data-bs-toggle="dropdown" aria-expanded="false" disabled>
                            <i class="bi bi-pencil me-2"></i>一括処理
                        </button>
                        <ul class="dropdown-menu dropdown-menu-dark">
                            <li><button id="patch_rm_set__initialize__button" class="patch_rm_set__change_button dropdown-item button_disabled_without_selected" 
                                type="button" disabled onclick='show_confmodal__patch_rm_set__initialize("${list_id}", selected_rm_ids, force_render_rm_grid);'>
                                初期化</button></li>
                            <li><button id="patch_rm_set__set_need_session__button" class="patch_rm_set__change_button dropdown-item button_disabled_without_selected" 
                                type="button" disabled onclick='show_confmodal__patch_rm_set__set_need_session("${list_id}", selected_rm_ids, force_render_rm_grid);'>
                                要セッション指定の変更</button></li>
                            <li><button id="patch_rm_set__set_is_active__button" class="patch_rm_set__change_button dropdown-item button_disabled_without_selected" 
                                type="button" disabled onclick='show_confmodal__patch_rm_set__set_is_active("${list_id}", selected_rm_ids, force_render_rm_grid);'>
                                活動状態の変更</button></li>
                            <li><button id="patch_rm_set__set_ul_review_interval__button" class="patch_rm_set__change_button dropdown-item button_disabled_without_selected" 
                                type="button" disabled onclick='show_confmodal__patch_rm_set__set_ul_review_interval("${list_id}", selected_rm_ids, force_render_rm_grid);'>
                                上限復習間隔の変更</button></li>
                            <li><button id="patch_rm_set__set_ingestion_level__button" class="patch_rm_set__change_button dropdown-item button_disabled_without_selected" 
                                type="button" disabled onclick='show_confmodal__patch_rm_set__set_ingestion_level("${list_id}", selected_rm_ids, force_render_rm_grid);'>
                                摂取レベルの変更</button></li>
                            <li><button id="patch_rm_set__set_absorption_level__button" class="patch_rm_set__change_button dropdown-item button_disabled_without_selected" 
                                type="button" disabled onclick='show_confmodal__patch_rm_set__set_absorption_level("${list_id}", selected_rm_ids, force_render_rm_grid);'>
                                定着レベルの変更</button></li>
                            <li><button id="patch_rm_set__set_interval_increase_rate__button" class="patch_rm_set__change_button dropdown-item button_disabled_without_selected" 
                                type="button" disabled onclick='show_confmodal__patch_rm_set__set_interval_increase_rate("${list_id}", selected_rm_ids, force_render_rm_grid);'>
                                間隔増加率の変更</button></li>
                            <li><button id="patch_rm_set__set_actual_review_interval__button" class="patch_rm_set__change_button dropdown-item button_disabled_without_selected" 
                                type="button" disabled onclick='show_confmodal__patch_rm_set__set_actual_review_interval("${list_id}", selected_rm_ids, force_render_rm_grid);'>
                                実際復習間隔の変更</button></li>
                            <li><button id="patch_rm_set__set_last_reviewed_at__button" class="patch_rm_set__change_button dropdown-item button_disabled_without_selected" 
                                type="button" disabled onclick='show_confmodal__patch_rm_set__set_last_reviewed_at("${list_id}", selected_rm_ids, force_render_rm_grid);'>
                                最終復習日時の変更</button></li>
                            <li><button id="patch_rm_set__set_importance__button" class="patch_rm_set__change_button dropdown-item button_disabled_without_selected" 
                                type="button" disabled onclick='show_confmodal__patch_rm_set__set_importance("${list_id}", selected_rm_ids, force_render_rm_grid);'>
                                重要度の変更</button></li>
                            <li><button id="patch_rm_set__set_estimated_time__button" class="patch_rm_set__change_button dropdown-item button_disabled_without_selected" 
                                type="button" disabled onclick='show_confmodal__patch_rm_set__set_estimated_time("${list_id}", selected_rm_ids, force_render_rm_grid);'>
                                予想所要時間の変更</button></li>
                            <li><button id="patch_rm_set__set_highest_absorption_level__button" class="patch_rm_set__change_button dropdown-item button_disabled_without_selected" 
                                type="button" disabled onclick='show_confmodal__patch_rm_set__set_highest_absorption_level("${list_id}", selected_rm_ids, force_render_rm_grid);'>
                                最高定着レベルの変更</button></li>
                        </ul>
                    </div>
                    <div class="btn-group dropdown" role="group">
                        <button id="batch_delete_dropdown_button" class="btn btn-danger btn-sm dropdown-toggle btn-sm button_disabled_without_selected" 
                        type="button" data-bs-toggle="dropdown" aria-expanded="false" disabled>
                        <i class="bi bi-trash m-1 me-2"></i>削除
                        </button>
                        <ul class="dropdown-menu dropdown-menu-dark">
                            <li><button class="btn text-danger btn-sm dropdown-item button_disabled_without_selected" 
                                type="button" disabled onclick='show_confmodal__delete_rm_set("${list_id}", selected_rm_ids, process_after_delete_rm_set);'>
                                <i class="bi bi-trash m-1 me-2"></i><i class="bi bi-stopwatch me-3"></i>復習管理一括削除</button></li>
                            <li><button class="btn text-danger btn-sm dropdown-item button_disabled_without_selected" 
                                type="button" disabled onclick='show_confmodal__delete_cards_from_rm_ids("${list_id}", selected_rm_ids, process_after_delete_rm_set);'>
                                <i class="bi bi-trash m-1 me-2"></i><i class="bi bi-card-text me-3"></i>カード一括削除</button></li>
                        </ul>
                    </div>
                ` : ''
            }
            <button type="button" class="select_all_button btn btn-sm btn-outline-secondary ms-3"><i class="bi bi-check-all me-2"></i>全選択</button>
            <button type="button" class="select_none_button btn btn-sm btn-outline-secondary ms-3"><i class="bi bi-x-square me-2"></i>全解除</button>

            <div class="top_md_config_container">
                <!-- この位置にマークダウン表示設定変更ボタンが挿入される -->
            </div>
        </div>

        <!-- 検索ボックス -->
        <div class="input-group mb-3 col-6" style="max-width:20em;">
            <input type="text" class="search_input form-control" placeholder="検索" 
                aria-label="検索" aria-describedby="button-addon2">
            <button class="search_button btn btn-outline-secondary" type="button" id="button-addon2">検索</button>
        </div>

        <!-- グリッドテーブル本体 -->
        <div class="grid_wrapper" ></div>

        <div class="bottom_md_config_container">
        <!-- この位置にマークダウン表示設定変更ボタンが挿入される -->
        </div>


    </div>
    `
}



var force_render_rm_grid;
var selected_rm_ids;

const process_after_delete_rm_set = () => {
    force_render_rm_grid();
    init_selected_rm_set_summary_and_button();
}


const init_selected_rm_set_summary_and_button = () => {
    // 「選択中」ラベルを初期化
    $("#selected_rm_set_summary").text(`選択中: ${0}`);
    selected_rm_ids = [];

    // ボタンの「disabled」を初期化
    $("#rm_list_container .button_disabled_without_selected").prop("disabled", true);
}

const init_rm_list = (filters) => {

    let list_id = 'rm_list_container';

    $("#rm_list_wrapper").html(get_rm_list_container_html(list_id));

    $("#rm_list_container .dialog_container").html(get_confirmation_dialog_html());

    $("#rm_list_container .top_md_config_container").append($(get_markdown_config_button_html()))
    $("#rm_list_container .bottom_md_config_container").append($(get_markdown_config_button_html()))

    const url_path = '/api/get_rm_set';
    const url_queries = {...filters};
    if(!url_queries.project) delete url_queries.project;
    

    const columns = get_rm_columns(list_id, handle_html = gridjs.html, on_delete_name = "process_after_delete_rm_set");

    let all_ids;

    // 復習管理リストの初期化
    const grid = new gridjs.Grid({
        pagination: true,
        fixedHeader: true,
        height: '70vh',
        width:"100%",
        className: {
            td: 'bg-dark text-light',
            // th: 'bg-dark text-light',
            footer: 'bg-dark text-light',
            pagination: 'bg-dark text-light',
        },
        style: {
            // table: {
            //   border: '3px solid #ccc'
            // },
            th: {
                'background-color': 'rgba(64, 64, 64, 0.5)',
                'color': 'gray',
              },
        },
        // search: {
        //     // selector: (cell, rowIndex, cellIndex) => {
        //     //     console.log("aaa")
        //     //     if (cellIndex === 2) return cell.id; // rm
        //     //     if (cellIndex === 3) return cell.name+cell.content; // question_field
        //     //     if (cellIndex === 4) return cell.name+cell.content; // answer_field
        //     //     if (cellIndex === 5) return cell.name+cell.content; // supplement_content
        //     //     if (cellIndex === 6) return cell ? (cell.path + cell.pathlike_ids.join('')): ''; // project
        //     //     if (cellIndex === 7) return cell.map(t=>t.path+t.pathlike_ids.join('')).join(''); // tags
        //     //     if (cellIndex === 8) return new Date(cell).toLocaleString(); // last_reviewed_at
        //     //     if (cellIndex === 9) return new Date(cell).toLocaleDaqaring(); // next_review_date
        //     //     if (cellIndex === 13) return cell.nickname + cell.id; // user
        //     //     if (cellIndex === 21) return get_time_str_from_sec(cell); // estimated_time
        //     //     if (cellIndex === 23) return new Date(cell).toLocaleString(); // last_updated_at
        //     //     if (cellIndex === 24) return new Date(cell).toLocaleString(); // created_at
        //     //     if (cellIndex === 26) return cell.map(d=>d.id).join(''); // dependency_rm_set
        //     //     else return cell;
        //     // },
        //     server: {
        //         url: (prev, keyword) => {
        //             url_queries.term = keyword ;
        //             return get_url_from_path_and_queries(url_path, url_queries)
        //         }
        //     }
        // },
        columns: columns,
        pagination: {
            enabled: true,
            limit: 10,// not used!!
            server: {
                url: (prev, page, limit) => {
                    url_queries.offset = page * limit ;
                    return get_url_from_path_and_queries(url_path, url_queries)
                },
            },
        },
        server: {
            url: get_url_from_path_and_queries(url_path, url_queries),
            method: "GET",
            headers: { 'Authorization': `Bearer ${token}` },
            then: data => {
                all_ids = data.all_ids;
                $("#rm_list_container .select_all_button").html(`<i class="bi bi-check-all me-2"></i>全選択(${all_ids.length})`)
                return data.results.map(get_rm_data);
            },
            total: data => data.total_count
        },
        sort: {
            multiColumn: true,
            server: {
                url: (prev, _columns) => {
                    console.log(_columns)
                    if (!_columns.length) return get_url_from_path_and_queries(url_path, url_queries);
                    if(!url_queries.order_by)url_queries.order_by = [];
                    if(!url_queries.order_dir)url_queries.order_dir = [];

                    // _columnsは押した順なので逆にしてループ
                    _columns.slice().reverse().forEach(_col=>{
                        // すでに同じキーがあれば削除
                        let _i = url_queries.order_by.indexOf(columns[_col.index].id);
                        if(_i >= 0){
                            url_queries.order_by.splice(_i, 1);
                            url_queries.order_dir.splice(_i, 1);
                        };

                        //新しくキーを一番左に追加
                        url_queries.order_by.unshift(columns[_col.index].id);
                        url_queries.order_dir.unshift(_col.direction === 1 ? 'asc' : 'desc');
                    })
                    return get_url_from_path_and_queries(url_path, url_queries);
               }
            },
        },
    }).render($("#rm_list_container .grid_wrapper").get(0));

    grid.on('ready', () => {
        // プラグイン取得
        const checkboxPlugin = grid.config.plugin.get('checkbox');
        if(!checkboxPlugin.props.store)return;

        // チェックボックス変更時のイベントを設定
        checkboxPlugin.props.store.on('updated', function (state, prevState) {
            selected_rm_ids = state.rowIds;
            $("#selected_rm_set_summary").text(`選択中: ${state.rowIds.length}`);
            $("#rm_list_container .button_disabled_without_selected").prop("disabled", state.rowIds.length == 0);
        });

        $('.md_preview_button').click();
    })

    force_render_rm_grid = () => { grid.forceRender() };

    $("#rm_list_container .select_all_button").on('click', ()=>{
        // grid.config.columns[0].data = true;
        const checkboxPlugin = grid.config.plugin.get('checkbox');
        if(!checkboxPlugin.props.store)return;
        let state = checkboxPlugin.props.store.state;
        state.rowIds = all_ids;
        selected_rm_ids = all_ids;
        grid.forceRender();
        $("#selected_rm_set_summary").text(`選択中: ${state.rowIds.length}`);
        $("#rm_list_container .button_disabled_without_selected").prop("disabled", state.rowIds.length == 0);
    })

    $("#rm_list_container .select_none_button").on('click', ()=>{
        const checkboxPlugin = grid.config.plugin.get('checkbox');
        if(!checkboxPlugin.props.store)return;
        let state = checkboxPlugin.props.store.state;
        // grid.config.columns[0].data = null;
        state.rowIds = [];
        selected_rm_ids = [];
        grid.forceRender();
        $("#selected_rm_set_summary").text(`選択中: ${state.rowIds.length}`);
        $("#rm_list_container .button_disabled_without_selected").prop("disabled", state.rowIds.length == 0);
    })

    const list_container_selector = '#rm_list_container';

    // 検索ボックスの初期化
    const search = ()=>{
        console.log("")
        const term = $(`${list_container_selector} .search_input`).val();
        url_queries.term = term;
        grid.forceRender();
    }
    $(`${list_container_selector} .search_button`).on('click', search);
    $(`${list_container_selector} .search_input`).keydown((e)=>{
        if(e.key == "Enter"){
            search();
        }
    })
}