from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
import hashlib
import uuid

from cms.validators import name_validators

# Create your models here.

class CustomUser(AbstractUser):
    """ユーザ"""
    id = models.UUIDField(default=uuid.uuid4,primary_key=True, editable=False)
    email = models.EmailField(
        "メールアドレス",
        help_text='この項目は必須です。メールアドレスは公開されません。',
        blank=False,
        unique=True,
    )
    token = models.CharField('トークン', max_length=1024, blank=True, null=True,)
    nickname = models.CharField(
        'ニックネーム', max_length=20, default='ニックネーム未設定',
        validators=[*name_validators],
    )

    default_learning_url = models.CharField(
        'デフォルトラーニングURL', max_length=1024, default='/cms/learn',
    )

    @property
    def pathlike_ids(self):
        _path = [self.id]
        if self.parent:
            _path = self.parent.pathlike_ids + _path
        return _path

    def create_and_set_new_token(self):
        dt = timezone.now()
        self.email + self.nickname + dt.strftime('%Y%m%d%H%M%S%f')
        hash = hashlib.sha1(str.encode('utf-8')).hexdigest()    # utf-8でエンコードしないとエラーになる
        self.token = hash
        return hash