from django import forms
from django.contrib.auth import get_user_model
from django.core.validators import RegexValidator
from cms.validators import name_validators

User = get_user_model()

class UserConfForm(forms.Form):
    """ユーザ設定の入力フォーム"""
    
    def __init__(self, *args, **kwargs):
        user = kwargs.pop("user")
        super(UserConfForm, self).__init__(*args, **kwargs)

        self.fields["nickname"] = forms.CharField(
            label='ニックネーム',
            widget=forms.TextInput(attrs={
                    "class":"project_select",
                    "id":"lc_project",
                }),
            required=True,
            initial=user.nickname,
            validators=[
                *name_validators
            ],
        )

