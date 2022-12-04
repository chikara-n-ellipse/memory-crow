# Generated by Django 4.1.2 on 2022-11-18 12:09

import datetime
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('cms', '0016_rename_note_to_card_and_more'),
    ]

    operations = [
        migrations.RenameField('cardfield','note', 'card'),
        migrations.RenameField('test','note', 'card'),
        migrations.RenameField('cardfield','order_in_note', 'order_in_card'),
        migrations.RenameField('testregistry','order_in_note', 'order_in_card'),
        migrations.AddField(
            model_name='test',
            name='order_in_card',
            field=models.IntegerField(default=0, verbose_name='カード内順序'),
        ),
    ]
