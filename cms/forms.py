from email.policy import default
from django import forms
from cms.models import Project, Tag, Card, ReviewManagement
from django.db.models import Q
from django.utils.safestring import mark_safe
from mdeditor.fields import MDTextFormField
from mdeditor.widgets import MDEditorWidget
from django.contrib.auth import get_user_model
from django_select2 import forms as s2forms

from cms.validators import name_validators

User = get_user_model()

PUBLICITY_CHOICES = (
    (0, '非公開'),
    (1, '公開'),
)



# # フォームクラス作成
# class AccountForm(forms.ModelForm):
#     # パスワード入力：非表示対応
#     password = forms.CharField(widget=forms.PasswordInput(),label="パスワード")

#     class Meta():
#         # ユーザー認証
#         model = User
#         # フィールド指定
#         fields = ('username','email','password')
#         # フィールド名指定
#         labels = {'username':"ユーザーネーム",'email':"メールアドレス"}
    
#     def __init__(self, *args, **kwargs): # emailの登録を必須に変更
#       super().__init__(*args, **kwargs)
#       self.fields["email"].required = True



# class ProjectForm(forms.ModelForm):
#     """プロジェクトの入力フォーム"""
    
#     class Meta:
#         model = Project
#         fields = ('name', 'parent', 'description', 'is_active', 'star', 'publicity')
    

#     def __init__( self, *args, **kwargs):
#         super(ProjectForm,self).__init__(*args, **kwargs)
#         project = kwargs.get("instance")
#         self.prev_instance = project
#         id = project.id
#         user = project.user
#         is_active = project.is_active
#         star = project.star
#         publicity = project.publicity

#         # name
#         self.fields["name"].widget.attrs['class'] = 'w-100'

#         # 自身および自身の子孫を親に指定しないための選択肢フィルター
#         descendants = project.get_all_descendants()
#         q = Q()
#         q.add(Q(user=user), Q.AND)
#         q.add(~Q(id=id), Q.AND)
#         for descendant in descendants:
#             q.add(~Q(id=descendant.id), Q.AND)
#         self.fields['parent'].queryset = Project.objects.filter(q)
#         self.fields['parent'].widget.attrs['class'] = 'project_select'
        
#         self.fields["is_active"] = forms.ChoiceField(
#             label="状態",
#             initial=is_active,
#             choices=((0, "アクティブ"), (1, '凍結中')),
#             widget=forms.Select(attrs={
#                 'class': 'my-2',
#             }),
#         )
#         self.fields["star"] = forms.ChoiceField(
#             label="星",
#             initial=star,
#             choices=(
#                 (0, '-'), 
#                 (1, '☆'),
#                 (2, '☆☆'),
#                 (3, '☆☆☆'),
#                 (4, '☆☆☆☆'),
#                 (5, '☆☆☆☆☆'),
#             ),
#             widget=forms.Select(attrs={
#                 'class': 'my-2',
#             }),
#         )
#         self.fields["publicity"] = forms.ChoiceField(
#             label="公開状態",
#             initial=publicity,
#             choices=((0, "非公開"), (1, '公開')),
#             widget=forms.Select(attrs={
#                 'class': 'my-2',
#             }),
#         )


class TagForm(forms.ModelForm):
    """タグの入力フォーム"""
    
    class Meta:
        model = Tag
        fields = ('name', 'parent', 'star', 'publicity')


    def __init__( self, *args, **kwargs):
        super(TagForm,self).__init__(*args, **kwargs)
        self.prev_instance = kwargs.get("instance")
        id = kwargs.get("instance").id
        user = kwargs.get("instance").user
        star = kwargs.get("instance").star
        publicity = kwargs.get("instance").publicity

        # name
        self.fields["name"].widget.attrs['class'] = 'w-100'
        
        # 自身および自身の子孫を親に指定しないための選択肢フィルター
        descendants = kwargs.get("instance").get_all_descendants()
        q = Q()
        q.add(Q(user=user), Q.AND)
        q.add(~Q(id=id), Q.AND)
        for descendant in descendants:
            q.add(~Q(id=descendant.id), Q.AND)
        
        # 親タグの設定
        self.fields['parent'].queryset = Tag.objects.filter(q)
        self.fields['parent'].widget.attrs['class'] = 'tag_select'

        # 星の設定
        self.fields["star"] = forms.ChoiceField(
            label="星",
            initial=star,
            choices=(
                (0, '-'), 
                (1, '☆'),
                (2, '☆☆'),
                (3, '☆☆☆'),
                (4, '☆☆☆☆'),
                (5, '☆☆☆☆☆'),
            ),
            widget=forms.Select(attrs={
                'class': 'my-2',
            }),
        )

        self.fields["publicity"] = forms.ChoiceField(
            label="公開状態",
            initial=publicity,
            choices=((0, "非公開"), (1, '公開')),
            widget=forms.Select(attrs={
                'class': 'my-2',
            }),
        )


class CardForm(forms.Form):
    """カードの入力フォーム"""

    def __init__(self, *args, **kwargs):
        card = kwargs.pop("card")
        card_fields = kwargs.pop("card_fields")
        initial_qa_choices = kwargs.pop("initial_qa_choices")
        initial_project = kwargs.pop("initial_project")
        initial_tags = kwargs.pop("initial_tags")
        initial_tags = initial_tags.all() if initial_tags else []
        super(CardForm, self).__init__(*args, **kwargs)

        self.fields["project"] = forms.ChoiceField(
            choices=[("", "")]+[ (str(p.id), p.path)
                for p in Project.objects.filter(user=card.user).select_related('parent', 'parent__parent', 'parent__parent__parent')],
            label='プロジェクト',
            widget=forms.Select(attrs={
                'class':'project_select my-2'
            }),
            required=False,
            initial=str(initial_project.id) if initial_project else None,
        )

        tags = card.tags.all()

        self.fields["tags"] = forms.MultipleChoiceField(
            choices=[ (str(t.id), t.path)
                for t in Tag.objects.filter(user=card.user).select_related('parent', 'parent__parent', 'parent__parent__parent')],
            label='タグ',
            widget=forms.SelectMultiple(attrs={
                    "class":"my-2 tag_select",
                }),
            required=False,
            initial= [str(t.id) for t in initial_tags],
        )

        for i, card_field in enumerate(card_fields):
            self.fields[f"field_name_{i}"] = forms.CharField(
                label=f'フィールド {i} (Ctrl+Alt+{i})',
                max_length=200,
                required=True,
                initial=card_field.name,
                widget=forms.TextInput(attrs={
                    'class':'my-2 me-5'
                }),
                validators =[*name_validators],
            )
            self.fields[f"field_read_aloud_lang_{i}"] = forms.CharField(
                label=f'読み上げ言語 {i}',
                max_length=20,
                required=False,
                initial=card_field.read_aloud_lang,
                widget=forms.TextInput(attrs={
                    'class':'my-2'
                }),
                validators =[],
                help_text="読み上げ言語：例) ja-JP, en-US, en-GB, zh-CN, fr-FR, de-DE, etc.",
            )
            self.fields[f"field_content_{i}"] = MDTextFormField(
                label="", #f'フィールドコンテンツ_{i}',
                max_length=5000,
                required=False,
                initial=card_field.content,
                widget=forms.Textarea(attrs={
                    'cols': '80',
                    'rows': '10',
                    'placeholder': card_field.name,
                    'class': 'my-2'
                })
            )
        
        self.fields["supplement_content"] = MDTextFormField(
            label=f'補足 (Ctrl+Alt+S)',
            max_length=5000,
            required=False,
            initial=card.supplement_content,
            widget=MDEditorWidget(
                attrs={
                    'cols': '80',
                    'rows': '10',
                    'placeholder': "補足",
                    'class': 'my-2'
                })
        )
        
        # 復習管理の選択肢を作成
        # choiceは"0-1"や"2-0"など。数字はフィールド番号（order_in_card）を表す。"0-1"は問題が0で解答が1の復習管理を表す。
        qa_set_to_exist_choices = []
        for i in range(len(card_fields)-1):
            for j in range(i+1, len(card_fields)):
                fname_i = card_fields[i].name
                fname_j = card_fields[j].name
                qa_set_to_exist_choices.append((f"{i}-{j}", f"{fname_i} -> {fname_j}"))
                qa_set_to_exist_choices.append((f"{j}-{i}", f"{fname_j} -> {fname_i}"))
                
        # qa properties
        self.fields["qa_set_to_exist"] = forms.MultipleChoiceField(
            label='復習管理（Ctrl+Alt+I）',
            required=False,
            widget=forms.CheckboxSelectMultiple,
            choices=qa_set_to_exist_choices, # e.g. ["0-1", "1-0"]
            initial=initial_qa_choices, # e.g. ["0-1"]
            help_text='Ctrl+Alt+I入力ごとに「全選択状態」と「初期状態」を切り替えます。',
        )

        self.fields["publicity"] = forms.ChoiceField(
            label='公開設定',
            required=True,
            choices=PUBLICITY_CHOICES,
            initial=card.publicity,
            widget=forms.Select(attrs={
                'class': 'my-2',
            }),
        )

        self.fields["use_auto_set_dependency"] = forms.BooleanField(
            label='依存先復習管理自動設定',
            required=False,
            initial=True,
            widget=forms.CheckboxInput(attrs={
                'class': 'my-2',
            }),
            help_text="逆復習管理に対して依存先復習管理を自動設定します。詳しくは「チュートリアル」をご覧ください。"
        )


class RmForm(forms.ModelForm):
    """タグの入力フォーム"""
    
    class Meta:
        model = ReviewManagement
        fields = (
            'need_session',
            'is_active',
            'ul_review_interval',
            'ingestion_level',
            'absorption_level',
            'interval_increase_rate',
            'actual_review_interval',
            'last_reviewed_at',
            'postpone_to',
            'importance',
            'estimated_time',
            'highest_absorption_level',
        )


    def __init__( self, *args, **kwargs):
        super(RmForm,self).__init__(*args, **kwargs)
        rm = kwargs.get("instance")

        self.fields["need_session"] = forms.ChoiceField(
            label="要セッション指定",
            initial=rm.need_session,
            choices=(
                (False, '隙間復習管理'),
                (True, '要セッション'),
            ),
            widget=forms.Select(attrs={
                'class': 'my-2',
            }),
        )

        self.fields["is_active"] = forms.ChoiceField(
            label="状態",
            initial=rm.need_session,
            choices=(
                (0, 'アクティブ'),
                (1, '凍結中'),
            ),
            widget=forms.Select(attrs={
                'class': 'my-2',
            }),
        )

        self.fields["dependency_rm_set"] = forms.MultipleChoiceField(
            choices=[(str(c.id), f"{str(c.id)[:4]}... : {c.question_field.content[:10]} -> {c.answer_field.content[:10]}")
                for c in ReviewManagement.objects.filter(user=rm.user).select_related('question_field', 'answer_field').all()],
            label='依存先復習管理',
            widget=forms.SelectMultiple(attrs={
                'class':'qa_select my-2'
            }),
            required=False,
            initial= [str(c.id) for c in rm.dependency_rm_set.all()],
        )

class LearnConfForm(forms.Form):
    """カードの入力フォーム"""

    def __init__(self, *args, **kwargs):
        user = kwargs.pop("user")
        lc = kwargs.pop("lc")
        super(LearnConfForm, self).__init__(*args, **kwargs)


        self.fields["project"] = forms.ModelChoiceField(
            Project.objects.filter(user=user),
            label='プロジェクト',
            widget=forms.Select(attrs={
                    "class":"lc_project project_select",
                }),
            required=False,
            initial=lc.get("project", None),
        )

        self.fields["with_project_descendants"] = forms.BooleanField(
                label="子孫プロジェクトを含める",
                initial=lc.get("with_project_descendants", True),
                widget=forms.CheckboxInput(attrs={
                        "class":"lc_with_project_descendants",
                        "style":"height: 2em;",
                    })
            )

        self.fields["tags"] = forms.ModelMultipleChoiceField(
            Tag.objects.filter(user=user),
            label='タグ',
            widget=forms.SelectMultiple(attrs={
                    "class":"lc_tags tag_select",
                }),
            required=False,
            initial=lc.get("tags", None),
        )

        self.fields["with_tag_descendants"] = forms.BooleanField(
                label="子孫タグを含める",
                initial=lc.get("with_tag_descendants", True),
                widget=forms.CheckboxInput(attrs={
                        "class":"lc_with_tag_descendants",
                        "style":"height: 2em;",
                    })
            )

        self.fields["random"] = forms.BooleanField(
                label="ランダム",
                initial=lc.get("random", False),
                widget=forms.CheckboxInput(attrs={
                        "class":"lc_random",
                        "style":"height: 2em;",
                    })
            )
        
        self.fields["urgency_gte"] = forms.ChoiceField(
                label="緊急度下限",
                choices=(
                    (0, '0 (※)'),
                    (1, '1'),
                    (50, '50'),
                    (100, '100'),
                ),
                initial=lc.get("urgency_gte", 50),
                widget=forms.Select(attrs={
                        "class":"lc_urgency_gte",
                        "style":"height: 2em;",
                    }),
                help_text="※緊急度が0の復習管理は復習をしても定着レベル（AL）が上昇しません。",
            )
        
        self.fields["deprms_al_gte"] = forms.ChoiceField(
                label="依存レベル下限",
                choices=(
                    (0, '0'),
                    (1, '1'),
                    (2, '2'),
                    (3, '3'),
                    (4, '4'),
                    (5, '5'),
                    (6, '6'),
                    (7, '7'),
                ),
                initial=lc.get("deprms_al_gte", 50),
                widget=forms.Select(attrs={
                        "class":"lc_deprms_al_gte",
                        "style":"height: 2em;",
                    }),
                help_text="全ての依存先復習管理の定着レベル（AL）がこの値以上である復習管理のみを出題します。"
            )
        
        self.fields["importance_gte"] = forms.IntegerField(
                label="重要度下限",
                max_value=10,
                min_value=0,
                initial=lc.get("importance_gte", 0),
                widget=forms.Textarea(attrs={
                        "class":"lc_importance_gte",
                        "style":"height: 2em;",
                    })
            )
        
        self.fields["limit"] = forms.ChoiceField(
                label="取得数",
                choices=(
                    (10, '10'),
                    (20, '20'),
                    (50, '50'),
                ),
                initial=lc.get("limit", 10),
                widget=forms.Select(attrs={
                    "class":"lc_limit m-2 col-md-4",
                    "style":"min-width: 5em;",
                }),
            )
        
        self.fields["activeness"] = forms.ChoiceField(
                label="活動状態",
                choices=(
                    (0, '全て'),
                    (1, 'アクティブのみ'),
                    (2, '凍結中のみ'),
                ),
                initial=lc.get("activeness", 1),
                widget=forms.Select(attrs={
                        "class":"lc_activeness",
                        "style":"height: 2em;",
                    })
            )
        
        self.fields["new_hot_warm"] = forms.ChoiceField(
                label="新規/Hot/Warm",
                choices=(
                    ('n-h-w', '全て（新規・Hot・Warm）'),
                    ('n-h', '新規・Hot'),
                    ('h-w', 'Hot・Warm'),
                    ('h', 'Hot'),
                ),
                initial=lc.get("new_hot_warm", 1),
                widget=forms.Select(attrs={
                        "class":"lc_new_hot_warm",
                        "style":"height: 2em;",
                    }),
                help_text="HotはAL=0かつIL=1のQ&Aです。WarmはALが1以上のQ&Aです。",
            )


