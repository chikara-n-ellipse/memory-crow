from django.urls import path
from cms import views

app_name = 'cms'
urlpatterns = [

    # トップ
    path('', views.top, name='top'),   # トップ

    # ウィンドウを閉じるためのページ
    path('close_window', views.close_window, name='close_window'),

    # ユーザ公開用ページ
    path('show_user/<slug:tuser_id>/', views.show_user, name='show_user'),   # 閲覧

    # 使い方
    path('how_to_use/', views.how_to_use, name='how_to_use'),   # 使い方

    # プロジェクト
    path('list_projects/', views.list_projects, name='list_projects'),   # 一覧
    path('add_project/', views.add_project, name='add_project'),  # 登録
    path('edit_project/<slug:project_id>/', views.edit_project, name='edit_project'),  # 修正
    path('show_project/<slug:project_id>/', views.show_project, name='show_project'),  # 閲覧

    # タグ
    path('list_tags/', views.list_tags, name='list_tags'),   # 一覧
    path('add_tag/', views.add_tag, name='add_tag'),  # 登録
    path('edit_tag/<slug:tag_id>/', views.edit_tag, name='edit_tag'),  # 修正
    path('show_tag/<slug:tag_id>/', views.show_tag, name='show_tag'),  # 閲覧

    # カード
    path('list_cards/', views.list_cards, name='list_cards'),   # 一覧
    path('add_card/', views.add_card, name='add_card'),  # 登録
    path('edit_card/<slug:card_id>/', views.edit_card, name='edit_card'),  # 修正
    path('show_card/<slug:card_id>/', views.show_card, name='show_card'),  # 閲覧

    # 復習管理
    path('list_rm_set/', views.list_rm_set, name='list_rm_set'),   # 一覧
    path('edit_rm/<slug:rm_id>/', views.edit_rm, name='edit_rm'),  # 修正
    path('show_rm/<slug:rm_id>/', views.show_rm, name='show_rm'),  # 閲覧

    path('learn', views.learn, name='learn'),  # 学習

    # javascript
    path('js/my_script.js', views.my_script, name='my_script'),
    path('js/get_columns.js', views.get_columns, name='get_columns'),
    path('js/show_confmodal.js', views.show_confmodal, name='show_confmodal'),
    path('js/process_list.js', views.process_list, name='process_list'),
    
]