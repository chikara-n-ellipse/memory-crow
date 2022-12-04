from django.http import HttpRequest, HttpResponse
from ninja import NinjaAPI, Schema, Field
from datetime import datetime, date, timedelta
from cms.models import Project, Tag, Card, CardField, ReviewManagement
from django.contrib.auth import get_user_model
from django.shortcuts import render, get_object_or_404, redirect
from typing import List, Dict, Any, Union, Tuple
from ninja.security import HttpBearer
from ninja.errors import ValidationError
from uuid import UUID
from django.db.models import Q
import random
from django.utils import timezone


class Error(Schema):
    message: str


class RequestUserOutSchema(Schema):
    id: UUID = None
    nickname: str = None
    is_authenticated: bool


class PublicUserOutSchema(Schema):
    id: UUID
    nickname: str


# プロジェクト


class ProjectUpdateSchema(Schema):
    id: UUID = None
    parent_id: UUID = None
    name: str
    description: str
    publicity: int
    default_template_card_id: UUID = None


class PlmUpdateSchema(Schema):
    is_active: bool
    star: int


class ProjectUpdateRequestSchema(Schema):
    project: ProjectUpdateSchema
    plm: PlmUpdateSchema


class FiltersForGetProjectsSchema(Schema):
    limit: int = None
    offset: int = 0
    order_by: List[str] = []
    order_dir: List[str] = []
    term: str = None
    includes: List[UUID] = None
    excludes: List[UUID] = None
    
    public_only: bool = False
    tuser_id: UUID = None
    request_user_related_only: bool = True

    include_descendant_of: UUID = None
    exclude_descendant_of: UUID = None
    exclude_max_path: bool = False


class ProjectOutSchema(Schema):
    id: UUID
    created_at: datetime
    name: str
    description: str
    publicity: int

    parent_id: UUID = Field(None, alias="parent.id")
    user_id: int = Field(None, alias="user.id")

    shortened_id: str


class PlmOutSchema(Schema):
    is_active: bool
    star: int


class ProjectRichOutSchema(ProjectOutSchema):
    user: PublicUserOutSchema
    path_like_objects_safe: List[ProjectOutSchema]
    user_plm: PlmOutSchema = None


class GetProjectsResponseSchema(Schema):
    results: List[ProjectRichOutSchema]
    total_count: int
    all_ids: List[UUID]


# タグ


class TagUpdateSchema(Schema):
    id: UUID = None
    parent_id: UUID = None
    name: str
    star: int
    publicity: int

class TagUpdateRequestSchema(Schema):
    tag: TagUpdateSchema


class FiltersForGetTagsSchema(Schema):
    limit: int = None
    offset: int = 0
    order_by: List[str] = []
    order_dir: List[str] = []
    term: str = None
    includes: List[UUID] = None
    excludes: List[UUID] = None

    public_only: bool = False
    tuser_id: UUID = None
    request_user_related_only: bool = True

    include_descendant_of: UUID = None
    exclude_descendant_of: UUID = None
    exclude_max_path: bool = False


class TagOutSchema(Schema):
    id: UUID
    created_at: datetime
    name: str
    publicity: int

    user_id: int = Field(None, alias="user.id")
    parent_id: UUID = Field(None, alias="parent.id")

    shortened_id: str


class TagRichOutSchema(TagOutSchema):
    user: PublicUserOutSchema
    path_like_objects_safe: List[TagOutSchema]
    star_safe: int


class GetTagsResponseSchema(Schema):
    results: List[TagRichOutSchema]
    total_count: int
    all_ids: List[UUID]


# カードフィールドスキーマ


class CardFieldUpdateSchema(Schema):
    name: str
    read_aloud_lang: str
    content: str


# QAスキーマ


class QAUpdateSchema(Schema):
    qiai: str


# カードスキーマ


class CardUpdateSchema(Schema):
    id: UUID = None
    copied_from_id: UUID = None
    project_id: UUID = None
    tag_ids: List[UUID]
    supplement_content: str
    card_fields: List[CardFieldUpdateSchema]
    qa_set: List[QAUpdateSchema]
    publicity: int


class CardUpdateRequestSchema(Schema):
    card: CardUpdateSchema
    use_auto_set_dependency: bool


class FiltersForGetCardsSchema(Schema):
    limit: int = None
    offset: int = 0
    order_by: List[str] = []
    order_dir: List[str] = []
    term: str = None
    includes: List[UUID] = None
    excludes: List[UUID] = None

    public_only: bool = False
    tuser_id: UUID = None
    request_user_related_only: bool = True

    project: UUID = None
    with_project_descendants: bool = True
    tags: List[UUID] = []
    with_tag_descendants: bool = True


# TSV


class AddCardFieldFromTsvSchema(Schema):
    name: str
    read_aloud_lang: str = None
    content: str


class AddTmFromTsvSchema(Schema):
    last_reviewed_at: datetime = None
    absorption_level: int = 0


class AddQaFromTsvSchema(Schema):
    qi: int
    ai: int
    user_rm: AddTmFromTsvSchema


class AddCardFromTsvSchema(Schema):
    card_fields: List[AddCardFieldFromTsvSchema]
    qa_set: List[AddQaFromTsvSchema]
    supplement_content: str = ""
    project_name: str = None
    tag_names: List[str] = None
    publicity: int = 0


class CardOutSchema(Schema):
    id: UUID
    created_at: datetime
    supplement_content: str
    publicity: int
    
    user_id: int = Field(None, alias="user.id")

    shortened_id: str


# カードフィールドスキーマ


class CardFieldOutSchema(Schema):
    id: UUID
    order_in_card: int
    oic_color: str
    name: str
    read_aloud_lang: str = None
    content: str
    
    card_id: UUID = Field(None, alias="card.id")


# 復習管理スキーマ


class FiltersForGetRmSetSchema(Schema):
    limit: int = None
    offset: int = 0
    order_by: List[str] = []
    order_dir: List[str] = []
    term: str = None
    includes: List[UUID] = None
    excludes: List[UUID] = None

    # プロジェクト、タグ指定
    project: UUID = None
    with_project_descendants: bool = True
    tags: List[UUID] = []
    with_tag_descendants: bool = True

    """
    学習時特有の設定項目。
    デフォルトはあくまで一覧表示用であるので注意。
    """
    importance_gte: int = 0
    activeness: int = 0 # 0:指定なし、1:アクティブのみ、2:凍結中のみ。 学習時のデフォルトは1
    random: bool = False
    urgency_gte: int = 0 #学習時のデフォルトは50
    deprms_al_gte: int = 0  #学習時のデフォルトは4
    include_template: bool = True  #学習時はFalse
    skip_rm_set_before_postpone_to: bool = False  #学習時はFalse
    new_hot_warm: str = None


class QaOutSchema(Schema):
    id: UUID
    order_in_card: int
    card_id: UUID = Field(None, alias="card.id")


class CardWithoutUserRmOutSchema(CardOutSchema):
    user: PublicUserOutSchema
    project_safe: ProjectRichOutSchema = None
    tags_safe: List[TagRichOutSchema]
    copied_from_safe: CardOutSchema = None
    card_fields: List[CardFieldOutSchema]
    qa_set: List[QaOutSchema]


class QaRichOutSchema(QaOutSchema):
    card: CardWithoutUserRmOutSchema
    question_field: CardFieldOutSchema
    answer_field: CardFieldOutSchema


class RmUpdateSchema(Schema):
    id: UUID = None
    need_session: bool
    is_active: bool
    ul_review_interval: int
    ingestion_level: int
    absorption_level: int
    interval_increase_rate: float
    actual_review_interval: int
    last_reviewed_at: datetime = None
    postpone_to: datetime
    importance: int
    estimated_time: int
    highest_absorption_level: int
    dependency_rm_id_set: List[UUID]


class RmUpdateRequestSchema(Schema):
    rm: RmUpdateSchema


class RmOutSchema(Schema):
    id: UUID
    need_session: bool
    is_active: bool
    ul_review_interval: timedelta
    ingestion_level: int
    absorption_level: int
    interval_increase_rate: float
    actual_review_interval: timedelta
    last_reviewed_at: datetime = None
    importance: int
    estimated_time: timedelta
    highest_absorption_level: int
    last_updated_at: datetime
    created_at: datetime
    postpone_to: datetime

    user_id: int = Field(None, alias="user.id")
    qa_id: int = Field(None, alias="qa.id")

    shortened_id: str


class RmWithPropertyOutSchema(RmOutSchema):
    standard_review_interval: timedelta
    next_review_date: date = None
    urgency: int


class RmRichOutSchema(RmWithPropertyOutSchema):
    user: PublicUserOutSchema
    qa: QaRichOutSchema
    dependency_rm_set: List[RmOutSchema]
    is_pdt: bool


class GetqasResponseSchema(Schema):
    results: List[RmRichOutSchema]
    total_count: int
    all_ids: List[UUID]


class QaWithRmOutSchema(QaRichOutSchema):
    user_rm: RmOutSchema = None
    rm_set_count: int


# カードスキーマ（リッチ）


class CardRichOutSchema(CardWithoutUserRmOutSchema):
    qa_set_with_user_rm: List[QaWithRmOutSchema]
    is_pdt: bool
    rm_users_count: int


class GetCardsResponseSchema(Schema):
    results: List[CardRichOutSchema]
    total_count: int
    all_ids: List[UUID]

    total_qa_set_count: int


class LearnConfSchema(Schema):
    project_id: Union[UUID, None]
    tag_ids: List[UUID] = []
    urgency_gte: int = 0
    importance_gte: int = 0
    activeness: int = 1
    limit: int = 10


class JudgeSchema(Schema):
    rm_id: UUID
    judge_type: str
    last_reviewed_at: datetime
    previous_last_reviewed_at: datetime = None

class JudgeRequestSchema(Schema):
    judges: List[JudgeSchema]
    wait_durations: List[int] = [1, 10]