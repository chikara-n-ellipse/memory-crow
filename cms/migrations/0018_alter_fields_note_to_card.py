# Generated by Django 4.1.2 on 2022-11-18 12:18

import datetime
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('cms', '0017_rename_fields_note_to_card'),
    ]

    operations = [
        migrations.AlterField(
            model_name='test',
            name='card',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='tests', to='cms.card', verbose_name='カード'),
        ),
        migrations.AlterField(
            model_name='card',
            name='copied_from',
            field=models.ForeignKey(blank=True, editable=False, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='copy_cards', to='cms.card', verbose_name='コピー元カード'),
        ),
        migrations.AlterField(
            model_name='card',
            name='tags',
            field=models.ManyToManyField(related_name='cards', to='cms.tag', verbose_name='タグ'),
        ),
        migrations.AlterField(
            model_name='card',
            name='user',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='created_cards', to=settings.AUTH_USER_MODEL, verbose_name='作成者'),
        ),
        migrations.AlterField(
            model_name='cardfield',
            name='card',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='card_fields', to='cms.card', verbose_name='カード'),
        ),
        migrations.AlterField(
            model_name='cardfield',
            name='order_in_card',
            field=models.IntegerField(default=0, verbose_name='カード内順序'),
        ),
        migrations.AlterField(
            model_name='testregistry',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, verbose_name='テスト作成日時'),
        ),
        migrations.AlterField(
            model_name='testregistry',
            name='dependency_testregistry_set',
            field=models.ManyToManyField(blank=True, related_name='dependent_testregistry_set', to='cms.testregistry', verbose_name='依存先テスト'),
        ),
        migrations.AlterField(
            model_name='testregistry',
            name='is_work',
            field=models.BooleanField(default=False, verbose_name='テスト種別'),
        ),
        migrations.AlterField(
            model_name='testregistry',
            name='test',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='trs', to='cms.test', verbose_name='テスト'),
        ),
    ]
