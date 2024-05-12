import json
from django.shortcuts import render, get_object_or_404, redirect
from cms.models import Project, ProjectLearningManagement, Tag, Card, CardField, ReviewManagement, get_qiai_to_oic
from cms.forms import LearnConfForm
from django.views.generic.list import ListView
import logging
from django.db import transaction
from django.contrib.auth import get_user_model
from django.utils.http import urlencode
import urllib
from typing import List, Dict, Any, Union, Tuple

from django.shortcuts import render
from django.views.generic import TemplateView #テンプレートタグ

from mdeditor.fields import MDTextFormField
from mdeditor.widgets import MDEditorWidget

from django.http import HttpResponseRedirect, HttpResponse, QueryDict, Http404

from django.template.response import TemplateResponse

# 認証用
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin

from cms.schema import (
        RequestUserOutSchema, PublicUserOutSchema, 
        ProjectRichOutSchema, TagRichOutSchema, 
        CardRichOutSchema, RmRichOutSchema, GetTagsResponseSchema, 
    )

logger = logging.getLogger('myapp')
User = get_user_model()


def get_next_url(request):
    qd = QueryDict(request.META['QUERY_STRING'])
    next_url = qd.get("next", None)
    if isinstance(next_url, list):
        if len(next_url):
            next_url = next_url[0]
        else:
            next_url = None
    if next_url == "None":
        next_url = None
    if next_url:
        # URL decoding
        next_url = urllib.parse.unquote(next_url)
    return next_url


# Create your views here.


def top(request):
    request_user_json = json.dumps(RequestUserOutSchema.from_orm(request.user).json())
    return render(request, 'cms/top.html', dict(
            request_user_json=request_user_json,
        ))


def how_to_use(request):
    request_user_json = json.dumps(RequestUserOutSchema.from_orm(request.user).json())
    return render(request, 'cms/how_to_use.html', dict(
            request_user_json=request_user_json,
        ))


def close_window(request):
    request_user_json = json.dumps(RequestUserOutSchema.from_orm(request.user).json())
    return render(request, 'cms/close_window.html', dict(
        request_user_json=request_user_json,
    ))


def show_user(request, tuser_id):
    """ユーザの公開ページ"""
    request_user_json = json.dumps(RequestUserOutSchema.from_orm(request.user).json())
    tuser = get_object_or_404(User, pk=tuser_id)
    
    action_parameters = {}
    next_url = get_next_url(request)
    if next_url:
        action_parameters['next'] = next_url
    
    tuser_json = json.dumps(PublicUserOutSchema.from_orm(tuser).json())

    return render(request, 'cms/show_user.html', dict(
            request_user_json=request_user_json,
            tuser_id=tuser.id,
            tuser=tuser,
            tuser_json=tuser_json,
            next=next_url,
            action_parameters=urlencode(action_parameters),
        ))


# プロジェクト


@login_required
def list_projects(request, *args, **kwargs):
    request_user_json = json.dumps(RequestUserOutSchema.from_orm(request.user).json())
    return render(request, 'cms/list_projects.html', dict(
        request_user_json=request_user_json,
    ))


@login_required
def add_project(request):
    """プロジェクトの追加"""
    return edit_project(request, project_id=None)


@login_required
def edit_project(request, project_id):
    """プロジェクトの編集"""
    request_user_json = json.dumps(RequestUserOutSchema.from_orm(request.user).json())
    action_parameters = {}
    next_url = get_next_url(request)
    if next_url:
        action_parameters['next'] = next_url
    
    if project_id:
        """ project_id が指定されている (修正) """
        project = get_object_or_404(Project, id=project_id)
        _ = get_object_or_404(ProjectLearningManagement, project=project_id, user=request.user)
        if project.user != request.user and project.publicity == 0:
            raise Http404("Wrong project id")
    else:
        """ project_id が指定されていない (新規作成) """
        project = Project()
        user_plm = ProjectLearningManagement()
        project.user = request.user
        user_plm.user = request.user
        user_plm.project = project
        
        project.user_plm = user_plm
    
    # if request.method == 'POST':
    #     form = ProjectForm(request.POST, instance=project)  # POST された request データからフォームを作成
    #     if form.is_valid():    # フォームのバリデーション
    #         project = form.save(commit=False)
    #         if project.parent:
    #             parent_pathlike_ids = project.parent.pathlike_ids
    #             if len(parent_pathlike_ids) >= 4:
    #                 project.parent = None
    #             if project.id in parent_pathlike_ids:
    #                 project.parent = None
    #         project.save()
    #         if next_url:
    #             return redirect(next_url)
    #         return redirect('cms:list_projects',)
            
    # else:    # GET の時
    #     form = ProjectForm(instance=project)  # project インスタンスからフォームを作成

    if project_id:
        project.set_safe(request.user)
        project_json=json.dumps(ProjectRichOutSchema.from_orm(project).json())
        if project.parent:
            project.parent.set_safe(request.user)
            parent_project_json=json.dumps(ProjectRichOutSchema.from_orm(project.parent).json())
        else:
            parent_project_json = '\"null\"'
    else:
        project_json = '\"null\"'
        parent_project_json = '\"null\"'

    return render(request, 'cms/edit_project.html', dict(
            project_id=project_id,
            project=project,
            project_json=project_json,
            parent_project_json=parent_project_json,
            next=next_url,
            action_parameters=urlencode(action_parameters),
            request_user_json=request_user_json,
        ))


def show_project(request, project_id):
    """プロジェクトページ"""
    request_user_json = json.dumps(RequestUserOutSchema.from_orm(request.user).json())
    project = get_object_or_404(Project, pk=project_id)
    if project.user != request.user and project.publicity==0:
        raise Http404("Can't see item belong to others")
    
    action_parameters = {}
    next_url = get_next_url(request)
    if next_url:
        action_parameters['next'] = next_url
    
    project.set_safe(request.user)
    project_json = json.dumps(ProjectRichOutSchema.from_orm(project).json())

    return render(request, 'cms/show_project.html', dict(
            project_id=project_id,
            project=project,
            project_json=project_json,
            next=next_url,
            action_parameters=urlencode(action_parameters),
            request_user_json=request_user_json,
        ))


# タグ


@login_required
def list_tags(request, *args, **kwargs):
    request_user_json = json.dumps(RequestUserOutSchema.from_orm(request.user).json())
    return render(request, 'cms/list_tags.html', dict(
        request_user_json=request_user_json,
    ))

# class TagList(LoginRequiredMixin, ListView):
#     """タグの一覧"""
#     context_object_name='tags'
#     template_name='cms/list_tags.html'
#     paginate_by = 10  # １ページは最大2件ずつでページングする

#     def get(self, request, *args, **kwargs):
#         request_user_json = json.dumps(RequestUserOutSchema.from_orm(request.user).json())
#         tags = Tag.objects.filter(user=request.user).order_by('created_at').reverse()
#         self.object_list = tags

#         context = self.get_context_data(object_list=self.object_list)
#         return self.render_to_response(context)


@login_required
def add_tag(request):
    """タグの追加"""
    return edit_tag(request, tag_id=None)


@login_required
def edit_tag(request, tag_id):
    """タグの編集"""
    request_user_json = json.dumps(RequestUserOutSchema.from_orm(request.user).json())
    action_parameters = {}
    next_url = get_next_url(request)
    if next_url:
        action_parameters['next'] = next_url
    
    if tag_id:   # tag_id が指定されている (修正時)
        tag = get_object_or_404(Tag, pk=tag_id)
        if tag.user != request.user:
            raise Http404("Can't edit or delete item belong to others")
    else:         
        # tag_id が指定されていない (追加時)
        tag = Tag()
        tag.user = request.user
    # if request.method == 'POST':
    #     form = TagForm(request.POST, instance=tag)  # POST された request データからフォームを作成
    #     if form.is_valid():    # フォームのバリデーション
    #         tag = form.save(commit=False)
    #         if tag.parent:
    #             parent_pathlike_ids = tag.parent.pathlike_ids
    #             if len(parent_pathlike_ids) >= 4:
    #                 tag.parent = None
    #             if tag.id in parent_pathlike_ids:
    #                 tag.parent = None
    #         tag.save()
    #         if next_url:
    #             return redirect(next_url)
    #         return redirect('cms:list_tags' ,)
    # else:    # GET の時
    #     form = TagForm(instance=tag)  # tag インスタンスからフォームを作成

    if tag_id:
        tag.set_safe(request.user)
        tag_json=json.dumps(TagRichOutSchema.from_orm(tag).json())
        if tag.parent:
            tag.parent.set_safe(request.user)
            parent_tag_json=json.dumps(TagRichOutSchema.from_orm(tag.parent).json())
        else:
            parent_tag_json = '\"null\"'
    else:
        tag_json = '\"null\"'
        parent_tag_json = '\"null\"'

    return render(request, 'cms/edit_tag.html', dict(
            request_user_json=request_user_json,
            tag_id=tag_id,
            tag=tag,
            tag_json=tag_json,
            parent_tag_json=parent_tag_json,
            next=next_url,
            action_parameters=urlencode(action_parameters),
        ))



def get_initial_card_states(request, card_id):
    card = get_object_or_404(Card, pk=card_id)
    if card.user != request.user and card.publicity!=1:
        raise Http404("Wrong template card ID.")
    card_fields = list(card.card_fields.order_by('order_in_card'))
    ncf = len(card_fields)
    qa_set = list(card.qa_set.order_by('order_in_card'))
    initial_qa_choices = []
    for qa in qa_set:
        initial_qa_choices.append(qa.qiai)
    return card, card_fields, ncf, qa_set, initial_qa_choices



def show_tag(request, tag_id):
    """タグ閲覧ページ"""
    request_user_json = json.dumps(RequestUserOutSchema.from_orm(request.user).json())
    tag = get_object_or_404(Tag, pk=tag_id)
    if tag.user != request.user and tag.publicity==0:
        raise Http404("Can't see item belong to others")
    
    action_parameters = {}
    next_url = get_next_url(request)
    if next_url:
        action_parameters['next'] = next_url
    
    tag.set_safe(request.user)

    tag_json = json.dumps(TagRichOutSchema.from_orm(tag).json())

    return render(request, 'cms/show_tag.html', dict(
            request_user_json=request_user_json,
            tag_id=tag_id,
            tag=tag,
            tag_json=tag_json,
            next=next_url,
            action_parameters=urlencode(action_parameters),
        ))


# カード


@login_required
def list_cards(request, *args, **kwargs):
    request_user_json = json.dumps(RequestUserOutSchema.from_orm(request.user).json())
    return render(request, 'cms/list_cards.html', dict(
        request_user_json=request_user_json,
    ))


@login_required
def add_card(request):
    """カードの追加"""
    return edit_card(request, card_id=None)


@login_required
def edit_card(request, card_id):
    """
    カードの編集
    qa_set_to_existの数字はフィールド番号（order_in_card）を表す。"0-1"は問題が0で解答が1の復習管理を表す。
    """
    request_user_json = json.dumps(RequestUserOutSchema.from_orm(request.user).json())
    qd = QueryDict(request.META['QUERY_STRING'])

    action_parameters = {}
    next_url = get_next_url(request)

    if next_url:
        action_parameters['next'] = next_url

    if card_id:
        # card_id が指定されている (修正時)

        card, card_fields, ncf, _, initial_qa_choices = get_initial_card_states(request, card_id)
        initial_project = None
        if card.project and (card.project.user==request.user):
            initial_project = card.project
        initial_tags = []
        for tag in card.tags.iterator():
            if tag.user==request.user:
                initial_tags.append(tag)
        copied_from_id = None
        if card.copied_from_id:
            copied_from = get_object_or_404(Card, id=card.copied_from_id)
            if copied_from.user == request.user or copied_from.publicity == 1:
                copied_from_id = card.copied_from_id

    else:
        # card_id が指定されていない (追加時)

        copied_from_id = qd.get("copied_from", None)
        project_id = qd.get("project", None)
        initial_project = None
        
        if copied_from_id is None and project_id is not None:
            initial_project = get_object_or_404(Project, pk=project_id, user=request.user)
            _tcard = initial_project.default_template_card
            if(_tcard):
                copied_from_id = _tcard.id
        tcard_fields = None
        initial_qa_choices = None

        if copied_from_id:
            tcard, tcard_fields, ncf, _, initial_qa_choices = get_initial_card_states(request, copied_from_id)
            initial_project = tcard.project
            initial_tags = tcard.tags.all()
        else:
            try:
                ncf = int(qd.get("ncf", 2))
            except:
                raise Http404("Query 'ncf' must be integer")
            initial_qa_choices = [
                f"{i}-{j}" for i in range(ncf-1) for j in range(i+1, ncf)
            ]
            initial_tags = []

        card = Card()
        card.user = request.user
        if copied_from_id:
            card.copied_from = tcard
            card.supplement_content = tcard.supplement_content
            card.publicity = tcard.publicity
        card_fields = []
        for i in range(ncf):
            card_field = CardField()
            card_field.card = card
            card_field.order_in_card = i
            card_field.name = tcard_fields[i].name if tcard_fields else "表" if i==0 else "裏" if i==1 else f"裏{i}"
            card_field.read_aloud_lang = tcard_fields[i].read_aloud_lang if tcard_fields else ""
            card_field.content = tcard_fields[i].content if tcard_fields else ""
            card_fields.append(card_field)
    
    # 復習管理の選択肢を作成
    # choiceは"0-1"や"2-0"など。数字はフィールド番号（order_in_card）を表す。"0-1"は問題が0で解答が1の復習管理を表す。
    qa_set_to_exist_choices = []
    for i in range(ncf-1):
        for j in range(i+1, ncf):
            fname_i = card_fields[i].name
            fname_j = card_fields[j].name
            qa_set_to_exist_choices.append({
                    "qi": i,
                    "ai": j,
                    "qiai":f"{i}-{j}",
                    "q_name": fname_i,
                    "a_name": fname_j,
                })
            qa_set_to_exist_choices.append({
                    "qi": j,
                    "ai": i,
                    "qiai":f"{j}-{i}",
                    "q_name": fname_j,
                    "a_name": fname_i,
                })
    
    if initial_project:
        initial_project.set_safe(request.user)
        initial_project_json=json.dumps(ProjectRichOutSchema.from_orm(initial_project).json())
    else:
        initial_project_json = '\"null\"'
    
    initial_tags_json = json.dumps(GetTagsResponseSchema.from_orm({
            "results": [tag.set_safe(request.user) or tag for tag in initial_tags],
            "total_count": len(initial_tags),
            "all_ids": [tag.id for tag in initial_tags],
        }).json())
    
    action_parameters['ncf'] = ncf
    if copied_from_id:
        action_parameters['copied_from_id'] = copied_from_id

    return render(request, 'cms/edit_card.html', dict(
            request_user_json=request_user_json,
            card_id=card_id,
            card=card,
            card_fields=card_fields,
            initial_project=initial_project,
            initial_project_json=initial_project_json,
            initial_tags=initial_tags,
            initial_tags_json=initial_tags_json,
            initial_qa_choices=initial_qa_choices,
            initial_qa_choices_json=json.dumps(initial_qa_choices),
            ncf=ncf,
            qa_set_to_exist_choices=qa_set_to_exist_choices,
            next=next_url,
            action_parameters=urlencode(action_parameters),
        ))



def show_card(request, card_id):
    """プロジェクトページ"""
    request_user_json = json.dumps(RequestUserOutSchema.from_orm(request.user).json())
    card = get_object_or_404(Card, pk=card_id)
    if card.user != request.user and card.publicity==0:
        raise Http404("Can't see item belong to others")
    
    action_parameters = {}
    next_url = get_next_url(request)
    if next_url:
        action_parameters['next'] = next_url

    card.set_is_pdt()
    card.set_rm_users_count()
    card.set_safe(request.user)
    
    card_json = json.dumps(CardRichOutSchema.from_orm(card).json())

    return render(request, 'cms/show_card.html', dict(
            request_user_json=request_user_json,
            card_id=card_id,
            card=card,
            card_json=card_json,
            next=next_url,
            action_parameters=urlencode(action_parameters),
        ))


# 復習管理


@login_required
def list_rm_set(request, *args, **kwargs):
    request_user_json = json.dumps(RequestUserOutSchema.from_orm(request.user).json())
    return render(request, 'cms/list_rm_set.html', dict(
            request_user_json=request_user_json,))


@login_required
def edit_rm(request, rm_id):
    """復習管理情報の編集（ユーザによる復習管理新規作成は無し）"""
    request_user_json = json.dumps(RequestUserOutSchema.from_orm(request.user).json())
    action_parameters = {}
    next_url = get_next_url(request)
    if next_url:
        action_parameters['next'] = next_url
    
    rm = get_object_or_404(
            ReviewManagement.objects.select_related('user', 'qa', 'qa__card', 'qa__card__project', 'qa__card__user',
                            'qa__question_field', 'qa__answer_field')
                        .prefetch_related('dependency_rm_set'), 
            id=rm_id, user=request.user
        )
    
    rm.set_is_pdt()
    rm.set_safe(request.user)
    rm_json = json.dumps(RmRichOutSchema.from_orm(rm).json())

    # if request.method == 'POST':
    #     form = RmForm(request.POST, instance=rm)  # POST された request データからフォームを作成
    #     if form.is_valid():    # フォームのバリデーション
    #         rm.need_session = form.cleaned_data['need_session']
    #         rm.is_active = form.cleaned_data['is_active']
    #         rm.ul_review_interval = form.cleaned_data['ul_review_interval']
    #         rm.ingestion_level = form.cleaned_data['ingestion_level']
    #         rm.absorption_level = form.cleaned_data['absorption_level']
    #         rm.interval_increase_rate = form.cleaned_data['interval_increase_rate']
    #         rm.actual_review_interval = form.cleaned_data['actual_review_interval']
    #         rm.last_reviewed_at = form.cleaned_data['last_reviewed_at']
    #         rm.importance = form.cleaned_data['importance']
    #         rm.estimated_time = form.cleaned_data['estimated_time']
    #         rm.highest_absorption_level = form.cleaned_data['highest_absorption_level']
    #         rm.highest_absorption_level = form.cleaned_data['highest_absorption_level']
            
    #         with transaction.atomic():
    #             rm.save()
    #             rm.dependency_rm_set.set(form.cleaned_data['dependency_rm_set'])

    #         if next_url:
    #             return redirect(next_url)
    #         return redirect('cms:list_rm_set',)
    # else:    # GET の時
    #     form = RmForm(instance=rm)  # qa インスタンスからフォームを作成
    return render(request, 'cms/edit_rm.html', dict(
            request_user_json=request_user_json,
            rm=rm,
            rm_json=rm_json,
            rm_id=rm_id,
            next=next_url,
            action_parameters=urlencode(action_parameters),
        ))



def show_rm(request, rm_id):
    """プロジェクトページ"""
    request_user_json = json.dumps(RequestUserOutSchema.from_orm(request.user).json())
    rm = get_object_or_404(ReviewManagement, pk=rm_id)
    if rm.user != request.user:
        raise Http404("Can't see item belong to others")
    
    action_parameters = {}
    next_url = get_next_url(request)
    if next_url:
        action_parameters['next'] = next_url
    
    rm.set_is_pdt()
    rm.set_safe(request.user)
    rm_json = json.dumps(RmRichOutSchema.from_orm(rm).json())

    return render(request, 'cms/show_rm.html', dict(
            request_user_json=request_user_json,
            rm_id=rm_id,
            rm=rm,
            rm_json=rm_json,
            next=next_url,
            action_parameters=urlencode(action_parameters),
        ))


def str2bool(text):
    return text in ["true", "yes", "on", "True", True]


@login_required
def learn(request):
    request_user_json = json.dumps(RequestUserOutSchema.from_orm(request.user).json())
    action_parameters = {}
    next_url = get_next_url(request)
    if next_url:
        action_parameters['next'] = next_url
    
    qd = QueryDict(request.META['QUERY_STRING'])
    lc = {
        # フィルター一般の設定項目
        "limit": qd.get("limit", 10),
        "project": qd.get("project", None),
        "with_project_descendants": str2bool(qd.get("with_project_descendants", True)),
        "tags": qd.getlist("tags", []),
        "with_tag_descendants": str2bool(qd.get("with_tag_descendants", True)),

        # 学習時特有の設定項目
        "importance_gte": qd.get("importance_gte", 0),
        "activeness": qd.get("activeness", 1),
        "random": str2bool(qd.get("random", False)),
        "urgency_gte": qd.get("urgency_gte", 50),
        "deprms_al_gte": qd.get("deprms_al_gte", 4),
        "new_hot_warm": qd.get("new_hot_warm", 'n-h-w'),
    }
    
    lc_form = LearnConfForm(user = request.user, lc = lc)

    project_id = lc["project"]
    tag_ids = lc["tags"]

    if project_id:
        project = get_object_or_404(Project, id=project_id)
        _ = get_object_or_404(ProjectLearningManagement, project=project_id, user=request.user)
        if project.user != request.user and project.publicity != 1:
            raise Http404("Wrong project id")
        project.set_safe(request.user)
        project_json=json.dumps(ProjectRichOutSchema.from_orm(project).json())
    else:
        project_json = '\"null\"'
    
    tags = []
    for tag_id in tag_ids:
        tag = get_object_or_404(Tag, id=tag_id)
        if tag.user != request.user and tag.publicity != 1:
            raise Http404("Wrong tag id")
        tag.set_safe(request.user)
        tags.append(tag)

    tags_json = json.dumps(GetTagsResponseSchema.from_orm({
            "results": tags,
            "total_count": len(tags),
            "all_ids": tag_ids,
        }).json())


    return render(request, 'cms/learn.html', dict(
            request_user_json=request_user_json,
            next = next_url,
            lc_form = lc_form,
            lc = lc,
            project_id = project_id,
            project_json = project_json,
            tag_ids = tag_ids,
            tags_json = tags_json,
        ))


def my_script(request):
    return TemplateResponse(request, 'cms/js/my_script.js', content_type='application/javascript')


def get_columns(request):
    return TemplateResponse(request, 'cms/js/get_columns.js', content_type='application/javascript')


def show_confmodal(request):
    return TemplateResponse(request, 'cms/js/show_confmodal.js', content_type='application/javascript')


def process_list(request):
    return TemplateResponse(request, 'cms/js/process_list.js', content_type='application/javascript')

