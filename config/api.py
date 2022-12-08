from django.http import HttpRequest, HttpResponse
from ninja import NinjaAPI, Schema, Field, Query
from datetime import datetime, date, timedelta
from cms.models import Project, ProjectLearningManagement,Tag, Card, CardField, QA, ReviewManagement, get_qiai_to_oic
from django.contrib.auth import get_user_model
from django.shortcuts import render, get_object_or_404, redirect
from typing import List, Dict, Any, Union, Tuple
from ninja.security import HttpBearer, django_auth
from ninja.errors import ValidationError
from django.core.exceptions import ValidationError as _ValidationError
from uuid import UUID
from django.utils import timezone
from django.db import transaction
from cms.validators import name_validators, lang_validator, DurationRangeValidator

from django.db.models import (
        Q, Count, Case, When, Value, IntegerField, BooleanField, 
        ExpressionWrapper, F, DateTimeField, Subquery,
        DateField, DurationField, Value, CharField, OuterRef,
    )
from django.db.models.functions import Cast, TruncMonth


from cms.schema import *

User = get_user_model()


class LoginRequiredAuth(HttpBearer):
    def authenticate(self, request, token):
        if request.user.is_authenticated:
            return "django_auth"
        else:
            try:
                user = User.objects.get(token=token)
            except:
                user = None
            if user:
                request.user = user
                return token


class PublicAuth(HttpBearer):
    def authenticate(self, request, token):
        return "ok"
        print("public auth aaaaa")
        if request.user.is_authenticated:
            return "django_auth"
        else:
            try:
                user = User.objects.get(token=token)
            except:
                user = None
            if user:
                request.user = user
                return token
        return "Anonymous"


api = NinjaAPI(csrf=True)


def validate_with_ninja(validators, value):
    try:
        for validator in validators:
            validator(value)
    except _ValidationError as e:
        raise ValidationError([{"message":e.message, "params":e.params}])


def get_order_by_strs(f_order_by, f_order_dir, availables=['created_at', 'id']):
    order_by = ['-created_at', 'id']
    additional_order_by = []
    if len(f_order_by)!=len(f_order_dir):
        f_order_dir = ['desc']*len(f_order_by)
    for _order_by, _order_dir in zip(f_order_by, f_order_dir):
        if _order_by in availables:
            if _order_dir == 'desc':
                _order_by = '-' + _order_by
            additional_order_by.append(_order_by)
    order_by = additional_order_by + order_by
    return order_by


# @api.post("/token", auth=None)
# def get_token(request, username: str = Form(...), password: str = Form(...)):
#     if username == "admin" and password == "giraffethinnknslong":
#         return {"token": "supersecret"}

# @api.exception_handler(ValidationError, auth=django_auth)
# def validation_errors(request, exc):
#     return api.create_response(
#         request,
#         {"message": "Invalid input"},
#         is_active=422,
#     )


""" ユーザ単一取得 """
@api.get("/get_user/{user_id}", response=PublicUserOutSchema, auth=None)
def get_user(request, user_id: UUID):
    user = get_object_or_404(User, id=user_id)
    return user


""" ユーザのデフォールトラーニングURLを更新 """
@api.get("/update_user__default_learning_url", auth=django_auth)
def get_user(request, default_learning_url: str):
    request.user.default_learning_url = default_learning_url
    request.user.save()
    return {"user_id": request.user.id, "default_learning_url": default_learning_url}


""" プロジェクト新規作成・更新 """
@api.post("/update_project", response=ProjectOutSchema, auth=django_auth)
def add_project(request, payload: ProjectUpdateRequestSchema):
    """
    プロジェクトを新規作成または修正する。
    plmも同時に修正できる。
    本人以外の場合、plmの新規作成はこのapiでは行わない。
    """
    _project = payload.project
    _plm = payload.plm
    if _project.id:
        project = get_object_or_404(Project, id=_project.id)
        user_plm = get_object_or_404(ProjectLearningManagement, project=_project.id, user=request.user)
        if project.user!=request.user and project.publicity != 1:
            raise ValidationError([{"message":'Wrong project id'}])
    else:
        project = Project()
        user_plm = ProjectLearningManagement()
        project.user = request.user
        user_plm.user = request.user
        user_plm.project = project
    
    if project.user == request.user:
        """ 作成者本人の場合、プロジェクト自体を更新 """
        validate_with_ninja(name_validators, _project.name)
        project.name = _project.name
        
        if _project.parent_id:
            parent_project = get_object_or_404(Project, id=_project.parent_id, user=request.user)
            parent_pathlike_ids = parent_project.pathlike_ids
            if len(parent_pathlike_ids) >= 4:
                raise ValidationError([{"message":'Path length is over'}])
            if _project.id in parent_pathlike_ids:
                raise ValidationError([{"message":'Parent project is invalid.'}])
        project.parent_id = _project.parent_id

        if _project.id and _project.default_template_card_id:
            pdt_card = get_object_or_404(Card, 
                    id=_project.default_template_card_id, 
                    user=request.user, 
                    project__id=_project.id
                    )
        project.default_template_card_id = _project.default_template_card_id

        if len(_project.description) > 5000:
            raise ValidationError([{"message":f'description length is over. length: {len(_project.description)}'}])
        project.description = _project.description

        if _project.publicity not in [0, 1]:
            raise ValidationError([{"message":f'publicity is invalid. input: {_project.publicity}'}])
        project.publicity = _project.publicity
    
    if project.user == request.user or project.publicity == 1:
        """ 作成者本人または公開中のプロジェクトの場合、plmを更新 """
    
        user_plm.is_active = _plm.is_active

        if _plm.star not in [0, 1, 2, 3, 4, 5]:
            raise ValidationError([{"message":f'star is invalid. input: {_plm.star}'}])
        user_plm.star = _plm.star

    with transaction.atomic():
        project.save()
        user_plm.save()
    return project


""" 既存プロジェクトのブックマーク追加 """
@api.post("/add_project_bookmark/{project_id}", response=List[Union[ProjectOutSchema, PlmOutSchema]], auth=django_auth)
def add_project_bookmark(request, project_id):
    """
    プロジェクトブックマーク追加。
    既存プロジェクトに対してユーザのplmを新たに作成する。
    作者本人はブックマークできないためこの機能は用いない。
    内部では本人以外の場合にplmを作成する。
    """
    project = get_object_or_404(Project, id=project_id)
    if project.user == request.user:
        raise ValidationError([{"message":f'The creator of the project can\'t bookmark.'}])
    if project.publicity!=1:
        raise ValidationError([{"message":f'Wrong project id.'}])
    user_plm = ProjectLearningManagement.objects.filter(user=request.user, project=project).first()

    if not user_plm:
        user_plm = ProjectLearningManagement()
        user_plm.user = request.user
        user_plm.project = project
        user_plm.save()

    return [project, user_plm]


""" 既存プロジェクトのブックマーク解除 """
@api.delete("/remove_project_bookmark/{project_id}", response=ProjectOutSchema, auth=django_auth)
def remove_project_bookmark(request, project_id):
    """
    プロジェクトブックマーク解除。
    既存プロジェクトに対してユーザのplmを新たに作成する。
    作者本人はブックマークできないためこの機能は用いない。
    内部では本人以外の場合にplmを削除する。
    """
    project = get_object_or_404(Project, id=project_id)
    if project.user == request.user:
        raise ValidationError([{"message":f'The creator of the project can\'t bookmark.'}])
    if project.publicity!=1:
        raise ValidationError([{"message":f'Wrong project id.'}])
    ProjectLearningManagement.objects.filter(user=request.user, project=project).delete()

    return project


""" プロジェクト単一取得 """
@api.get("/get_project/{project_id}", response=ProjectRichOutSchema, auth=None)
def get_project(request, project_id: UUID):
    project = get_object_or_404(Project, id=project_id)
    if project.user != request.user and project.publicity!=1:
        # 他人の非公開プロジェクトを閲覧
        raise ValidationError([{"message":'Wrong project id'}])

    project.set_safe(request.user)

    return project


""" プロジェクト一覧取得 """
@api.get("/get_projects", response=GetProjectsResponseSchema, auth=None)
def get_projects(request, filters: FiltersForGetProjectsSchema = Query(...)):

    """ 並べ替え """
    order_by = get_order_by_strs(filters.order_by, filters.order_dir, availables=[
        'name', 'publicity', 'created_at', 'id', 'user_plm_star', 'user_plm_is_active'])
    
    q = Q()

    """ フィルターにかかわらず本人のプロジェクトまたは公開プロジェクトのみに限定 """
    if request.user.is_authenticated:
        q &= (Q(user=request.user) | Q(publicity=1))
    else:
        """ Anonymous向け """
        q &= Q(publicity=1)

    """ 対象ユーザでの絞り込み """
    if filters.tuser_id:
        _ = get_object_or_404(User, id=filters.tuser_id)
        q &= Q(user=filters.tuser_id)

    """ 公開条件での絞り込み """
    if filters.public_only:
        q &= Q(publicity=1)
    
    """ リクエストユーザに関連するプロジェクトに限定 """
    if request.user.is_authenticated and filters.request_user_related_only:
        q &= (Q(user=request.user) | Q(plm_set__user=request.user))

    """ 取得する復習管理IDの直接指定 """
    if filters.includes:
        q &= Q(id__in=filters.includes)

    """ 除外する復習管理IDの直接指定 """
    if filters.excludes:
        q &= ~Q(id__in=filters.excludes)

    """ 子孫（自身を含む） を取得 """
    if filters.include_descendant_of:
        q &= (
              Q(id=filters.include_descendant_of)
            | Q(parent=filters.include_descendant_of)
            | Q(parent__parent=filters.include_descendant_of)
            | Q(parent__parent__parent=filters.include_descendant_of)
        )

    """ 子孫（自身を含む）を除外 """
    if filters.exclude_descendant_of:
        q &= ~(
              Q(id=filters.exclude_descendant_of)
            | Q(parent=filters.exclude_descendant_of)
            | Q(parent__parent=filters.exclude_descendant_of)
            | Q(parent__parent__parent=filters.exclude_descendant_of)
        )
    
    """ パス長が４に達しているものを除外 """
    if filters.exclude_max_path:
        q &= ~(
              Q(parent__isnull=False)
            & Q(parent__parent__isnull=False)
            & Q(parent__parent__parent__isnull=False)
        )
    
    """ 語句検索 """
    if filters.term:
        terms = filters.term.split()
        for term in terms:
            q &= (
                Q(name__icontains=term)
                | Q(parent__id__icontains=term)
                | Q(parent__name__icontains=term)
                | Q(parent__parent__id__icontains=term)
                | Q(parent__parent__name__icontains=term)
                | Q(parent__parent__parent__id__icontains=term)
                | Q(parent__parent__parent__name__icontains=term)
                | Q(parent__name__icontains=term)
                | Q(id__icontains=term)
                | Q(user__id__icontains=term)
                | Q(user__nickname__icontains=term)
            )

    if request.user.is_authenticated:
        plm_set_qs = ProjectLearningManagement.objects.filter(user=request.user, project=OuterRef('id'))
    else:
        plm_set_qs = ProjectLearningManagement.objects.none()
    projects = Project.objects.filter(q)\
            .select_related('user', 'parent', 'parent__parent', 'parent__parent__parent')\
            .annotate(user_plm_star=Subquery(plm_set_qs.values('star')[:1]))\
            .annotate(user_plm_is_active=Subquery(plm_set_qs.values('is_active')[:1]))\
            .order_by(*order_by).distinct()

    """ 語句検索 """
    if filters.term:
        new_projects = []
        terms = filters.term.split()
        for project in projects:
            text = f"{project.id}{project.path}{project.user.id}{project.user.nickname}"
            text += ''.join(str(project.pathlike_ids))
            text += project.created_at.strftime('%Y%m%d%H%M%S')
            if all([term in text for term in terms]):
                new_projects.append(project)
        projects = new_projects

    total_count = len(list(projects))
    all_ids = [item.id for item in list(projects)]
    if filters.limit:
        projects = projects[filters.offset:filters.offset+filters.limit]
    
    """ safeな情報を付加 """
    new_projects = []
    for project in projects:
        project.set_safe(request.user)
        new_projects.append(project)
    projects = new_projects
    
    return {"results": list(projects), "total_count": total_count, "all_ids": all_ids}


""" プロジェクト一括変更（活動状態をセット） """
@api.patch("/patch_projects__set_is_active", response=List[UUID], auth=django_auth)
def patch_projects__set_is_active(request, project_ids: List[UUID], is_active: bool):
    plm_set = ProjectLearningManagement.objects.filter(user=request.user, project__id__in=project_ids)
    plm_set.update(is_active=is_active)
    updated_project_ids = [plm.project.id for plm in plm_set]
    return updated_project_ids


""" プロジェクト一括変更（スターをセット） """
@api.patch("/patch_projects__set_star", response=List[UUID], auth=django_auth)
def patch_projects__set_star(request, project_ids: List[UUID], star: int):
    plm_set = ProjectLearningManagement.objects.filter(user=request.user, project__id__in=project_ids)
    plm_set.update(star=star)
    updated_project_ids = [plm.project.id for plm in plm_set]
    return updated_project_ids


""" プロジェクト一括変更（公開状態をセット） """
@api.patch("/patch_projects__set_publicity", response=List[UUID], auth=django_auth)
def patch_projects__set_publicity(request, project_ids: List[UUID], publicity: int):
    projects = Project.objects.filter(user=request.user, id__in=project_ids)
    projects.update(publicity=publicity)
    updated_project_ids = [p.id for p in projects]
    return updated_project_ids


""" プロジェクト一括変更（親プロジェクトをセット） """
@api.patch("/patch_projects__set_parent", response=List[UUID], auth=django_auth)
def patch_projects__set_parent(request, project_ids: List[UUID], parent_id: UUID = None):
    projects = Project.objects.filter(user=request.user, id__in=project_ids)
    if parent_id:
        parent_project = get_object_or_404(Project, id=parent_id)
        parent_pathlike_ids = parent_project.pathlike_ids
        if len(parent_pathlike_ids) >= 4:
            raise ValidationError([{"message":'Path length is over'}])
        projects = projects.filter(user=parent_project.user)
        projects = projects.exclude(id__in=parent_pathlike_ids)
    projects.update(parent=parent_id)
    updated_project_ids = [p.id for p in projects]
    return updated_project_ids


""" プロジェクト削除 """
@api.delete("/delete_project/{project_id}", response=ProjectOutSchema, auth=django_auth)
def delete_project(request, project_id: UUID):
    project = get_object_or_404(Project, id=project_id)
    project.delete()
    return project


""" プロジェクト一括削除 """
@api.delete("/delete_projects", response=List[UUID], auth=django_auth)
def delete_projects(request, project_ids: List[UUID]):
    projects = Project.objects.filter(user=request.user, id__in=project_ids)
    deleted_project_ids = [p.id for p in projects]
    projects.delete()
    return deleted_project_ids


""" タグ新規作成・更新 """
@api.post("/update_tag", response=TagOutSchema, auth=django_auth)
def add_tag(request, payload: TagUpdateRequestSchema):
    tag_in = payload.tag
    if tag_in.id:
        tag = get_object_or_404(Tag, id=tag_in.id, user=request.user)
    else:
        tag = Tag()
        tag.user = request.user
    
    validate_with_ninja(name_validators, tag_in.name)
    tag.name = tag_in.name
    
    if tag_in.parent_id:
        parent_tag = get_object_or_404(Tag, id=tag_in.parent_id, user=request.user)
        parent_pathlike_ids = parent_tag.pathlike_ids
        if len(parent_pathlike_ids) >= 4:
            raise ValidationError([{"message":'Path length is over'}])
        if tag_in.id in parent_pathlike_ids:
            raise ValidationError([{"message":'Parent tag is invalid.'}])
    tag.parent_id = tag_in.parent_id

    if tag_in.star not in [0, 1, 2, 3, 4, 5]:
        raise ValidationError([{"message":f'star is invalid. input: {tag_in.star}'}])
    tag.star = tag_in.star

    if tag_in.publicity not in [0, 1]:
        raise ValidationError([{"message":f'publicity is invalid. input: {tag_in.publicity}'}])
    tag.publicity = tag_in.publicity

    tag.save()
    return tag


""" タグ単一取得 """
@api.get("/get_tag/{tag_id}", response=TagRichOutSchema, auth=None)
def get_tag(request, tag_id: UUID):
    tag = get_object_or_404(Tag, id=tag_id)
    if tag.user != request.user and tag.publicity!=1:
        """ 他人の非公開タグを閲覧 """
        raise ValidationError([{"message":f'wrong tag id.'}])
    
    tag.set_safe(request.user)
    return tag


""" タグ一覧取得 """
@api.get("/get_tags", response=GetTagsResponseSchema, auth=None)
def get_tags(request, filters: FiltersForGetTagsSchema = Query(...)):

    """ 並べ替え """
    order_by = get_order_by_strs(filters.order_by, filters.order_dir, availables=[
        'name', 'star', 'created_at', 'id'])

    q = Q()

    """ フィルターにかかわらず本人のプロジェクトまたは公開プロジェクトのみに限定 """
    if request.user.is_authenticated:
        q &= (Q(user=request.user) | Q(publicity=1))
    else:
        """ Anonymous向け """
        q &= Q(publicity=1)

    """ 対象ユーザでの絞り込み """
    if filters.tuser_id:
        _ = get_object_or_404(User, id=filters.tuser_id)
        q &= Q(user=filters.tuser_id)

    """ 公開条件での絞り込み """
    if filters.public_only:
        q &= Q(publicity=1)

    """ リクエストユーザに関連するタグに限定 """
    if request.user.is_authenticated and filters.request_user_related_only:
        q &= Q(user=request.user)
    
    """ 取得する復習管理IDの直接指定 """
    if filters.includes:
        q &= Q(id__in=filters.includes)

    """ 除外する復習管理IDの直接指定 """
    if filters.excludes:
        q &= ~Q(id__in=filters.excludes)
    
    """ 子孫（自身を含む） を取得 """
    if filters.include_descendant_of:
        q &= (
              Q(id=filters.include_descendant_of)
            | Q(parent=filters.include_descendant_of)
            | Q(parent__parent=filters.include_descendant_of)
            | Q(parent__parent__parent=filters.include_descendant_of)
        )

    """ 子孫（自身を含む）を除外 """
    if filters.exclude_descendant_of:
        q &= ~(
              Q(id=filters.exclude_descendant_of)
            | Q(parent=filters.exclude_descendant_of)
            | Q(parent__parent=filters.exclude_descendant_of)
            | Q(parent__parent__parent=filters.exclude_descendant_of)
        )
    
    """ パス長が４に達しているものを除外 """
    if filters.exclude_max_path:
        q &= ~(
              Q(parent__isnull=False)
            & Q(parent__parent__isnull=False)
            & Q(parent__parent__parent__isnull=False)
        )
    
    if filters.includes:
        q.add(Q(id__in=filters.includes), Q.AND)
    
    """ 語句検索 """
    if filters.term:
        terms = filters.term.split()
        for term in terms:
            q &= (
                  Q(name__icontains=term)
                | Q(parent__id__icontains=term)
                | Q(parent__name__icontains=term)
                | Q(parent__parent__id__icontains=term)
                | Q(parent__parent__name__icontains=term)
                | Q(parent__parent__parent__id__icontains=term)
                | Q(parent__parent__parent__name__icontains=term)
                | Q(parent__name__icontains=term)
                | Q(id__icontains=term)
                | Q(user__id__icontains=term)
                | Q(user__nickname__icontains=term)
            )
    
    tags = Tag.objects.filter(q).\
        select_related('user', 'parent').order_by(*order_by).distinct()

    total_count = len(list(tags))
    all_ids = [item.id for item in list(tags)]
    if filters.limit:
        tags = tags[filters.offset:filters.offset+filters.limit]
    
    """ safeな情報を不可 """
    new_tags = []
    for tag in tags:
        tag.set_safe(request.user)
        new_tags.append(tag)
    tags = new_tags
    
    return {"results": list(tags), "total_count": total_count, "all_ids": all_ids}


""" タグ一括変更（スターをセット） """
@api.patch("/patch_tags__set_star", response=List[UUID], auth=django_auth)
def patch_tags(request, tag_ids: List[UUID], star: int):
    tag_ids = tag_ids
    tags = Tag.objects.filter(user=request.user, id__in=tag_ids)
    tags.update(star=star)
    updated_tag_ids = [p.id for p in tags]
    return updated_tag_ids


""" タグ一括変更（親タグをセット） """
@api.patch("/patch_tags__set_parent", response=List[UUID], auth=django_auth)
def patch_tags(request, tag_ids: List[UUID], parent_id: UUID = None):
    tag_ids = tag_ids
    tags = Tag.objects.filter(user=request.user, id__in=tag_ids)
    if parent_id:
        parent_tag = get_object_or_404(Tag, id=parent_id)
        if len(parent_tag.pathlike_ids) >= 4:
            raise ValidationError([{"message":'Path length is over'}])
        tags = tags.filter(user=parent_tag.user)
        tags = tags.exclude(id__in=parent_tag.pathlike_ids)
    tags.update(parent=parent_id)
    updated_tag_ids = [p.id for p in tags]
    return updated_tag_ids


""" タグ削除 """
@api.delete("/delete_tag/{tag_id}", response=TagOutSchema, auth=django_auth)
def delete_tag(request, tag_id: UUID):
    tag = get_object_or_404(Tag, id=tag_id)
    tag.delete()
    return tag


""" タグ一括削除 """
@api.delete("/delete_tags", response=List[UUID], auth=django_auth)
def delete_tags(request, tag_ids: List[UUID]):
    tags = Tag.objects.filter(user=request.user, id__in=tag_ids)
    deleted_tag_ids = [p.id for p in tags]
    tags.delete()
    return deleted_tag_ids


""" カード新規作成・更新 """
@api.post("/update_card", response=CardOutSchema, auth=django_auth)
def update_card(request, payload: CardUpdateRequestSchema):
    _card = payload.card
    if _card.id:
        card = get_object_or_404(Card, id=_card.id)
        card_fields = card.card_fields.order_by('order_in_card').all()
        if card.user!=request.user and card.publicity != 1:
            raise ValidationError([{"message":'Wrong card id'}])
    else:
        card = Card()
        card.user = request.user
        card_fields = [
            CardField(card=card, order_in_card=i)
            for i, _cf in enumerate(_card.card_fields)
        ]

        """ コピー元（新規作成時のみ設定可能） """
        if _card.copied_from_id:
            _ = get_object_or_404(Card, id=_card.copied_from_id)
        card.copied_from_id = _card.copied_from_id
    
    ncf = len(card_fields)
    qiai_to_oic, oic_to_qiai = get_qiai_to_oic(ncf)

    if card.user==request.user:
        """ 本人のカードの場合 """
        if len(_card.supplement_content) > 5000:
            raise ValidationError([{"message":f'description length is over 5000. length: {len(_card.supplement_content)}'}])
        card.supplement_content = _card.supplement_content

        if _card.publicity not in [0, 1]:
            raise ValidationError([{"message":f'publicity is invalid. input: {_card.publicity}'}])
        card.publicity = _card.publicity

        if _card.project_id:
            _ = get_object_or_404(Project, id=_card.project_id, user=request.user)
        card.project_id = _card.project_id

        tags_to_set = []
        for _tag_id in _card.tag_ids:
            tag = get_object_or_404(Tag, id=_tag_id, user=request.user)
            tags_to_set.append(tag)

        for cf, _cf in zip(card_fields, _card.card_fields):

            validate_with_ninja(name_validators, _cf.name)
            cf.name = _cf.name
            validate_with_ninja([lang_validator], _cf.read_aloud_lang)
            cf.read_aloud_lang = _cf.read_aloud_lang

            if len(_cf.content) > 5000:
                raise ValidationError([{"message":f'content length is over 5000. length: {len(_cf.content)}'}])
            cf.content = _cf.content
        

        """ QAの更新・作成 """

        qa_set_old = card.qa_set.all()
        qiai_to_qa = dict(zip([qa.qiai for qa in qa_set_old], qa_set_old))
        qiai_set_old = set([qa.qiai for qa in qa_set_old])
        qiai_set_new = set([_qa.qiai for _qa in _card.qa_set])
        qiai_set_create = qiai_set_new - qiai_set_old
        qiai_set_delete = qiai_set_old - qiai_set_new

        qa_id_set_delete = []
        for qa in qa_set_old:
            if qa.qiai in qiai_set_delete:
                qa_id_set_delete.append(qa.id)

        qa_set_new = []
        qa_set_create = []
        for _qa in _card.qa_set:
            qa = None
            if _qa.qiai in qiai_set_create:
                qa = QA()
                qa.order_in_card = qiai_to_oic[_qa.qiai]
                qi, ai = oic_to_qiai[qa.order_in_card]
                qa.card = card
                qa.question_field = card_fields[qi]
                qa.answer_field = card_fields[ai]
                qa_set_create.append(qa)
            else:
                qa = qiai_to_qa[_qa.qiai]
            qa_set_new.append(qa)
        
        """ RMの更新・作成 """

        rm_set_create = []
        for qa in qa_set_create:
            rm = ReviewManagement()
            rm.user = request.user
            rm.qa = qa
            rm_set_create.append(rm)
        
        """ トランザクション """

        with transaction.atomic():
            card.save()
            for cf in card_fields:
                cf.save()
            for qa in qa_set_new:
                qa.save()
            QA.objects.filter(id__in=qa_id_set_delete).delete()
            for rm in rm_set_create:
                rm.save()

            """ tag - card """
            old_user_tags = Tag.objects.filter(cards=card, user=request.user)
            card.tags.remove(*old_user_tags)
            card.tags.add(*tags_to_set)

            """ RMの依存関係の追加 """
            if payload.use_auto_set_dependency:
                rm_query_set = ReviewManagement.objects.filter(user=request.user, qa__card=card)
                for rm in rm_set_create:
                    qi, ai = oic_to_qiai[rm.qa.order_in_card]
                    if qi > ai:
                        deprm = rm_query_set.filter(qa__order_in_card=qiai_to_oic[f"{ai}-{qi}"]).first()
                        if deprm:
                            rm.dependency_rm_set.add(deprm)
    
    else:
        """ 本人以外のカードの場合（タグのみ保存） """

        tags_to_set = []
        for _tag_id in _card.tag_ids:
            tag = get_object_or_404(Tag, id=_tag_id, user=request.user)
            tags_to_set.append(tag)
    
        with transaction.atomic():
            """ tag - card """
            old_user_tags = Tag.objects.filter(cards=card, user=request.user)
            card.tags.remove(*old_user_tags)
            card.tags.add(*tags_to_set)
    
    return card


""" TSVからのカード一括作成 """
@api.post("/add_cards_from_tsv", response=List[UUID], auth=django_auth)
def add_cards_from_tsv(request, input_cards: List[AddCardFromTsvSchema]):
    _cards = input_cards
    cards = []
    qa_list = []
    rm_list = []
    nfs = []
    new_projects = []
    projects_cache = {}
    new_plms = []
    new_tags = []
    tags_cache = {}
    card_tags_to_add_list = []
    card_qaoic_depqaoic_list = []
    if len(_cards) > 5000:
        raise ValidationError([{"message":f'content length is over 5000. length: {len(_cards)}'}])
    for _card in _cards:
        card = Card()
        card.user = request.user
        
        """ card field """
        _cfs = _card.card_fields
        ncf = len(_cfs)
        if ncf < 2  or ncf > 5:
            raise ValidationError([{"message":"Wrong ncf"}])
        cfs_in_card = []
        oic = 0
        for _cf in _cfs:
            cf = CardField()
            cf.card = card
            cf.order_in_card = oic
            validate_with_ninja(name_validators, _cf.name)
            cf.name = _cf.name
            validate_with_ninja([lang_validator], _cf.read_aloud_lang)
            cf.read_aloud_lang = _cf.read_aloud_lang

            if len(_cf.content) > 5000:
                raise ValidationError([{"message":f'content length is over 5000. length: {len(_cf.content)}'}])
            cf.content = _cf.content
            
            nfs.append(cf) # 保存用
            cfs_in_card.append(cf) # 復習管理からの参照用

            oic += 1
        
        qiai_to_oic, _ = get_qiai_to_oic(ncf)
        
        """ qa_set """
        _qa_set = _card.qa_set
        for _qa in _qa_set:
            _qi = _qa.qi
            _ai = _qa.ai

            qa = QA()
            
            if _qi < 0 or _qi >= ncf or _ai < 0 or _ai >= ncf or _qi == _ai:
                raise ValidationError([{"message":"Wrong qi or ai"}])
            
            qa.order_in_card = qiai_to_oic[f"{_qi}-{_ai}"]
            qa.card = card
            qa.question_field = cfs_in_card[_qi]
            qa.answer_field = cfs_in_card[_ai]

            rm = ReviewManagement()
            rm.user = request.user
            rm.qa = qa

            _lra = _qa.user_rm.last_reviewed_at
            if _lra:
                if _lra > timezone.now():
                    raise ValidationError([{"message":"Future time is not allowed."}])
            rm.last_reviewed_at = _lra
            
            _al = _qa.user_rm.absorption_level
            if _al < 0 or _al > 12:
                raise ValidationError([{"message":"Wrong qi or ai"}])
            rm.absorption_level = _al
            rm.highest_absorption_level = _al

            rm.set_actual_review_interval_from_standard(noise_ratio=0.1)

            qa_list.append(qa)
            rm_list.append(rm)

            """ 依存関係の追加 """
            for _depqa in _qa_set:
                _qi_dep, _ai_dep = _depqa.qi, _depqa.ai
                if _ai < _qi and _qi_dep==_ai and _ai_dep == _qi: # e.g. 1-0に対して0-1
                    card_qaoic_depqaoic_list.append([
                        card,
                        qiai_to_oic[f"{_ai}-{_qi}"],
                        qiai_to_oic[f"{_qi}-{_ai}"],
                    ])
                    break
        
        """ suppliement """
        card.supplement_content = _card.supplement_content
        
        """ publicity """
        pb = _card.publicity
        if pb not in [0, 1]:
            raise ValidationError([{"message":"pb is wrong"}])
        card.publicity = pb

        """ project """
        pn = _card.project_name
        if pn:
            validate_with_ninja(name_validators, pn)
            if pn in projects_cache:
                project = projects_cache[pn]
            else:
                """ データベースにないか確認 """
                project = Project.objects.filter(user=request.user, name=pn).first()
            if project is None:
                """ キャッシュ・DBいずれにもない場合、新しく作成予定を追加 """
                project = Project()
                user_plm = ProjectLearningManagement()
                project.user = request.user
                project.name = pn
                user_plm.user = request.user
                user_plm.project = project
                new_projects.append(project)
                new_plms.append(user_plm)
            projects_cache[pn] = project
            card.project = project
        
        """ tags """
        tns = _card.tag_names
        if tns:
            tags_to_add = []
            for tn in tns:
                validate_with_ninja(name_validators, tn)

                if tn in tags_cache:
                    tag = tags_cache[tn]
                else:
                    """ データベースにないか確認 """
                    tag = Tag.objects.filter(user=request.user, name=tn).first()
                if tag is None:
                    """ キャッシュ・DBいずれにもない場合、新しく作成予定を追加 """
                    tag = Tag()
                    tag.user = request.user
                    tag.name = tn
                    new_tags.append(tag)
                tags_cache[tn] = tag
                tags_to_add.append(tag)
            card_tags_to_add_list.append({
                "card": card,
                "tags_to_add": tags_to_add
            })
        cards.append(card)
    
    with transaction.atomic():
        batch_size = 100
        Project.objects.bulk_create(new_projects, batch_size=batch_size)
        ProjectLearningManagement.objects.bulk_create(new_plms, batch_size=batch_size)
        Tag.objects.bulk_create(new_tags, batch_size=batch_size)

        Card.objects.bulk_create(cards, batch_size=batch_size)
        CardField.objects.bulk_create(nfs, batch_size=batch_size)
        QA.objects.bulk_create(qa_list, batch_size=batch_size)
        ReviewManagement.objects.bulk_create(rm_list, batch_size=batch_size)

        """ tag - card """
        for card_tags_to_add in card_tags_to_add_list:
            card = card_tags_to_add["card"]
            tags_to_add = card_tags_to_add["tags_to_add"]
            card.tags.add(*tags_to_add)
        
        """ rm dependency """
        for card, qaoic, depqaoic in card_qaoic_depqaoic_list:
            qa = card.qa_set.filter(order_in_card=qaoic).first()
            depqa = card.qa_set.filter(order_in_card=depqaoic).first()
            if qa and depqa:
                rm = qa.rm_set.filter(user=request.user).first()
                deprm = depqa.rm_set.filter(user=request.user).first()
                if rm and deprm:
                    rm.dependency_rm_set.add(deprm)

    card_ids = [card.id for card in cards]
    return card_ids


""" カード単一取得 """
@api.get("/get_card/{card_id}", response=CardRichOutSchema, auth=None)
def get_card(request, card_id: UUID):
    card = get_object_or_404(Card, id=card_id)
    if card.user != request.user and card.publicity!=1:
        """ 他人の非公開カードの閲覧は禁止 """
        raise ValidationError([{"message":"Not allow to get a private card of others"}])
    
    card.set_is_pdt()
    card.set_safe(request.user)

    return card


""" カード一覧取得 """
@api.get("/get_cards", response=GetCardsResponseSchema, auth=None)
def get_cards(request, filters: FiltersForGetCardsSchema = Query(...)):

    """ 並べ替え """
    order_by = get_order_by_strs(filters.order_by, filters.order_dir, availables=[
        'is_project_default_template',
        'project__name', 'user__name', 'is_active', 'star', 'rm_users_count',
        'publicity', 'created_at', 'id'])

    q = Q()

    """ フィルターにかかわらず本人のカードまたは公開カードのみに限定 """
    if request.user.is_authenticated:
        q &= (Q(user=request.user) | Q(publicity=1))
    else:
        """ Anonymousは公開プロジェクトのみに限定 """
        q &= Q(publicity=1)

    """ 対象ユーザ """
    if filters.tuser_id:
        get_object_or_404(User, id=filters.tuser_id)
        q &= Q(user=filters.tuser_id)

    """ 公開条件での絞り込み """
    if filters.public_only:
        q &= Q(publicity=1)

    """ リクエストユーザに関連するカードに限定 """
    if request.user.is_authenticated and filters.request_user_related_only:
        q &= (Q(user=request.user) | Q(qa_set__rm_set__user=request.user))
    
    """ 取得する復習管理IDの直接指定 """
    if filters.includes:
        q &= Q(id__in=filters.includes)

    """ 除外する復習管理IDの直接指定 """
    if filters.excludes:
        q &= ~Q(id__in=filters.excludes)

    """ プロジェクト """
    if filters.project:
        project = get_object_or_404(Project, id=filters.project)
        if project.user != request.user and project.publicity==0:
            raise ValidationError([{"message":"Wrong project id"}])
        project_ids = [project.id]
        if filters.with_project_descendants:
            project_ids += [descendant.id for descendant in project.get_all_descendants()]
        q &= Q(project__in=project_ids)
    
    """
    タグで絞り込み。
    tag指定のクエリを複数ANDで結合すると1枚も取得できなくなる。
    参考: https://stackoverflow.com/questions/8618068/django-filter-queryset-in-for-every-item-in-list/8637972#8637972
    """
    tag_queries = []
    for f_tag_id in filters.tags:
        tag = get_object_or_404(Tag, id=f_tag_id)
        if tag.user != request.user and tag.publicity==0:
            raise ValidationError([{"message":"Wrong tag id"}])
        tag_ids = [tag.id]
        if filters.with_tag_descendants:
            tag_ids += [descendant.id for descendant in tag.get_all_descendants()]
        tag_queries.append(Q(tags__in=tag_ids))
    
    """ 語句検索 """
    if filters.term:
        terms = filters.term.split()
        for term in terms:
            q &= (
                  Q(card_fields__name__icontains=term)
                | Q(card_fields__content__icontains=term)
                | Q(supplement_content__icontains=term)
                | Q(id__icontains=term)
                | Q(user__id__icontains=term)
                | Q(user__nickname__icontains=term)
                | Q(project__id__icontains=term)
                | Q(project__name__icontains=term)
                | Q(project__parent__id__icontains=term)
                | Q(project__parent__name__icontains=term)
                | Q(project__parent__parent__id__icontains=term)
                | Q(project__parent__parent__name__icontains=term)
                | Q(project__parent__parent__parent__id__icontains=term)
                | Q(project__parent__parent__parent__name__icontains=term)
                | Q(tags__id__icontains=term)
                | Q(tags__name__icontains=term)
                | Q(tags__parent__id__icontains=term)
                | Q(tags__parent__name__icontains=term)
                | Q(tags__parent__parent__id__icontains=term)
                | Q(tags__parent__parent__name__icontains=term)
                | Q(tags__parent__parent__parent__id__icontains=term)
                | Q(tags__parent__parent__parent__name__icontains=term)
            )
    
    
    cards = (Card.objects.filter(q)
        .select_related('user', 'copied_from')
        .annotate(is_pdt = Case(
                            # is template
                            When(project__isnull=False, 
                                id=F('project__default_template_card__id'), then=True),
                            # others
                            default=False,
                            output_field=IntegerField(max_length=1)
                        )
        )
        .annotate(qa_set_count = Count('qa_set'))
        .annotate(rm_users_count = Count('qa_set__rm_set__user', distinct=True))
        .order_by(*order_by).distinct()
    )

    """ additional tag filters """
    for tag_q in tag_queries:
        cards = cards.filter(tag_q)
    
    total_count = len(list(cards))
    total_qa_set_count = cards.aggregate(Count('qa_set'))["qa_set__count"]
    all_ids = [item.id for item in list(cards)]
    if filters.limit:
        cards = cards[filters.offset:filters.offset+filters.limit]

    """ safe対応 ( project_safe, tags_safe, copied_from_safe ) """
    new_cards = []
    for card in list(cards):

        card.set_safe(request.user)

        new_cards.append(card)
    cards = new_cards

    return {"results": list(cards), "total_count": total_count, "all_ids": all_ids, "total_qa_set_count":total_qa_set_count}


""" カード削除 """
@api.delete("/delete_card/{card_id}", response=CardOutSchema, auth=django_auth)
def delete_card(request, card_id: UUID):
    card = get_object_or_404(Card, id=card_id)
    card.delete()
    return card


""" 複数カードにプロジェクトを一括して設定 """
@api.patch("/patch_cards__set_project", response=List[UUID], auth=django_auth)
def patch_cards__set_project(request, card_ids: List[UUID], project_id: UUID=None):
    cards = Card.objects.filter(user=request.user, id__in=card_ids)
    if project_id:
        project = get_object_or_404(Project, id=project_id)
        if request.user != project.user:
            raise ValidationError([{"message":"Wrong project id"}])
    cards.update(project = project_id)
    updated_card_ids = [p.id for p in cards]
    return updated_card_ids


""" 複数カードにタグを一括して追加 """
@api.patch("/patch_cards__add_tags", response=List[UUID], auth=django_auth)
def patch_cards__add_tags(request, card_ids: List[UUID], tag_ids: List[UUID]):
    cards = Card.objects.filter(user=request.user, id__in=card_ids)
    cleaned_tags = []
    for tag_id in tag_ids:
        tag = get_object_or_404(Tag, id=tag_id)
        if request.user != tag.user:
            raise ValidationError([{"message":"'need_session' should be one of [0, 1]"}])
        cleaned_tags.append(tag)
    if len(cleaned_tags) == 0:
        raise ValidationError([{"message":"'need_session' should be one of [0, 1]"}])
    for tag in cleaned_tags:
        tag.cards.add(*cards.all())
    updated_card_ids = [card.id for card in cards]
    return updated_card_ids


""" 複数カードからタグを一括して除外 """
@api.patch("/patch_cards__remove_tags", response=List[UUID], auth=django_auth)
def patch_cards__remove_tags(request, card_ids: List[UUID], tag_ids: List[UUID]):
    cards = Card.objects.filter(user=request.user, id__in=card_ids)
    cleaned_tags = []
    for tag_id in tag_ids:
        tag = get_object_or_404(Tag, id=tag_id)
        if request.user != tag.user:
            raise ValidationError([{"message":"'need_session' should be one of [0, 1]"}])
        cleaned_tags.append(tag)
    if len(cleaned_tags) == 0:
        raise ValidationError([{"message":"'need_session' should be one of [0, 1]"}])
    for tag in cleaned_tags:
        tag.cards.remove(*cards.all())
    updated_card_ids = [card.id for card in cards]
    return updated_card_ids


""" 複数カードにタグを一括して設定（既存のタグ除外後） """
@api.patch("/patch_cards__set_tags", response=List[UUID], auth=django_auth)
def patch_cards__set_tags(request, card_ids: List[UUID], tag_ids: List[UUID]):
    cards = Card.objects.filter(user=request.user, id__in=card_ids)
    cleaned_tags = []
    for tag_id in tag_ids:
        tag = get_object_or_404(Tag, id=tag_id)
        if request.user != tag.user:
            raise ValidationError([{"message":"'need_session' should be one of [0, 1]"}])
        cleaned_tags.append(tag)
    if len(cleaned_tags) == 0:
        for card in cards.all():
            card.tags.clear()
    else:
        for card in cards.all():
            card.tags.set(cleaned_tags)
    updated_card_ids = [card.id for card in cards]
    return updated_card_ids


""" 複数カードに公開状態を一括して設定 """
@api.patch("/patch_cards__set_publicity", response=List[UUID], auth=django_auth)
def patch_cards__set_publicity(request, card_ids: List[UUID], publicity: int):
    if publicity not in [0,1]:
        raise ValidationError([{"message":"'publicity' should be one of [0, 1]"}])
    cards = Card.objects.filter(user=request.user, id__in=card_ids)
    cards.update(publicity=publicity)
    updated_card_ids = [card.id for card in cards]
    return updated_card_ids


"""
複数復習管理ID指定して、対応する複数カードを一括変更
"""


""" # 複数復習管理IDを指定して、対応する複数カードにプロジェクトを一括して設定 """
# @api.patch("/patch_cards__set_project_by_rm_ids", response=List[UUID], auth=django_auth)
# def patch_cards__set_project_by_rm_ids(request, rm_ids: List[UUID], project_id: UUID=None):
#     if project_id:
#         project = get_object_or_404(Project, id=project_id)
#         if request.user != project.user:
#             raise ValidationError([{"message":"'need_session' should be one of [0, 1]"}])
#     else:
#         project = None
#     qa_set = qa.objects.filter(user=request.user, id__in=rm_ids)
    

#     # カードIDの一覧取得（カードTBへの追加アクセスなし）
#     card_ids = set()
#     for qa in qa_set.all():
#         card_ids.add(qa.card_id)
#     card_ids = list(card_ids)

#     # カードを取得しプロジェクト一括設定
#     cards = Card.objects.filter(user=request.user, id__in=card_ids)
#     cards.update(project=project)
#     card_ids = [card.id for card in cards]
    
#     return card_ids


# # 複数復習管理IDを指定して、対応する複数カードにタグを一括して追加
# @api.patch("/patch_cards__add_tags_by_rm_ids", response=List[UUID], auth=django_auth)
# def patch_cards__add_tags_by_rm_ids(request, rm_ids: List[UUID], tag_ids: List[UUID]):
#     # 復習管理の取得
#     qa_set = qa.objects.filter(user=request.user, id__in=rm_ids)

#     # カードIDの一覧取得（カードTBへの追加アクセスなし）
#     card_ids = set()
#     for qa in qa_set.all():
#         card_ids.add(qa.card_id)
#     card_ids = list(card_ids)

#     # カードの取得
#     cards = Card.objects.filter(user=request.user, id__in=card_ids)

#     tags = Tag.objects.filter(user=request.user, id__in=tag_ids)

#     if len(tags) == 0:
#         raise ValidationError([{"message":"'need_session' should be one of [0, 1]"}])
    
#     for tag in tags:
#         tag.cards.add(*cards.all())
    
#     card_ids = [card.id for card in cards]
#     return card_ids


# # 複数復習管理IDを指定して、対応する複数カードからタグを一括して除外
# @api.patch("/patch_cards__remove_tags_by_rm_ids", response=List[UUID], auth=django_auth)
# def patch_cards__remove_tags_by_rm_ids(request, rm_ids: List[UUID], tag_ids: List[UUID]):
#     # 復習管理の取得
#     qa_set = qa.objects.filter(user=request.user, id__in=rm_ids)

#     # カードIDの一覧取得（カードTBへの追加アクセスなし）
#     card_ids = set()
#     for qa in qa_set.all():
#         card_ids.add(qa.card_id)
#     card_ids = list(card_ids)

#     # カードの取得
#     cards = Card.objects.filter(user=request.user, id__in=card_ids)

#     tags = Tag.objects.filter(user=request.user, id__in=tag_ids)

#     if len(tags) == 0:
#         raise ValidationError([{"message":"'need_session' should be one of [0, 1]"}])
    
#     for tag in tags:
#         tag.cards.remove(*cards.all())
    
#     card_ids = [card.id for card in cards]
#     return card_ids


# # 複数復習管理IDを指定して、対応する複数カードにタグを一括して設定（既存のタグ除外後）
# @api.patch("/patch_cards__set_tags_by_rm_ids", response=List[UUID], auth=django_auth)
# def patch_cards__set_tags_by_rm_ids(request, rm_ids: List[UUID], tag_ids: List[UUID]):
#     # 復習管理の取得
#     qa_set = qa.objects.filter(user=request.user, id__in=rm_ids)

#     # カードIDの一覧取得（カードTBへの追加アクセスなし）
#     card_ids = set()
#     for qa in qa_set.all():
#         card_ids.add(qa.card_id)
#     card_ids = list(card_ids)

#     # カードの取得
#     cards = Card.objects.filter(user=request.user, id__in=card_ids)

#     tags = Tag.objects.filter(user=request.user, id__in=tag_ids)

#     if len(tags) == 0:
#         for card in cards:
#             card.tags.clear()
#     else:
#         for card in cards:
#             card.tags.set(tags.all())
    
#     card_ids = [card.id for card in cards]
#     return card_ids


""" カード一括削除 """
@api.delete("/delete_cards", response=List[UUID], auth=django_auth)
def delete_cards(request, card_ids: List[UUID]):
    cards = Card.objects.filter(user=request.user, id__in=card_ids)
    deleted_card_ids = [card.id for card in cards]
    cards.delete()
    return deleted_card_ids


""" 複数rm IDを指定して、対応する複数カード一括削除 """
@api.delete("/delete_cards_from_rm_ids", response=List[UUID], auth=django_auth)
def delete_cards_from_rm_ids(request, rm_ids: List[UUID]):
    rm_set = ReviewManagement.objects.filter(user=request.user, id__in=rm_ids, qa__card__user=request.user).\
        select_related('qa', 'qa__card')
    deleted_card_ids = set()
    for rm in rm_set.all():
        deleted_card_ids.add(rm.qa.card.id)
        rm.qa.card.delete()
    deleted_card_ids = list(deleted_card_ids)
    return deleted_card_ids


""" 復習管理新規作成・更新 """
@api.post("/update_rm", response=RmOutSchema, auth=django_auth)
def add_rm(request, payload: RmUpdateRequestSchema):
    _rm = payload.rm
    rm = get_object_or_404(ReviewManagement, id=_rm.id, user=request.user)
    
    if _rm.need_session < 0 or _rm.need_session > 1:
        raise ValidationError([{"message":f'need_session is invalid. input: {_rm.need_session}'}])
    rm.need_session = _rm.need_session
        
    if _rm.is_active < 0 or _rm.is_active > 1:
        raise ValidationError([{"message":f'is_active is invalid. input: {_rm.is_active}'}])
    rm.is_active = _rm.is_active

    if _rm.ul_review_interval < 0 or _rm.ul_review_interval > 36500:
        raise ValidationError([{"message":f'ul_review_interval is invalid. input: {_rm.ul_review_interval}'}])
    rm.ul_review_interval = timedelta(days=_rm.ul_review_interval)

    if _rm.ingestion_level < 0 or _rm.ingestion_level > 7:
        raise ValidationError([{"message":f'ingestion_level is invalid. input: {_rm.ingestion_level}'}])
    rm.ingestion_level = _rm.ingestion_level

    if _rm.absorption_level < 0 or _rm.absorption_level > 12:
        raise ValidationError([{"message":f'absorption_level is invalid. input: {_rm.absorption_level}'}])
    rm.absorption_level = _rm.absorption_level

    if _rm.interval_increase_rate < 1.1 or _rm.interval_increase_rate > 4.0:
        raise ValidationError([{"message":f'interval_increase_rate is invalid. input: {_rm.interval_increase_rate}'}])
    rm.interval_increase_rate = _rm.interval_increase_rate

    if _rm.actual_review_interval < 0 or _rm.actual_review_interval > 36500:
        raise ValidationError([{"message":f'actual_review_interval is invalid. input: {_rm.actual_review_interval}'}])
    rm.actual_review_interval = timedelta(days=_rm.actual_review_interval)

    if _rm.last_reviewed_at:
        if _rm.last_reviewed_at > timezone.now():
            raise ValidationError([{"message":f'last_reviewed_at is invalid. input: {_rm.last_reviewed_at}'}])
    rm.last_reviewed_at = _rm.last_reviewed_at

    rm.postpone_to = _rm.postpone_to

    if _rm.importance < 0 or _rm.importance > 10:
        raise ValidationError([{"message":f'importance is invalid. input: {_rm.importance}'}])
    rm.importance = _rm.importance

    if _rm.estimated_time < 0 or _rm.estimated_time > 86400:
        raise ValidationError([{"message":f'estimated_time is invalid. input: {_rm.estimated_time}'}])
    rm.estimated_time = timedelta(seconds=_rm.estimated_time)

    if _rm.highest_absorption_level < 0 or _rm.highest_absorption_level > 12:
        raise ValidationError([{"message":f'highest_absorption_level is invalid. input: {_rm.highest_absorption_level}'}])
    rm.highest_absorption_level = _rm.highest_absorption_level

    deprms_to_add = []
    for _deprm_id in _rm.dependency_rm_id_set:
        deprm = get_object_or_404(ReviewManagement, id=_deprm_id, user=request.user)
        deprms_to_add.append(deprm)

    with transaction.atomic():
        rm.save()
        """ rm - deprm """
        rm.dependency_rm_set.set(deprms_to_add)
    return rm


""" 既存QAのブックマーク追加 """
@api.post("/add_qa_bookmarks/", response=List[UUID], auth=django_auth)
def add_qa_bookmark(request, qa_ids:List[UUID]):
    """
    QAブックマーク追加。
    既存QAに対してユーザのrmを新たに作成する。
    公開されているものしかブックマークできない。
    """
    qa_list = QA.objects.filter(id__in=qa_ids, card__publicity=1).exclude(rm_set__user=request.user).distinct()

    rm_list = []
    for qa in qa_list.iterator():
        user_rm = ReviewManagement()
        user_rm.user = request.user
        user_rm.qa = qa
        rm_list.append(user_rm)
    
    ReviewManagement.objects.bulk_create(rm_list)

    return [rm.id for rm in rm_list]


""" 既存QAのブックマーク解除 """
@api.delete("/remove_qa_bookmarks/", auth=django_auth)
def remove_qa_bookmarks(request, qa_ids:List[UUID]):
    """
    QAブックマーク解除。
    指定されたQAからユーザのrmを削除する。
    """
    ReviewManagement.objects.filter(user=request.user, qa__in=qa_ids).delete()

    return {}


""" 復習管理単一取得 """
@api.get("/get_rm/{rm_id}", response=RmRichOutSchema, auth=django_auth)
def get_rm(request, rm_id: UUID):
    rm = get_object_or_404(ReviewManagement, pk=rm_id)
    if rm.user != request.user:
        """ 他人の復習管理の閲覧は禁止 """
        raise ValidationError([{"message":"Not allow to get a rm of others"}])
    return rm


""" 復習管理一覧取得 """
@api.get("/get_rm_set", response=GetqasResponseSchema, auth=django_auth)
def get_rm_set(request, filters: FiltersForGetRmSetSchema = Query(...)):

    """ 並べ替え """
    order_by = get_order_by_strs(filters.order_by, filters.order_dir, availables=[
        'qa__card__id',
        'qa__card__project__name',
        'last_reviewed_at',
        'ingestion_level',
        'absorption_level',
        'is_active',
        'ul_review_interval',
        'actual_review_interval', 
        'highest_absorption_level',
        'importance',
        'estimated_time',
        'last_updated_at',
        'order_in_card',
        'postpone_to',
        'is_hot',
        'created_at', 'id'])
    
    """ ランダムな順序 """
    if filters.random:
        order_by = '?'

    """ フィルターにかかわらず、本人のrmのみに限定 """
    q = Q(user=request.user)

    """ フィルターにかかわらず、本人のカードのrmまたは公開カードのrmのみに限定 """
    q &= ( Q(qa__card__user=request.user) | Q(qa__card__publicity=1) )

    """ 取得する復習管理IDの直接指定 """
    if filters.includes:
        q &= Q(id__in=filters.includes)

    """ 除外する復習管理IDの直接指定 """
    if filters.excludes:
        q &= ~Q(id__in=filters.excludes)
    
    """ プロジェクトで絞り込み """
    if filters.project:
        project = get_object_or_404(Project, id=filters.project)
        if project.user != request.user and project.publicity!=1:
            raise ValidationError([{"message":"Wrong project id"}])
        project_ids = [project.id]
        if filters.with_project_descendants:
            project_ids += [descendant.id for descendant in project.get_all_descendants()]
        q &= Q(qa__card__project__in=project_ids)
    
    """
    タグで絞り込み。
    tag指定のクエリを複数ANDで結合すると1枚も取得できなくなる。
    参考: https://stackoverflow.com/questions/8618068/django-filter-queryset-in-for-every-item-in-list/8637972#8637972
    """
    tag_queries = []
    for f_tag_id in filters.tags:
        tag = get_object_or_404(Tag, id=f_tag_id)
        if tag.user != request.user and tag.publicity!=1:
            raise ValidationError([{"message":"Wrong tag id"}])
        tag_ids = [tag.id]
        if filters.with_tag_descendants:
            tag_ids += [descendant.id for descendant in tag.get_all_descendants()]
        tag_queries.append(Q(qa__card__tags__in=tag_ids))

    """ 重要度で絞り込み """
    if filters.importance_gte > 0:
        q &= Q(importance__gte=filters.importance_gte)

    """ 活動状態（アクティブ・凍結中）で絞り込み """
    if filters.activeness == 1:
        q &= Q(is_active=True) & (Q(qa__card__project__isnull=True) | Q(project_is_active=True))
    elif filters.activeness == 2:
        q &= Q(is_active=False)

    """ 依存復習管理が一定レベルに達していないものを除去 """
    if filters.deprms_al_gte:
        q &= (
                  Q(dependency_rm_set__isnull=True)
                | Q(dependency_rm_set__absorption_level__gte=filters.deprms_al_gte)
            )
    
    """ 延期先日時に未到達の復習管理を除外 """
    if filters.skip_rm_set_before_postpone_to:
        q &= Q(postpone_to__lte=timezone.now())

    """ 新規・Hot・Warmで絞り込み """
    if filters.new_hot_warm:
        nhw = filters.new_hot_warm.split('-')
        q_nhw = Q()
        if 'n' in nhw:
            q_nhw |= Q(absorption_level=0, ingestion_level=0)
        if 'h' in nhw:
            q_nhw |= Q(absorption_level=0, ingestion_level__gte=1)
        if 'w' in nhw:
            q_nhw |= Q(absorption_level__gte=1)
        q &= q_nhw
    
    """ テンプレートカードを除外"""
    if not filters.include_template:
        q &= Q(is_pdt=False)

    """ 語句検索 """
    if filters.term:
        terms = filters.term.split()
        for term in terms:
            q &= (
                  Q(qa__card__card_fields__name__icontains=term)
                | Q(qa__card__card_fields__content__icontains=term)
                | Q(qa__card__supplement_content__icontains=term)
                | Q(id__icontains=term)
                | Q(qa__card__id__icontains=term)
                | Q(user__id__icontains=term)
                | Q(user__nickname__icontains=term)
                | Q(qa__card__user__id__icontains=term)
                | Q(qa__card__user__nickname__icontains=term)
                | Q(qa__card__project__id__icontains=term)
                | Q(qa__card__project__name__icontains=term)
                | Q(qa__card__project__parent__id__icontains=term)
                | Q(qa__card__project__parent__name__icontains=term)
                | Q(qa__card__project__parent__parent__id__icontains=term)
                | Q(qa__card__project__parent__parent__name__icontains=term)
                | Q(qa__card__project__parent__parent__parent__id__icontains=term)
                | Q(qa__card__project__parent__parent__parent__name__icontains=term)
                | Q(qa__card__tags__id__icontains=term)
                | Q(qa__card__tags__name__icontains=term)
                | Q(qa__card__tags__parent__id__icontains=term)
                | Q(qa__card__tags__parent__name__icontains=term)
                | Q(qa__card__tags__parent__parent__id__icontains=term)
                | Q(qa__card__tags__parent__parent__name__icontains=term)
                | Q(qa__card__tags__parent__parent__parent__id__icontains=term)
                | Q(qa__card__tags__parent__parent__parent__name__icontains=term)
            )
    
    plm_set_qs = ProjectLearningManagement.objects.filter(user=request.user, project=OuterRef('qa__card__project'))

    rm_set = (ReviewManagement.objects
                    .annotate(project_is_active=Subquery(plm_set_qs.values('is_active')[:1]))\
                    .select_related('user', 'qa__card', 'qa__card__project', 'qa__card__user',
                        'qa__question_field', 'qa__answer_field')
                    .annotate(
                        is_hot = Case(
                            # Hot状態
                            When(absorption_level=Value(0), ingestion_level__gte=Value(1), then=Value(1)),
                            # その他
                            default=Value(0),
                            output_field=IntegerField(max_length=1)
                        )
                    )
                    .annotate(
                        is_pdt = Case(
                            # is template
                            When(qa__card__project__isnull=False, qa__card=F('qa__card__project__default_template_card'), then=True),
                            # others
                            default=False,
                            output_field=BooleanField()
                        )
                    )
                    .annotate(
                        nrd = Cast(
                            F('last_reviewed_at') + F('actual_review_interval'),
                            output_field=DateField()
                        )
                    )
                    .filter(q)
                    .order_by(*order_by).distinct()
            )
    
    """ apply additional tag filters """
    for tag_q in tag_queries:
        rm_set = rm_set.filter(tag_q)
    
    """ 緊急度（urgency）による絞り込み """
    if filters.urgency_gte > 0:
        rm_set = rm_set.filter(nrd__lte=datetime.today())
        # rm_set = list(filter(lambda c: c.urgency >= filters.urgency_gte, rm_set))
        # rm_set = list(filter(lambda c: c.urgency >= filters.urgency_gte, rm_set))

    total_count = rm_set.count()
    all_ids = list(rm_set.values_list('id', flat=True))
    if filters.limit:
        rm_set = rm_set[filters.offset:filters.offset+filters.limit]
    
    """ safe対応 """
    new_rm_set = []
    for rm in list(rm_set):
        rm.set_safe(request.user)
        new_rm_set.append(rm)
    rm_set = new_rm_set
    
    return {"results": list(rm_set), "total_count": total_count, "all_ids": all_ids}


""" 複数復習管理の一括初期化 """
@api.patch("/patch_rm_set__initialize", response=List[UUID], auth=django_auth)
def patch_rm_set__initialize(request, rm_ids: List[UUID]):
    rm_set = ReviewManagement.objects.filter(user=request.user, id__in=rm_ids)
    rm_set.update(ingestion_level=0, absorption_level=0, highest_absorption_level=0, actual_review_interval=timedelta(days=0))
    updated_rm_ids = [rm.id for rm in rm_set]
    return updated_rm_ids


""" 複数復習管理に要セッション指定を一括して設定 """
@api.patch("/patch_rm_set__set_need_session", response=List[UUID], auth=django_auth)
def patch_rm_set__set_need_session(request, rm_ids: List[UUID], need_session: bool):
    rm_set = ReviewManagement.objects.filter(user=request.user, id__in=rm_ids)
    rm_set.update(need_session=need_session)
    updated_rm_ids = [rm.id for rm in rm_set]
    return updated_rm_ids


""" 複数復習管理に活動状態を一括して設定 """
@api.patch("/patch_rm_set__set_is_active", response=List[UUID], auth=django_auth)
def patch_rm_set__set_is_active(request, rm_ids: List[UUID], is_active: bool):
    rm_set = ReviewManagement.objects.filter(user=request.user, id__in=rm_ids)
    rm_set.update(is_active=is_active)
    updated_rm_ids = [rm.id for rm in rm_set]
    return updated_rm_ids


""" 複数復習管理に上限復習間隔を一括して設定 """
@api.patch("/patch_rm_set__set_ul_review_interval", response=List[UUID], auth=django_auth)
def patch_rm_set__set_ul_review_interval(request, rm_ids: List[UUID], ul_review_interval: timedelta):
    validator = DurationRangeValidator(min_delta=timedelta(days=0), max_delta=timedelta(days=365*100))
    validate_with_ninja([validator], ul_review_interval)
    rm_set = ReviewManagement.objects.filter(user=request.user, id__in=rm_ids)
    rm_set.update(ul_review_interval=ul_review_interval)
    updated_rm_ids = [rm.id for rm in rm_set]
    return updated_rm_ids


""" 複数復習管理に摂取レベルを一括して設定 """
@api.patch("/patch_rm_set__set_ingestion_level", response=List[UUID], auth=django_auth)
def patch_rm_set__set_ingestion_level(request, rm_ids: List[UUID], ingestion_level: int):
    if not(ingestion_level >= 0 and ingestion_level <= 7):
        raise ValidationError([{"message":"'ingestion_level' should be in the range of 0-7"}])
    rm_set = ReviewManagement.objects.filter(user=request.user, id__in=rm_ids)
    rm_set.update(ingestion_level=ingestion_level)
    updated_rm_ids = [rm.id for rm in rm_set]
    return updated_rm_ids


""" 複数復習管理に定着レベルを一括して設定 """
@api.patch("/patch_rm_set__set_absorption_level", response=List[UUID], auth=django_auth)
def patch_rm_set__set_absorption_level(request, rm_ids: List[UUID], absorption_level: int):
    if not(absorption_level >= 0 and absorption_level <= 12):
        raise ValidationError([{"message":"'absorption_level' should be in the range of 0-12"}])
    rm_set = ReviewManagement.objects.filter(user=request.user, id__in=rm_ids)
    rm_set.update(absorption_level=absorption_level)
    updated_rm_ids = [rm.id for rm in rm_set]
    return updated_rm_ids


""" 複数復習管理に間隔増加率を一括して設定 """
@api.patch("/patch_rm_set__set_interval_increase_rate", response=List[UUID], auth=django_auth)
def patch_rm_set__set_interval_increase_rate(request, rm_ids: List[UUID], interval_increase_rate: float):
    if not(interval_increase_rate >= 1.1 and interval_increase_rate <= 4.0):
        raise ValidationError([{"message":"'interval_increase_rate' should be in the range of 1.1-4.0"}])
    rm_set = ReviewManagement.objects.filter(user=request.user, id__in=rm_ids)
    rm_set.update(interval_increase_rate=interval_increase_rate)
    updated_rm_ids = [rm.id for rm in rm_set]
    return updated_rm_ids


""" 複数復習管理に実際復習間隔を一括して設定 """
@api.patch("/patch_rm_set__set_actual_review_interval", response=List[UUID], auth=django_auth)
def patch_rm_set__set_actual_review_interval(request, rm_ids: List[UUID], actual_review_interval: timedelta):
    validator = DurationRangeValidator(min_delta=timedelta(days=0), max_delta=timedelta(days=365*100))
    validate_with_ninja([validator], actual_review_interval)
    rm_set = ReviewManagement.objects.filter(user=request.user, id__in=rm_ids)
    rm_set.update(actual_review_interval=actual_review_interval)
    updated_rm_ids = [rm.id for rm in rm_set]
    return updated_rm_ids


""" # 複数復習管理に実際復習間隔を標準復習間隔から一括して自動設定 """
# @api.patch("/patch_rm_set__set_actual_review_interval_from_standard", response=List[UUID], auth=django_auth)
# def patch_rm_set__set_actual_review_interval(request, rm_ids: List[UUID], noise_ratio: int):
#     if not(noise_ratio >= 0 and noise_ratio <= 0.5):
#         raise ValidationError([{"message":"'noise_ratio' should be in the range of 0-0.5"}])
#     rm_set = qa.objects.filter(user=request.user, id__in=rm_ids)
#     rm_set.update(actual_review_interval=F('standard_review_interval'))
#     updated_rm_ids = [rm.id for rm in rm_set]
#     return updated_rm_ids


""" 複数復習管理に最終復習日時を一括して設定 """
@api.patch("/patch_rm_set__set_last_reviewed_at", response=List[UUID], auth=django_auth)
def patch_rm_set__set_last_reviewed_at(request, rm_ids: List[UUID], last_reviewed_at: datetime):
    # if not(last_reviewed_at >= 0 and last_reviewed_at <= 36500):
    #     raise ValidationError([{"message":"'last_reviewed_at' should be in the range of 0-36500"}])
    rm_set = ReviewManagement.objects.filter(user=request.user, id__in=rm_ids)
    rm_set.update(last_reviewed_at=last_reviewed_at)
    updated_rm_ids = [rm.id for rm in rm_set]
    return updated_rm_ids


""" 複数復習管理に重要度を一括して設定 """
@api.patch("/patch_rm_set__set_importance", response=List[UUID], auth=django_auth)
def patch_rm_set__set_importance(request, rm_ids: List[UUID], importance: int):
    if not(importance >= 0 and importance <= 10):
        raise ValidationError([{"message":"'importance' should be in the range of 0-10"}])
    rm_set = ReviewManagement.objects.filter(user=request.user, id__in=rm_ids)
    rm_set.update(importance=importance)
    updated_rm_ids = [rm.id for rm in rm_set]
    return updated_rm_ids


""" 複数復習管理に予想所要時間を一括して設定 """
@api.patch("/patch_rm_set__set_estimated_time", response=List[UUID], auth=django_auth)
def patch_rm_set__set_estimated_time(request, rm_ids: List[UUID], estimated_time: timedelta):
    validator = DurationRangeValidator(min_delta=timedelta(days=0), max_delta=timedelta(days=1))
    validate_with_ninja([validator], estimated_time)
    rm_set = ReviewManagement.objects.filter(user=request.user, id__in=rm_ids)
    rm_set.update(estimated_time=estimated_time)
    updated_rm_ids = [rm.id for rm in rm_set]
    return updated_rm_ids


""" 複数復習管理に最高定着レベルを一括して設定 """
@api.patch("/patch_rm_set__set_highest_absorption_level", response=List[UUID], auth=django_auth)
def patch_rm_set__set_highest_absorption_level(request, rm_ids: List[UUID], highest_absorption_level: int):
    if not(highest_absorption_level >= 0 and highest_absorption_level <= 12):
        raise ValidationError([{"message":"'highest_absorption_level' should be in the range of 0-12"}])
    rm_set = ReviewManagement.objects.filter(user=request.user, id__in=rm_ids)
    rm_set.update(highest_absorption_level=highest_absorption_level)
    updated_rm_ids = [rm.id for rm in rm_set]
    return updated_rm_ids


""" 復習管理一括削除 """
@api.delete("/delete_rm_set", response=List[UUID], auth=django_auth)
def delete_rm_set(request, rm_ids: List[UUID]):
    rm_set = ReviewManagement.objects.filter(user=request.user, id__in=rm_ids)
    deleted_rm_ids = [p.id for p in rm_set]
    rm_set.delete()
    return deleted_rm_ids


""" 判定 """
@api.post("/judge", auth=django_auth)
def judge(request, judgeRequest: JudgeRequestSchema):
    judges = judgeRequest.judges
    results = []

    """ Hot学習の待ち時間設定 """
    wds = judgeRequest.wait_durations
    for wd in wds:
        if wd <= 0:
            raise ValidationError([{"message":"wait durationsの値が不正です。",}])
    
    for judge in judges:
        rm = get_object_or_404(ReviewManagement, id=judge.rm_id, user=request.user)

        """ 日付が一致していれば更新 """
        j_plra = judge.previous_last_reviewed_at
        c_lra = rm.last_reviewed_at
        if (bool(j_plra) ^ bool(c_lra)) or (j_plra and c_lra and abs(judge.previous_last_reviewed_at - rm.last_reviewed_at).seconds > 5):
            """ どちらか一方のみがNone、または５秒以上ずれてる """
            results.append({"success": False, "msg": f"前回の復習時刻がデータベースのものと一致しません。ページを読み直してください。DB:{j_plra}, 入力:{c_lra}"})
            continue
        
        j_lra = judge.last_reviewed_at

        if judge.judge_type == 'ok':
            """alとilによって場合分け。al==0のままの場合はpostpone_toも更新"""
            if rm.absorption_level <= 0:
                rm.absorption_level = 0 # 負の場合（不正な値）まず0に直す
                """ 新規またはHotをok """
                if rm.ingestion_level <= 0:
                    """ 新規復習管理（il=0）または不正な値（負の値）をokした場合 """
                    rm.ingestion_level = 2
                else:
                    """ Hot復習管理をokした場合 """
                    rm.ingestion_level += 1
                il = rm.ingestion_level
                if il-1 < len(wds):
                    rm.postpone_to = j_lra + timedelta(seconds = wds[il-1] * 60)
                else:
                    rm.increment_absorption_level()
            else:
                """ Warmをok """
                rm.increment_absorption_level()
            
            rm.last_reviewed_at = j_lra
            rm.set_actual_review_interval_from_standard(noise_ratio=0.1)
            
        elif judge.judge_type == 'ng':
            """ wait_durations[0]分待ち（デフォルトでは1分待ち）状態に戻す """
            rm.ingestion_level = 1
            rm.absorption_level = 0
            rm.postpone_to = j_lra + timedelta(seconds = wds[0] * 60)

            rm.last_reviewed_at = j_lra
            rm.set_actual_review_interval_from_standard(noise_ratio=0.1)
        
        elif judge.judge_type[:4] == 'skip':
            """ 延期先時刻を設定。il, al, lra, ariは更新しない。"""
            if judge.judge_type == 'skip_5m':
                rm.postpone_to = j_lra + timedelta(seconds = 5 * 60)
            elif judge.judge_type == 'skip_1h':
                rm.postpone_to = j_lra + timedelta(seconds = 1 * 60 * 60)
            elif judge.judge_type == 'skip_1w':
                rm.postpone_to = j_lra + timedelta(days = 7)
            elif judge.judge_type == 'skip_to_tomorrow':
                """ 翌日の00:00:00までスキップ """
                rm.postpone_to = datetime(
                        year=j_lra.year,
                        month=j_lra.month,
                        day=j_lra.day,
                        tzinfo=j_lra.tzinfo
                    )  + timedelta(days=1)
        
        elif judge.judge_type == 'frozen':
            """ 復習管理凍結 """
            rm.is_active = 1
        else:
            results.append({"success": False, "msg": f"Invalid judge type: {judge.judge_type}"})
            continue

        rm.save()
        results.append({"success": True, "msg": ""})
    return results

