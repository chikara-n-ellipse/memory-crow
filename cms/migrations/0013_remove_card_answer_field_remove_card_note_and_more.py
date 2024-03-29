# Generated by Django 4.1.2 on 2022-11-18 09:04

import datetime
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('cms', '0012_card_test_alter_card_postpone_to'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='card',
            name='answer_field',
        ),
        migrations.RemoveField(
            model_name='card',
            name='note',
        ),
        migrations.RemoveField(
            model_name='card',
            name='problem_field',
        ),
        migrations.AlterField(
            model_name='card',
            name='postpone_to',
            field=models.DateTimeField(default=datetime.datetime(2022, 11, 18, 18, 4, 2, 884459), verbose_name='延期先日時'),
        ),
        migrations.AlterField(
            model_name='test',
            name='answer_field',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='answer_cards', to='cms.notefield', verbose_name='解答フィールド'),
        ),
    ]
