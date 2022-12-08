
const get_user_data = user => [
  user.id,
  user.nickname,
]

const get_user_columns = (container_id, handle_html=null, on_delete_name="null", single_display=false)=> {
  if(!handle_html) handle_html = (s)=>s;
  return [
    {
      id: 'checkbox',
      name: handle_html('<div class="colum_name" style="width:2.5em;">選択</div>'),
      sort: false,
      plugin: {
        component: gridjs.plugins.selection.RowSelection,
        // RowSelection config
        props: {
          // use the "id" column as the row identifier
          id: (row) => row.cell(1).data
        }
      }
    },
    {
      id:"id",name: handle_html('<div class="colum_name" style="width:5em;">ユーザID</div>'),
      formatter: (user_id, row) => {
        let next_query = `&next=${encodeURIComponent(location)}`;
        return handle_html(`
          <a href='/cms/show_user/${user_id}?${next_query}'>
            ${single_display?user_id:user_id.slice(0,4)+'...'}
          </a>
        `);
      },
    },
    {
      id:"nickname",
      name: handle_html('<div class="colum_name" style="width:5em;">ニックネーム</div>'),
      formatter: (name, row) => {
        let user_id = row.cells[1].data.id;
        let next_query = `&next=${encodeURIComponent(location)}`;
        return handle_html(`
          <a class='text-nowrap' href='/cms/show_user/${user_id}?${next_query}'>
            ${name}
          </a>
        `);
      },
    },
  ]
}


const get_project_data = project => [
  project,
  project,
  project.id,
  project.name,
  project.path_like_objects_safe,
  project.description,
  project.created_at,
  project.user_plm && project.user_plm.is_active,
  project.user_plm && project.user_plm.star,
  project.publicity,
  project.user,
]


const get_project_columns = (container_id, handle_html=null, on_delete_name="null", single_display=false)=> {
  if(!handle_html) handle_html = (s)=>s;
  return [
    {
      id: 'checkbox',
      name: handle_html('<div class="colum_name" style="width:2.5em;">選択</div>'),
      sort: false,
      plugin: {
        component: gridjs.plugins.selection.RowSelection,
        // RowSelection config
        props: {
          // use the "id" column as the row identifier
          id: (row) => row.cell(1).data.id
        }
      }
    },
    {
      id: "badge",
      name: handle_html('<div class="colum_name" style="width:7em;">バッジ</div>'),
      formatter: (project, row) => {
        if (project) {
          let s = get_project_badge_html(project);
          return handle_html(s);
        }
        else return handle_html('<i class="bi bi-flag-fill me-1"></i>-');
      },
      sort: {compare: (a, b) => {
          const code = (x) => x?x.path:"";
          return (code(a)>code(b))?1:(code(a)>code(b)?-1:0)
      }},
    },
    {
      id: "operation",
      name: handle_html('<div class="colum_name" style="width:3em;">操作</div>'),
      sort: false,
      formatter: (project, row) => {
        let project_id =row.cells[1].data.id;
        let next_query = `&next=${encodeURIComponent(location)}`;
        if(!request_user.is_authenticated)return '-';
        let edit_project_button_html = '';
        if(project.user.id === request_user.id || project.user_plm){
          edit_project_button_html = `<a href="/cms/edit_project/${project_id}?${next_query}" class="btn btn-outline-primary btn-sm m-1" 
            data-bs-toggle="tooltip" title="プロジェクト編集"><i class="material-icons m-2">edit</i></a>`;
        }
        let delete_project_button_html = '';
        let remove_project_bookmark_button_html = '';
        let add_project_bookmark_button_html = '';
        if(project.user.id === request_user.id){
          delete_project_button_html = `<button class="btn btn-outline-danger btn-sm del_confirm m-1" data-toggle="modal" 
              data-target="#deleteModal" data-bs-toggle="tooltip" title="プロジェクト削除" 
              onclick="show_confmodal__delete_projects('${container_id}', ['${project_id}'], ${on_delete_name})" >
              <i class="material-icons m-2">delete</i></button>`;
        }else{
          if(project.user_plm){
            remove_project_bookmark_button_html = `<button class="btn btn-outline-danger btn-sm del_confirm m-1" data-toggle="modal" 
              data-target="#deleteModal" data-bs-toggle="tooltip" title="ブックマーク解除" 
              onclick="show_confmodal__remove_project_bookmark('${container_id}', ['${project_id}'], ${on_delete_name})" >
              <i class="material-icons m-2">bookmark_remove</i></button>`;
          }else{
            add_project_bookmark_button_html = `<button class="btn btn-outline-success btn-sm del_confirm m-1" data-toggle="modal" 
              data-target="#deleteModal" data-bs-toggle="tooltip" title="ブックマークに追加" 
              onclick="show_confmodal__add_project_bookmark('${container_id}', '${project_id}', ${on_delete_name})" >
              <i class="material-icons m-2">bookmark_add</i></button>`;
          }
        }
        return handle_html(`
            ${edit_project_button_html}
            ${delete_project_button_html}
            ${remove_project_bookmark_button_html}
            ${add_project_bookmark_button_html}
          `);
      },
    },
    {
      id:"id",name: handle_html('<div class="colum_name" style="width:7em;">プロジェクトID</div>'),
      formatter: (project_id, row) => {
        let next_query = `&next=${encodeURIComponent(location)}`;
        return handle_html(`
          <a href='/cms/show_project/${project_id}?${next_query}'>
            ${single_display?project_id:project_id.slice(0,4)+'...'}
          </a>
        `);
      },
    },
    {
      id:"name",
      name: handle_html('<div class="colum_name" style="width:7em;">プロジェクト名</div>'),
      formatter: (name, row) => {
        let project_id = row.cells[1].data.id;
        let next_query = `&next=${encodeURIComponent(location)}`;
        return handle_html(`
          <a class='text-nowrap' href='/cms/show_project/${project_id}?${next_query}'>
            ${name}
          </a>
        `);
      },
    },
    {
      id:"path",
      name: handle_html('<div class="colum_name" style="width:4em;">パス</div>'),
      sort: false,
      formatter: (cell) => {
        let path_like_objects_safe = cell;
        let s = get_path_html_from_objects(path_like_objects_safe);
        return handle_html(s);
      },
    },
    {
      id: "description",
      name: handle_html('<div class="colum_name" style="width:5em;">説明</div>'),
      width: "100%",
      sort: false,
      formatter: (description, row) => {
        let project_id = row.cells[1].data.id;
        return handle_html(`
        ${get_mdfield_html_in_grid(
            description, 
            "説明",
            '',
            `project_description_box_${project_id}_${container_id}`,
            ['md_to_html_target', `md_to_html_target_${project_id}_${container_id}`, 'project_description_box']
          )}
        `);
      },
    },
    {
      id: "created_at",
      name: handle_html('<div class="colum_name" style="width:5em;">作成日時</div>'),
      formatter: (cell) => {
        return new Date(cell).toLocaleString();
      },
    },
    {
      id: "is_active",
      name: handle_html('<div class="colum_name" style="width:5em;">活動状態</div>'),
      formatter: (is_active) => {
        let label;
        if (is_active===true){
          label = "アクティブ";
        }else if(is_active===false){
          label = "凍結中";
        }else{
          label = "-";
        }
        return label;
      },
    },
    {
      id: "star",
      name: handle_html('<div class="colum_name" style="width:3em;">星</div>'),
      formatter: (cell, row) => {
        let n = cell;
        if(n){
          return '☆'.repeat(n);
        }else{
          return '-';
        }
        
      },
    },
    {
      id: "publicity",
      name: handle_html('<div class="colum_name" style="width:5em;">公開状態</div>'),
      formatter: (publicity) => {
        let label;
        if (publicity==0){
          label = "非公開";
        }else if(publicity==1){
          label = "公開";
        }else{
          label = "不明";
        }
        return label;
      },
    },
    // "説明",
    {
      id: "user",
      name: handle_html('<div class="colum_name" style="width:5em;">ユーザ</div>'),
      formatter: (cell) => {
        const user = cell;
        return handle_html(get_user_badge_html(user));
      },
    },
    
  ]
}


const get_tag_data = tag => [
  tag,
  tag,
  tag.id,
  tag.name,
  tag.path_like_objects_safe,
  tag.created_at,
  tag.star_safe,
  tag.publicity,
  tag.user,
]


const get_tag_columns = (container_id, handle_html=null, on_delete_name="null", single_display=false)=> {
  if(!handle_html) handle_html = (s)=>s;
  return [
    {
      id: 'checkbox',
      name: handle_html('<div class="colum_name" style="width:2.5em;">選択</div>'),
      sort: false,
      plugin: {
        component: gridjs.plugins.selection.RowSelection,
        // RowSelection config
        props: {
          // use the "id" column as the row identifier
          id: (row) => row.cell(1).data.id
        }
      }
    },
    {
      id: "tag",
      name: handle_html('<div class="colum_name" style="width:7em;">バッジ</div>'),
      formatter: (tag, row) => {
        if (tag) {
          let s = get_tag_badge_html(tag);
          return handle_html(s);
        }
        else return handle_html('<i class="bi bi-flag-fill me-1"></i>-');
      },
      sort: {compare: (a, b) => {
          const code = (x) => x?x.path:"";
          return (code(a)>code(b))?1:(code(a)>code(b)?-1:0)
      }},
    },
    {
      id: "operation",
      name: handle_html('<div class="colum_name" style="width:2.5em;">操作</div>'), 
      sort: false,
      formatter: (_, row) => {
        let tag_id =row.cells[1].data.id;
        let next_query = `&next=${encodeURIComponent(location)}`;
        if(!request_user.is_authenticated)return '-';
        return handle_html(`
          <a href="/cms/edit_tag/${tag_id}?${next_query}" class="btn btn-outline-primary btn-sm m-1" data-bs-toggle="tooltip" title="タグ編集"><i class="bi bi-pencil m-1"></i></a>
          <button class="btn btn-outline-danger btn-sm del_confirm m-1" data-toggle="modal" data-target="#deleteModal"  data-bs-toggle="tooltip" title="タグ削除" 
            onclick="show_confmodal__delete_tags('${container_id}', ['${tag_id}'], ${on_delete_name})" ><i class="bi bi-trash m-1"></i></button>
        `);
      },
    },
    {
      id:"id",name: handle_html('<div class="colum_name" style="width:5em;">タグID</div>'),
      formatter: (tag_id, row) => {
        let next_query = `&next=${encodeURIComponent(location)}`;
        return handle_html(`
          <a href='/cms/show_tag/${tag_id}?${next_query}' class="">
            ${single_display?tag_id:tag_id.slice(0,4)+'...'}
          </a>
        `);
      },
    }, 
    {
      id:"name",
      name: handle_html('<div class="colum_name" style="width:5em;">タグ名</div>'),
      formatter: (name, row) => {
        let tag_id = row.cells[1].data.id;
        let next_query = `&next=${encodeURIComponent(location)}`;
        return handle_html(`
          <a href='/cms/show_tag/${tag_id}?${next_query}' class="">
            ${name}
          </a>
        `);
      },
    },
    {
      id:"path",
      name: handle_html('<div class="colum_name" style="width:5em;">パス</div>'),
      sort: false,
      formatter: (cell) => {
        let path_like_objects_safe = cell;
        let next_query = `&next=${encodeURIComponent(location)}`;
        let s = path_like_objects_safe.map(obj=>`
            <span class='text-nowrap'>/<a href='/cms/show_tag/${obj.id}?${next_query}'>${obj.name}</a></span>
          `).join('');
        return handle_html(s);
      },
    },
    {
      id: "created_at",
      name: handle_html('<div class="colum_name" style="width:5em;">作成日時</div>'),
      formatter: (cell) => {
        return new Date(cell).toLocaleString();
      },
    },
    {
      id: 'star',
      name: handle_html('<div class="colum_name" style="width:5em;">スター</div>'),
      formatter: (cell, row) => {
        let n = cell;
        if(n){
          return '☆'.repeat(n);
        }else{
          return '-';
        }
      },
    },
    {
      id: "publicity",
      name: handle_html('<div class="colum_name" style="width:5em;">公開状態</div>'),
      formatter: (publicity) => {
        let label;
        if (publicity==0){
          label = "非公開";
        }else if(publicity==1){
          label = "公開";
        }else{
          label = "不明";
        }
        return label;
      },
    },
    {
      id: "user",
      name: handle_html('<div class="colum_name" style="width:5em;">ユーザ</div>'),
      formatter: (cell) => {
        const user = cell;
        return handle_html(get_user_badge_html(user));
      },
    },
  ]
}


const get_card_data = (card) => [
  card,
  card.id,
  card.card_fields,
  card.supplement_content,
  card.project_safe,
  card.tags_safe,
  card.qa_set_with_user_rm,
  card.created_at,
  card.publicity,
  card.is_project_default_template,
  card.user,
]


const get_card_columns = (container_id, handle_html=null, on_delete_name="null", single_display=false)=> {
  
  if(!handle_html) handle_html = (s)=>s;
  return [
    {
      id: 'checkbox',
      name: handle_html('<div class="colum_name" style="width:2.5em;">選択</div>'),
      sort: false,
      plugin: {
        component: gridjs.plugins.selection.RowSelection,
        // RowSelection config
        props: {
          // use the "id" column as the row identifier
          id: (row) => row.cell(1).data.id
        }
      }
    },
    {
      id: "operation",
      name: handle_html('<div class="colum_name" style="width:2.5em;">操作</div>'),
      formatter: (card, row) => {
        let card_id =row.cells[1].data.id;
        let next_query = `&next=${encodeURIComponent(location)}`;
        if(!request_user.is_authenticated)return '-';
        return handle_html(`
          ${card.is_pdt ? `<div class="text-warning text-nowrap">テンプレート</div>` : ''}
          ${
            card.user.id === request_user.id || card.qa_set_with_user_rm.some(qa=>qa.user_rm) ? `
              <a href="/cms/edit_card/${card_id}/?${next_query}" class="btn btn-outline-primary btn-sm text-nowrap m-1" 
                title="カードを編集"><i class="bi bi-pencil"></i></a>
            ` : ``
          }
          ${
            card.user.id === request_user.id ? `
              <button class="btn btn-outline-danger btn-sm del_confirm text-nowrap m-1" data-toggle="modal"
                data-target="#deleteModal" title="カードを削除"
                onclick="show_confmodal__delete_cards('${container_id}', ['${card_id}'], ${on_delete_name})">
                  <i class="bi bi-trash"></i></button>
            ` : `
              ${
                card.qa_set_with_user_rm.some(qa=>qa.user_rm) ? `
                <button class="btn btn-outline-danger btn-sm del_confirm m-1" data-toggle="modal" 
                  data-target="#deleteModal" data-bs-toggle="tooltip" title="ブックマーク解除" 
                  onclick="show_confmodal__remove_qa_bookmarks('${container_id}', [${card.qa_set_with_user_rm.map(qa=>`\'${qa.id}\'`).join(',')}], ${on_delete_name})">
                  <i class="material-icons md-15" style="position:relative;top:0.15em;">bookmark_remove</i></button>
                ` : ''
              }
              ${
                card.qa_set_with_user_rm.some(qa=>!qa.user_rm) ? `
                <button class="btn btn-outline-success btn-sm del_confirm m-1" data-toggle="modal" 
                  data-target="#deleteModal" data-bs-toggle="tooltip" title="ブックマークに追加" 
                  onclick="show_confmodal__add_qa_bookmarks('${container_id}', [${card.qa_set_with_user_rm.map(qa=>`\'${qa.id}\'`).join(',')}], ${on_delete_name})" >
                  <i class="material-icons md-15" style="position:relative;top:0.15em;">bookmark_add</i></button>
                ` : ''
              }
            `
          }
          <a href="/cms/add_card/?copied_from=${card_id}${next_query}" class="btn btn-outline-warning btn-sm text-nowrap m-1" title="カードをコピー"><i class="bi bi-files"></i></a>
        `);
      },
      sort: false,
    },
    {
      id:"id",
      name: handle_html('<div class="colum_name" style="width:5em;">カードID</div>'),
      formatter: (card_id, row) => {
        return handle_html(`
          <a href='/cms/show_card/${card_id}?next=${encodeURIComponent(location)}' class="">
            ${single_display?card_id:card_id.slice(0,4)+'...'}
          </a>
        `);
      },
    },
    {
      id: "card_fields",
      name: handle_html('<div class="colum_name" style="width:5em;">カードフィールド</div>'),
      width: "100%",
      sort: false,
      formatter: (cell, row) => {
        let card_id = row.cells[1].data.id;
        let card_fields = cell
        let s = "";
        for (let i in card_fields){
          s += get_mdfield_html_in_grid(
            card_fields[i].content, 
            card_fields[i].name,
            card_fields[i].read_aloud_lang,
            `md_to_html_target_${card_id}_${i}_${container_id}`,
            ['md_to_html_target', `md_to_html_target_${card_id}_${i}_${container_id}`, 'card_field_box'],
            text_color=null,
            border_color=card_fields[i].oic_color,
          )
        }
        return handle_html(s);
      },
      sort: false,
    },
    {
      id: "supplement_content",
      name: handle_html('<div class="colum_name" style="width:5em;">補足</div>'),
      sort: false,
      formatter: (cell, row) => {
        let card_id = row.cells[1].data.id;
        let supplement = cell
        return handle_html(`
        ${get_mdfield_html_in_grid(
            supplement, 
            '補足',
            '',
            `card_supplement_box_${card_id}`,
            ['md_to_html_target', `md_to_html_target_${card_id}`, 'card_supplement_box'],
          )}
        `);
      },
      sort: false,
    },
    
    {
      id: "project",
      name: handle_html('<div class="colum_name" style="width:7em;">プロジェクト</div>'),
      formatter: (project, row) => {
        if (project) {
          let s = get_project_badge_html(project);
          return handle_html(s);
        }
        else return handle_html('<i class="bi bi-flag-fill me-1"></i>-');
      },
      sort: {compare: (a, b) => {
          const code = (x) => x?x.path:"";
          return (code(a)>code(b))?1:(code(a)>code(b)?-1:0)
      }},
    },
    {
      id: "tags",
      name: handle_html('<div class="colum_name" style="width:5em;">タグ</div>'),
      sort: false,
      formatter: (cell, row) => {
        let tags = cell;
        let s = tags.map(tag=>get_tag_badge_html(tag)).join('');
        if(!tags.length) s += '<i class="bi bi-tag-fill me-1"></i>-'
        return handle_html(s);
      },
      sort: false,
    },
    {
      id: "qa_set",
      name: handle_html('<div class="colum_name" style="width:11em;">問題パターン(復習管理)</div>'),
      sort: false,
      formatter: (cell, row) => {
        let qa_set = cell;
        let next_query = `&next=${encodeURIComponent(location)}`;
        let s = qa_set.map(qa=>{
          const rm_html = qa.user_rm ? `
              (<a href='/cms/show_rm/${qa.user_rm.id}?${next_query}' style="text-decoration:none;" >
                <i class="bi bi-stopwatch"></i>AL:${qa.user_rm.absorption_level}
              </a>)
            ` : '';
          return `
          <div class="m-1 text-nowrap">
            ${qa.question_field.name} → ${qa.answer_field.name} : 
            <i class="material-icons md-18" style="position:relative;top:0.15em;">group</i> ${qa.rm_set_count} 
            ${rm_html}
          </div>`
        }).join('');
        return handle_html(s)
      },
    },
    {
      id: "created_at",
      name: handle_html('<div class="colum_name" style="width:5em;">作成日時</div>'),
      formatter: (cell) => {
        return new Date(cell).toLocaleString();
      },
    },
    {
      id: "publicity",
      name: handle_html('<div class="colum_name" style="width:5em;">公開状態</div>'),
      formatter: (cell, row) => {
        if (cell==0){
          return "非公開";
        } else if (cell==1){
          return "公開";
        } else {
          return "不明";
        }
      },
    },
    {
      id: "is_project_default_template",
      name: handle_html('<div class="colum_name" style="width:5em;">PDT指定</div>'),
      formatter: (cell, row) => {
        if (cell){
          return "True";
        } else{
          return "False";
        }
      },
    },
    {
      id: "user",
      name: handle_html('<div class="colum_name" style="width:5em;">ユーザ</div>'),
      formatter: (cell) => {
        const user = cell;
        return handle_html(get_user_badge_html(user));
      },
      sort: {compare: (a, b) => {
          const code = (x) => x.nickname;
          return (code(a)>code(b))?1:(code(a)>code(b)?-1:0)
      }},
    },
  ]
}


const get_rm_data = rm => [
  rm, // row.cells[1].data
  rm.id,
  rm.qa.card,
  rm.qa.question_field,
  rm.qa.answer_field,
  rm.qa.card.supplement_content,
  rm.qa.card.project_safe,
  rm.qa.card.tags_safe,
  rm.last_reviewed_at,
  rm.next_review_date,
  rm.ingestion_level,
  rm.absorption_level,
  rm.urgency,
  rm.user,
  rm.qa.order_in_card,
  rm.need_session,
  rm.is_active,
  rm.ul_review_interval,
  rm.actual_review_interval,
  rm.importance,
  rm.estimated_time,
  rm.highest_absorption_level,
  rm.postpone_to,
  rm.last_updated_at,
  rm.created_at,
  rm.standard_review_interval,
  rm.dependency_rm_set,
  rm.interval_increase_rate,
]


const get_rm_columns = (container_id, handle_html=null, on_delete_name="null", single_display=false)=> {
  if(!handle_html) handle_html = (s)=>s;
  return [
  {
      id: 'checkbox',
      name: handle_html('<div class="colum_name" style="width:2.5em;">選択</div>'),
      sort: false,
      plugin: {
        component: gridjs.plugins.selection.RowSelection,
        props: {
          id: (row) => {
            return row.cell(1).data.id
          }

        }
      },
    },
    {
      id: "operation",
      name: handle_html('<div class="colum_name" style="width:2.5em;">操作</div>'),
      formatter: (rm, row) => {
        return handle_html(
          `${rm.is_pdt ? `<div class="text-warning text-nowrap">テンプレート</div>` : ''}
            ${get_rm_buttons_html(rm, rm.qa, rm.qa.card, container_id, on_delete_name)}
          `
          );
      },
      sort: false,
    },
    {
      id: "id",
      name: handle_html('<div class="colum_name" style="width:7em;">復習管理ID</div>'),
      formatter: (rm_id) => {
        let next_query = `&next=${encodeURIComponent(location)}`;
        return handle_html(`
          <a href='/cms/show_rm/${rm_id}?${next_query}' class="">
            ${single_display?rm_id:rm_id.slice(0,4)+'...'}
          </a>
        `);
      },
    },
    {
      id: "card",
      name: handle_html('<div class="colum_name" style="width:5em;">カードID</div>'),
      formatter: (card) => {
        let card_id = card.id;
        let next_query = `&next=${encodeURIComponent(location)}`;
        return handle_html(`
          <a href='/cms/show_card/${card_id}?${next_query}' class="">
            ${single_display?card_id:card_id.slice(0,4)+'...'}
          </a>
        `);
      },
    },
    {
      id: "question_field",
      name: handle_html('<div class="colum_name" style="width:5em;">問題</div>'),
      sort: false,
      formatter: (cell, row) => {
        let rm_id = row.cells[1].data.id;
        let question_field = cell
        return handle_html(`
          ${get_mdfield_html_in_grid(
            question_field.content, 
            question_field.name,
            question_field.read_aloud_lang,
            `question_field_textarea_${rm_id}_${container_id}`,
            ['md_to_html_target', `md_to_html_target_${rm_id}_${container_id}`, 'question_field_box'],
            text_color=null,
            border_color=question_field.oic_color,
          )}
        `);
      },
      sort: false,
    },
    {
      id: "answer_field",
      name: handle_html('<div class="colum_name" style="width:5em;">解答</div>'),
      sort: false,
      formatter: (cell, row) => {
        let rm_id = row.cells[1].data.id;
        let answer_field = cell
        return handle_html(`
          ${get_mdfield_html_in_grid(
            answer_field.content, 
            answer_field.name,
            answer_field.read_aloud_lang,
            `answer_field_textarea_${rm_id}_${container_id}`,
            ['md_to_html_target', `md_to_html_target_${rm_id}_${container_id}`, 'answer_field_box'],
            text_color=null,
            border_color=answer_field.oic_color,
          )}
        `);
      },
      sort: false,
    },
    {
      id: "supplement",
      name: handle_html('<div class="colum_name" style="width:5em;">補足</div>'),
      sort: false,
      formatter: (cell, row) => {
        let rm_id = row.cells[1].data.id;
        let supplement = cell
        return handle_html(`
        ${get_mdfield_html_in_grid(
            supplement, 
            '補足',
            '',
            `card_supplement_textarea_${rm_id}_${container_id}`,
            ['md_to_html_target', `md_to_html_target_${rm_id}_${container_id}`, 'card_supplement_box'],
          )}
        `);
      },
      sort: false,
    },
    {
      id: "project",
      name: handle_html('<div class="colum_name" style="width:7em;">プロジェクト</div>'),
      formatter: (project, row) => {
        if (project) {
          let s = get_project_badge_html(project);
          return handle_html(s);
        }
        else return handle_html('<i class="bi bi-flag-fill me-1"></i>-');
      },
      sort: {compare: (a, b) => {
          const code = (x) => x?x.path:"";
          return (code(a)>code(b))?1:(code(a)>code(b)?-1:0)
      }},
    },
    {
      id: "tags",
      name: handle_html('<div class="colum_name" style="width:5em;">タグ</div>'),
      sort: false,
      formatter: (cell, row) => {
        let tags = cell;
        let s = tags.map(tag=>get_tag_badge_html(tag)).join('');
        if(!tags.length) s += '<i class="bi bi-tag-fill me-1"></i>-'
        return handle_html(s);
      },
      sort: false,
    },
    {
      id: "last_reviewed_at",
      name: handle_html('<div class="colum_name" style="width:5em;">最終復習日時</div>'),
      formatter: (cell) => {
        return cell ? new Date(cell).toLocaleString(): "-";
      },
    },
    {
      id: "next_review_date",
      name: handle_html('<div class="colum_name" style="width:5em;">次回復習日</div>'),
      formatter: (cell) => {
        const s = cell ? new Date(cell).toLocaleDateString(): "-";
        let text_color = '';
        if(cell){
          if (s == new Date().toLocaleDateString()){
            text_color = 'text-primary';
          }
          else if (new Date(cell).getTime() < new Date().getTime()){
            text_color = 'text-danger';
          }
        }
        return handle_html(`
          <p class="${text_color}">${s}</p>
        `);
      },
    },
    {
      id: "ingestion_level",
      name: handle_html('<div class="colum_name" style="width:6em;">摂取レベル</div>'),
      formatter: (cell) => `IL: ${cell}`,
    },
    {
      id: "absorption_level",
      name: handle_html('<div class="colum_name" style="width:6em;">定着レベル</div>'),
      formatter: (cell) => `AL: ${cell}`,
    },
    {
      id: "urgency",
      name: handle_html('<div class="colum_name" style="width:5em;">緊急度</div>'),
      formatter: (cell) => {
        const urgency = cell;
        let color_style = '';
        if (urgency>=50) color_style = 'color:red;';
        else if (urgency>0) color_style = 'color:yellow;';
        return handle_html(`<i class="bi bi-alarm me-2"></i><span style='${color_style}'>${urgency}</span>`);
      },
    },
    {
      id: "user",
      name: handle_html('<div class="colum_name" style="width:5em;">ユーザ</div>'),
      sort: false,
      formatter: (cell) => {
        const user = cell;
        return handle_html(get_user_badge_html(user));
      },
      sort: {compare: (a, b) => {
          const code = (x) => x.nickname;
          return (code(a)>code(b))?1:(code(a)>code(b)?-1:0)
      }},
    },
    {
      id: "order_in_card",
      name: handle_html('<div class="colum_name" style="width:6em;">カード内順序</div>'),
    },
    {
      id: "need_session",
      name: handle_html('<div class="colum_name" style="width:8em;">要セッション指定</div>'),
      formatter: (need_session, row) => {
        if (need_session===false){
          return "隙間時間復習可能";
        } else if (need_session===true){
          return "要セッション";
        } else {
          return "不明";
        }
      },
    },
    {
      id: "is_active",
      name: handle_html('<div class="colum_name" style="width:5em;">活動状態</div>'),
      formatter: (is_active, row) => {
        console.log(is_active)
        let label;
        if (is_active===true){
          label = "アクティブ";
        }else if(is_active===false){
          label = "凍結中";
        }else{
          label = "-";
        }
        return label;
      },
    },
    {
      id: "ul_review_interval",
      name: handle_html('<div class="colum_name" style="width:7em;">上限復習間隔</div>'),
      formatter: (cell) => {
        if(typeof cell === 'number'){
          return `${cell / (24 * 60 * 60)} 日`
        }
        let i_P = cell.indexOf('P');
        let i_DT = cell.indexOf('DT');
        return `${cell.slice(i_P+1, i_DT)} 日`
      },
    },
    {
      id: "actual_review_interval",
      name: handle_html('<div class="colum_name" style="width:7em;">実際復習間隔</div>'),
      formatter: (cell) => {
        if(typeof cell === 'number'){
          return `${cell / (24 * 60 * 60)} 日`
        }
        let i_P = cell.indexOf('P');
        let i_DT = cell.indexOf('DT');
        return `${cell.slice(i_P+1, i_DT)} 日`
      },
    },
    {
      id: "importance",
      name: handle_html('<div class="colum_name" style="width:7em;">重要度</div>'),
      formatter: (cell) => {
        const urgency = cell;
        let color_style = '';
        if (urgency>=5) color_style = 'color:orange;';
        else if (urgency>4) color_style = 'color:yellow;';
        return handle_html(`<i class="bi bi-exclamation-triangle me-2"></i><span style='${color_style}'>${urgency}</span>`);
      },
    },
    {
      id: "estimated_time",
      name: handle_html('<div class="colum_name" style="width:7em;">予想所要時間</div>'),
      formatter: (cell) => {
        let H, M, S;
        if(typeof cell === 'number'){
          H, M, S = get_time_hms_from_sec(cell);
        }else{
          let i_DT = cell.indexOf('DT');
          let i_H = cell.indexOf('H');
          let i_M = cell.indexOf('M');
          let i_S = cell.indexOf('S');
          H = parseInt(cell.slice(i_DT+2, i_H));
          M = parseInt(cell.slice(i_H+1, i_M));
          S = parseInt(cell.slice(i_M+1, i_S));
        }
       
        let text = '';
        if(H)text += `${H} 時間 `;
        if(M)text += `${M} 分 `;
        if(S)text += `${S} 秒 `;
        return text;
      },
    },
    {
      id: "highest_absorption_level",
      name: handle_html('<div class="colum_name" style="width:8em;">最高定着レベル</div>'),
      formatter: (cell) => `HAL: ${cell}`,
    },
    {
      id: "postpone_to",
      name: handle_html('<div class="colum_name" style="width:6em;">延期先日時</div>'),
      formatter: (cell) => {
        let postpone_to = new Date(cell);
        let color_style = "";
        if (postpone_to < new Date()){
          color_style = 'color:gray;';
        }
        return handle_html(`<div style='${color_style}'>${postpone_to.toLocaleString()}</div>`);
      },
    },
    {
      id: "last_updated_at",
      name: handle_html('<div class="colum_name" style="width:7em;">最終更新日時</div>'),
      formatter: (cell) => {
        return new Date(cell).toLocaleString();
      },
    },
    {
      id: "created_at",
      name: handle_html('<div class="colum_name" style="width:5em;">作成日時</div>'),
      formatter: (cell) => {
        return new Date(cell).toLocaleString();
      },
    },
    {
      id: "standard_review_interval",
      name: handle_html('<div class="colum_name" style="width:7em;">標準復習間隔</div>'),
      formatter: (cell) => {
        if(typeof cell === 'number'){
          return `${cell / (24 * 60 * 60)} 日`
        }
        let i_P = cell.indexOf('P');
        let i_DT = cell.indexOf('DT');
        return `${cell.slice(i_P+1, i_DT)} 日`
      },
    },
    {
      id: "dependency_rm_set",
      name: handle_html('<div class="colum_name" style="width:7em;">依存先復習管理</div>'),
      sort: false,
      formatter: (cell) => {
        let dependency_rm_set = cell;
        let s = '';
        let next_query = `&next=${encodeURIComponent(location)}`;
        s = dependency_rm_set.map(deptr=>`
          <a href='/cms/show_rm/${deptr.id}?${next_query}' class="">
            ${deptr.id.slice(0,4)+'...'}
          </a>
        `).join('');
        return handle_html(s);
      },
    },
    {
      id: "interval_increase_rate",
      name: handle_html('<div class="colum_name" style="width:6em;">間隔増加率</div>'),
      formatter: (cell) => `${cell}倍`,
    },
  ]
}