from enum import unique
from django.db import models
import uuid
from django.contrib.auth import get_user_model
from collections import OrderedDict
from datetime import datetime, date, timedelta

from django.utils import timezone
from mdeditor.fields import MDTextField
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator

from cms.validators import name_validators, DurationRangeValidator

import random

# Create your models here.

User = get_user_model()


class Project(models.Model):
    """プロジェクト"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField('作成日時', auto_now_add=True)
    name = models.CharField('プロジェクト名', max_length=255,
        validators=[*name_validators],)
    description = MDTextField('説明', blank=True)
    publicity = models.IntegerField('公開状態', default=0,
            validators=[MinValueValidator(0), MaxValueValidator(1)],
        ) # 0:非公開, 1:公開

    parent = models.ForeignKey(
        "self",
        verbose_name='親プロジェクト',
        related_name='child_projects',
        on_delete=models.CASCADE,
        blank=True,
        null=True,
    )
    
    user = models.ForeignKey(
        User,
        verbose_name='ユーザ',
        on_delete=models.CASCADE,
    )

    default_template_card = models.ForeignKey(
        "Card",
        verbose_name='デフォルトテンプレートカード',
        related_name='project_for_pdt',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
    )

    @property
    def shortened_id(self):
        return str(self.id)[:4]+"..."

    @property
    def path(self):
        return self.get_path()
    
    @property
    def pathlike_ids(self):
        _path = [self.id]
        if self.parent:
            try:
                _path = self.parent.pathlike_ids + _path
            except:
                self.update(parent=None)
        return _path
    

    def get_path_like_objects_safe(self, request_user):
        parent = self.parent
        if parent and (parent.user==request_user or parent.publicity==1):
            path_like_objects_safe = parent.get_path_like_objects_safe(request_user)
            path_like_objects_safe.append(self)
        else:
            path_like_objects_safe = [self]
        return path_like_objects_safe
    

    def set_safe(self, request_user):
        if request_user.is_authenticated:
            self.user_plm = ProjectLearningManagement.objects.filter(user=request_user, project=self).first()
        self.path_like_objects_safe = self.get_path_like_objects_safe(request_user)
        return
    

    def __str__(self):
        return self.name #self.get_path()


    def get_path(self):
        path = "/" + self.name
        if self.parent:
            try:
                path = self.parent.get_path() + path
            except:
                self.update(parent=None)
        return path
    

    def get_all_descendants(self):
        projects = Project.objects.filter(user=self.user)
        descendants = [project for project in projects.all() if self.id != project.id and self.id in project.pathlike_ids]
        return descendants


class ProjectLearningManagement(models.Model):
    """プロジェクト学習管理"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField('作成日時', auto_now_add=True)
    is_active = models.BooleanField('活動状態', default=True) # True: アクティブ、False: 凍結中
    star = models.IntegerField('星', default=0) # 0: 星なし（通常）、1~5: 星付き

    user = models.ForeignKey(
        User,
        verbose_name='ユーザ',
        on_delete=models.CASCADE,
        related_name='plm_set',
    )

    project = models.ForeignKey(
        Project,
        verbose_name='プロジェクト',
        on_delete=models.CASCADE,
        related_name='plm_set',
    )

    def __str__(self):
        return self.project.name + " / " + self.user.nickname


class Tag(models.Model):
    """タグ"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField('作成日時', auto_now_add=True)
    name = models.CharField('タグ名', max_length=255, validators=[*name_validators],)
    star = models.IntegerField('星', default=0) # 0: 星なし（通常）、1~5: 星付き
    publicity = models.IntegerField('公開状態', default=0,
            validators=[MinValueValidator(0), MaxValueValidator(1)],
        ) # 0:非公開, 1:公開

    parent = models.ForeignKey(
        "self",
        verbose_name='親タグ',
        related_name='child_tags',
        on_delete=models.CASCADE,
        blank=True,
        null=True,
    )
    user = models.ForeignKey(
        User,
        verbose_name='ユーザ',
        on_delete=models.CASCADE,
    )

    @property
    def shortened_id(self):
        return str(self.id)[:4]+"..."

    @property
    def path(self):
        return self.get_path()
    
    @property
    def pathlike_ids(self):
        _path = [self.id]
        if self.parent:
            try:
                _path = self.parent.pathlike_ids + _path
            except:
                self.update(parent=None)
        return _path
    

    def get_path_like_objects_safe(self, request_user):
        parent = self.parent
        if parent and (parent.user==request_user or parent.publicity==1):
            path_like_objects_safe = parent.get_path_like_objects_safe(request_user)
            path_like_objects_safe.append(self)
        else:
            path_like_objects_safe = [self]
        return path_like_objects_safe
    

    def set_safe(self, request_user):
        # safeな情報を付加
        if request_user.is_authenticated:
            self.star_safe = self.star
        else:
            self.star_safe = 0
        self.path_like_objects_safe = self.get_path_like_objects_safe(request_user)
        return
    

    def __str__(self):
        return self.get_path()


    def get_path(self):
        path = "/" + self.name
        if self.parent:
            try:
                path = self.parent.get_path() + path
            except:
                self.update(parent=None)
        return path
    
    def get_all_descendants(self):
        tags = Tag.objects.filter(user=self.user)
        descendants = [tag for tag in tags.all() if self.id != tag.id and self.id in tag.pathlike_ids]
        return descendants

class Card(models.Model):
    """
    カード

    PUBLICITY_CHOICES = (
        (0, '非公開'),
        (1, '公開'),
    )
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField('作成日時', auto_now_add=True)
    supplement_content = MDTextField('補足コンテンツ', blank=True)
    publicity = models.IntegerField('公開状態', default=0) # 0:非公開, 1:公開
    
    user = models.ForeignKey(
        User,
        verbose_name='作成者',
        related_name='created_cards',
        on_delete=models.CASCADE,
    )
    copied_from = models.ForeignKey(
        "self",
        verbose_name='コピー元カード',
        related_name='copy_cards',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        editable=False
    )
    project = models.ForeignKey(
        Project,
        verbose_name='プロジェクト',
        on_delete=models.CASCADE,
        blank=True,
        null=True,
    )
    tags  = models.ManyToManyField(
        Tag, 
        verbose_name='タグ',
        related_name="cards"
    )

    @property
    def shortened_id(self):
        return str(self.id)[:4]+"..."

    def set_is_pdt(self):
        self.is_pdt = bool(
                self.project 
                and self.project.default_template_card 
                and self.project.default_template_card.id == self.id
            )
    
    def set_rm_users_count(self):
        self.rm_users_count = Card.objects.filter(id=self.id).aggregate(
                rm_users_count = models.Count('qa_set__rm_set__user', distinct=True)
            )['rm_users_count']
    

    def __str__(self):
        return str(self.card_fields.all())

    
    def set_safe(self, request_user):
        """ safe対応 ( user_rm, project_safe, tags_safe, copied_from_safe ) """
        qa_set = []
        for qa in self.qa_set.all():
            qa.rm_set_count = qa.rm_set.count()
            if request_user.is_authenticated:
                qa.user_rm = qa.rm_set.filter(user=request_user).first()
            qa_set.append(qa)
        self.qa_set_with_user_rm = qa_set

        # project_safe
        project = self.project
        if  project and (project.user == request_user or project.publicity == 1):
            project.set_safe(request_user)
            self.project_safe = project
        
        # tag_safe
        tags = self.tags.all()
        self.tags_safe = []
        for tag in tags:
            if tag.user == request_user or (self.user==tag.user and tag.publicity == 1):
                tag.set_safe(request_user)
                self.tags_safe.append(tag)
        
        # copied_from_safe
        copied_from = self.copied_from
        if  copied_from and (copied_from.user == request_user or copied_from.publicity == 1):
            self.copied_from_safe = copied_from
        return


class CardField(models.Model):
    """カードフィールド"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_in_card = models.IntegerField('カード内順序', default=0)
    card = models.ForeignKey(
        Card,
        verbose_name='カード',
        related_name='card_fields',
        on_delete=models.CASCADE,
    )
    name = models.CharField('フィールド名', max_length=255, validators=[*name_validators],)
    read_aloud_lang = models.CharField('読み上げ言語',
        max_length=31, validators=[], default='',blank=True,null=True 
    )
    content = MDTextField('フィールドコンテンツ')
    

    @property
    def oic_color(self):
        oic = self.order_in_card
        colors = ["dodgerblue", "green", "yellow", "purple", "orange"]
        return colors[oic] if oic < len(colors) else "white"

    def __str__(self):
        return f"({self.name}) {self.content}"

def get_qiai_to_oic(ncf):
    """
    Args:
        ncf: num of card fields
    Return:
        qiai_to_oic: like {"0-1": 0, "1-0": 1, "0-2": 2, ...}
    """
    qiai_to_oic = {}
    oic_to_qiai = {}
    k=0
    for i in range(ncf-1):
        for j in range(i+1, ncf):
            qiai_to_oic[f"{i}-{j}"] = k
            oic_to_qiai[k] = (i, j)
            k += 1
            qiai_to_oic[f"{j}-{i}"] = k
            oic_to_qiai[k] = (j, i)
            k += 1
    return qiai_to_oic, oic_to_qiai


class QA(models.Model):
    """復習管理"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_in_card = models.IntegerField('カード内順序', default=0)
    card = models.ForeignKey(
        Card,
        verbose_name='カード',
        related_name='qa_set',
        on_delete=models.CASCADE,
    )
    question_field = models.ForeignKey(
        CardField,
        verbose_name='問題フィールド',
        related_name='qa_for_q',
        on_delete=models.CASCADE,
    )
    answer_field = models.ForeignKey(
        CardField,
        verbose_name='解答フィールド',
        related_name='qa_for_a',
        on_delete=models.CASCADE,
    )


    @property
    def qiai(self):
        return f"{self.question_field.order_in_card}-{self.answer_field.order_in_card}"
    

    def set_rm_users_count(self):
        self.rm_users_count = QA.objects.filter(id=self.id).aggregate(
                rm_users_count = models.Count('rm_set__user', distinct=True)
            )['rm_users_count']


class ReviewManagement(models.Model):
    """ReviewManagement"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        verbose_name='ユーザ',
        on_delete=models.CASCADE,
    )
    qa = models.ForeignKey(
        QA,
        verbose_name='復習管理',
        related_name='rm_set',
        on_delete=models.CASCADE,
    )
    dependency_rm_set  = models.ManyToManyField(
        'self',
        symmetrical=False,
        verbose_name='依存先復習管理',
        related_name="dependent_rm_set",
        blank=True,
    )

    need_session = models.BooleanField('復習管理種別', default=False) # True: 要セッション、False: 隙間時間
    is_active = models.BooleanField('活動状態', default=True) # True: アクティブ、False: 凍結中
    ul_review_interval = models.DurationField('上限復習間隔', default=timedelta(seconds=60*60*24*365*100), 
            validators=[DurationRangeValidator(min_delta=timedelta(days=0), max_delta=timedelta(days=365*100))],)
    ingestion_level = models.PositiveSmallIntegerField('摂取レベル', default=0,
            validators=[MinValueValidator(0), MaxValueValidator(7)],)
    absorption_level = models.PositiveSmallIntegerField('定着レベル', default=0,
            validators=[MinValueValidator(0), MaxValueValidator(12)],)
    interval_increase_rate = models.FloatField('間隔増加率', default=2.5,
            validators=[MinValueValidator(1.1), MaxValueValidator(4.0)],)
    actual_review_interval = models.DurationField('実際復習間隔', default=timedelta(days=0),
            validators=[DurationRangeValidator(min_delta=timedelta(days=0), max_delta=timedelta(days=365*100))],)
    last_reviewed_at = models.DateTimeField('最終復習日時', blank=True, null=True)
    importance = models.PositiveSmallIntegerField('重要度', default=3,
            validators=[MinValueValidator(0), MaxValueValidator(10)],)
    estimated_time = models.DurationField('予想所要時間', default=timedelta(seconds=60),
            validators=[DurationRangeValidator(min_delta=timedelta(days=0), max_delta=timedelta(days=1))],)
    highest_absorption_level = models.PositiveSmallIntegerField('最高定着レベル', default=0,
            validators=[MinValueValidator(0), MaxValueValidator(12)],)
    postpone_to = models.DateTimeField('延期先日時', default=timezone.make_aware(datetime(2022, 11, 19, 16, 0, 38, 477302)))
    
    last_updated_at = models.DateTimeField('最終更新日時', auto_now=True)
    created_at = models.DateTimeField('復習管理作成日時', auto_now_add=True)


    @property
    def shortened_id(self):
        return str(self.id)[:4]+"..."
    
    
    @property
    def standard_review_interval(self):
        # 標準復習間隔
        al = self.absorption_level
        base = self.interval_increase_rate
        if al <= 0:
            return timedelta(days=0)
        else:
            _std_f = float(base)**(al-1)
            return timedelta(days=int(_std_f)) if _std_f < self.ul_review_interval.days else self.ul_review_interval
    

    @property
    def next_review_date(self):
        # 次回復習日
        if self.last_reviewed_at:
            return (self.last_reviewed_at + self.actual_review_interval).date()
        else:
            return None
    
    
    @property
    def urgency(self):
        # 緊急度 (0~100)

        lra = self.last_reviewed_at
        if lra is None:
            # 新規復習管理は緊急度100
                return 100

        ari_int = self.actual_review_interval.days

        if ari_int <= 0:
             # 新規、HOT学習（短時間に繰り返す）
            # 時間経過の判定はpostpone_toを用いて行う
            return 100
        else:
            # WARM学習（復習予定日の付近で緊急度を線形に増加させる）
            # lraがNoneでないならばnext_review_dateもNoneにならない
            trans_half = int(ari_int * 0.2)
            late = (date.today() - self.next_review_date).days
            if late <= -trans_half:
                return 0
            elif late >= +trans_half:
                return 100
            else:
                return int(50 * (1 + late / trans_half))
    
    def set_is_pdt(self):
        self.is_pdt = bool( 
                self.qa.card.project 
                and self.qa.card.project.default_template_card 
                and self.qa.card.project.default_template_card.id == self.qa.card.id
            )

    
    def increment_absorption_level(self):
        self.absorption_level += 1
        if self.highest_absorption_level < self.absorption_level:
            self.highest_absorption_level = self.absorption_level


    def set_actual_review_interval_from_standard(self, noise_ratio=0.1):
        if self.absorption_level >= 2:
            noise = noise_ratio * (2 * random.random() - 1)
        else:
            noise = 0
        ari = self.standard_review_interval * ( 1 + noise)
        self.actual_review_interval = timedelta(days=ari.days)
        if self.actual_review_interval > self.ul_review_interval:
            self.actual_review_interval = timedelta(days=self.ul_review_interval.days)


    def __str__(self):
        return f"【問題】{self.qa.question_field} 【解答】{self.qa.answer_field}"
    
    def set_safe(self, request_user):
        # project_safe
        project = self.qa.card.project
        if  project and (project.user == request_user or project.publicity == 1):
            project.set_safe(request_user)
            self.qa.card.project_safe = project
        
        # tag_safe
        tags = self.qa.card.tags.all()
        self.qa.card.tags_safe = []
        for tag in tags:
            if tag.user == request_user or (tag.user == self.qa.card.user and tag.publicity == 1):
                tag.set_safe(request_user)
                self.qa.card.tags_safe.append(tag)



