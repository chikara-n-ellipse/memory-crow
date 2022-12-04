import json
from django.contrib.auth import get_user_model, authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import render, get_object_or_404, redirect
from django.urls import reverse
from django.http import HttpResponseRedirect, HttpResponse, QueryDict, Http404
from django.utils.http import urlencode

from cms.schema import (
        RequestUserOutSchema
    )


from users.forms import UserConfForm


from social_django.utils import psa, load_strategy

from cms.views import get_next_url


User = get_user_model()

# Create your views here.


# ユーザ

@login_required
def user_dashboard(request):
    request_user_json = json.dumps(RequestUserOutSchema.from_orm(request.user).json())
    return render(request, 'cms/user_dashboard.html', dict(
            request_user_json=request_user_json,
        ))


# # ログイン
# def login_view(request):

#     # POST
#     if request.method == 'POST':
#         # フォーム入力のユーザーID・パスワード取得
#         email = request.POST.get('email')
#         password = request.POST.get('password')

#         # Djangoの認証機能
#         user = authenticate(email=email, password=password)

#         # ユーザー認証
#         if user:
#             #ユーザーアクティベート判定
#             if user.is_active:
#                 # ログイン
#                 login(request,user)
#                 # ダッシュボードページ遷移
#                 return HttpResponseRedirect(reverse('users:user_dashboard', kwargs={'user_id': user.id}))
#             else:
#                 # アカウント利用不可
#                 return HttpResponse("アカウントが有効ではありません")
#         # ユーザー認証失敗
#         else:
#             return HttpResponse("ログインIDまたはパスワードが間違っています。<br />ブラウザの「戻る」を押してください。")
#     # GET
#     else:
#         return render(request, 'cms/login.html')

# ログイン（Google OAuth）
def login_view(request):
    # return HttpResponseRedirect('social:begin', kwargs=dict(backend='google-oauth2'))
    return HttpResponseRedirect(reverse('social:begin', kwargs=dict(backend='google-oauth2')))


#ログアウト
@login_required
def logout_view(request):
    logout(request)
    # ログイン画面遷移
    return HttpResponseRedirect(reverse('top'))


# #新規登録
# class  AccountRegistration(TemplateView):

#     def __init__(self):
#         self.params = {
#             "AccountCreate":False,
#             "account_form": AccountForm()
#         }

#     #Get処理
#     def get(self,request):
#         self.params["account_form"] = AccountForm()
#         self.params["AccountCreate"] = False
#         return render(request,"cms/register.html",context=self.params)

#     #Post処理
#     def post(self,request):
#         self.params["account_form"] = AccountForm(data=request.POST)
        
#         #フォーム入力の有効検証
#         if self.params["account_form"].is_valid():
#             user = self.params["account_form"].save(commit=False)
#             # パスワードをハッシュ化
#             user.set_password(user.password)
#             # API用トークンを生成
#             user.create_and_set_new_token()
#             # ユーザアカウントをDBに保存
#             user.save()
#             self.params["user"] = user

#             # アカウント作成情報更新
#             self.params["AccountCreate"] = True

#         else:
#             # フォームが有効でない場合
#             print(self.params["account_form"].errors)

#         return render(request,"cms/register.html", context=self.params)


def first_nickname(request):
    strategy = load_strategy()
    partial_token = request.GET.get("partial_token")
    partial = strategy.partial_load(partial_token)
    return render(request, 'users/first_nickname.html', dict(
            partial_token=partial_token,
            partial_backend_name=partial.backend,
        ))


# ユーザ設定
@login_required
def edit_userconf(request):
    """ユーザ設定の編集"""
    action_parameters = {}
    next_url = get_next_url(request)
    if next_url:
        action_parameters['next'] = next_url
    
    if request.method == 'POST':
        form = UserConfForm(request.POST, user=request.user)  # POST された request データからフォームを作成
        is_valid = True
        if form.is_valid():    # フォームのバリデーション
            request.user.nickname = form.cleaned_data['nickname']
            if not (request.user.nickname and len(request.user.nickname)):
                is_valid = False
            if is_valid:
                request.user.save()
                if next_url:
                    return redirect(next_url)
                return redirect('users:user_dashboard',)
    else:    # GET の時
        form = UserConfForm(user=request.user)  # user インスタンスからフォームを作成
    return render(request, 'users/edit_userconf.html', dict(
            form=form,
            next=next_url,
            action_parameters=urlencode(action_parameters),
        ))
