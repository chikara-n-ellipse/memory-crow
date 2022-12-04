# Generated by Django 4.1.2 on 2022-11-19 07:02

import datetime
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cms', '0023_alter_qa_answer_field_alter_qa_card_and_more'),
    ]

    operations = [
        migrations.RenameField(
            model_name='reviewmanagement',
            old_name='test',
            new_name='qa',
        ),
        migrations.AlterField(
            model_name='reviewmanagement',
            name='postpone_to',
            field=models.DateTimeField(default=datetime.datetime(2022, 11, 19, 16, 0, 38, 477302), verbose_name='延期先日時'),
        ),
    ]
