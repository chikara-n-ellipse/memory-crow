from django.urls import path
from users import views

app_name = 'users'
urlpatterns = [

    # ユーザ
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    # path('register/', views.AccountRegistration.as_view(), name='register'),   # ユーザ登録
    path('user_dashboard/', views.user_dashboard, name='user_dashboard'),   # ユーザページ
    path('first_nickname/', views.first_nickname, name='first_nickname'),

    path('edit_userconf/', views.edit_userconf, name='edit_userconf'),# ユーザ設定
    
]